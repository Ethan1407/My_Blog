// src/utils/running.ts
// 在「建置網站時」向 intervals.icu API 抓取跑步紀錄（Garmin 會自動同步到 intervals.icu）。
// 需要的環境變數（放在 .env 或 Vercel 的 Environment Variables，不會暴露到前端）：
//   INTERVALS_ATHLETE_ID（例如 i123456）/ INTERVALS_API_KEY

const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // 台灣時間 UTC+8
const MONTHS_BACK = 12; // 最多往前抓幾個月
export const DAY_MS = 86400000;

export interface RunningData {
  today: string; // YYYY-MM-DD（台灣時間，即 build 當天）
  kmByDay: Record<string, number>; // 日期 -> 當天公里數
}

interface IntervalsActivity {
  type?: string;
  start_date_local?: string; // 例如 2026-11-06T06:30:00（當地時間）
  distance?: number | null; // 公尺
  icu_distance?: number | null;
}

/** YYYY-MM-DD <-> 以 UTC 表示的「純日期」毫秒，方便做日期加減 */
export const toDateStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
/** 該日期所在週的第一天（週日） */
export const weekStartOf = (ms: number) => ms - new Date(ms).getUTCDay() * DAY_MS;

async function fetchActivities(oldest: string, newest: string): Promise<IntervalsActivity[]> {
  const athleteId = import.meta.env.INTERVALS_ATHLETE_ID;
  const auth = Buffer.from(`API_KEY:${import.meta.env.INTERVALS_API_KEY}`).toString('base64');
  const url = `https://intervals.icu/api/v1/athlete/${athleteId}/activities?oldest=${oldest}&newest=${newest}`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`intervals.icu 回應 ${res.status}：${await res.text()}`);
  return res.json();
}

let cache: Promise<RunningData | null> | undefined;

/** 取得跑步資料；沒設定金鑰或 API 失敗時回傳 null（不會讓整個 build 失敗） */
export function getRunningData(): Promise<RunningData | null> {
  cache ??= load();
  return cache;
}

async function load(): Promise<RunningData | null> {
  if (!import.meta.env.INTERVALS_API_KEY || !import.meta.env.INTERVALS_ATHLETE_ID) {
    console.warn('[running] 未設定 INTERVALS_* 環境變數，略過跑步統計');
    return null;
  }
  try {
    const today = toDateStr(Date.now() + TZ_OFFSET_MS);
    const [y, m] = today.split('-').map(Number);
    // 從 N 個月前那個月的 1 號所在週的週日開始抓，第一週的週跑量才會完整
    const oldestMs = weekStartOf(Date.UTC(y, m - 1 - (MONTHS_BACK - 1), 1));

    const activities = await fetchActivities(toDateStr(oldestMs), toDateStr(parseDate(today) + DAY_MS));

    const kmByDay: Record<string, number> = {};
    for (const a of activities) {
      if (!a.start_date_local || !RUN_TYPES.has(a.type ?? '')) continue;
      const meters = a.distance ?? a.icu_distance ?? 0;
      if (meters <= 0) continue;
      const day = a.start_date_local.slice(0, 10);
      if (day > today) continue;
      kmByDay[day] = (kmByDay[day] ?? 0) + meters / 1000;
    }

    const total = Object.values(kmByDay).reduce((s, km) => s + km, 0);
    console.log(`[running] 共 ${Object.keys(kmByDay).length} 天有跑步、${total.toFixed(1)} km`);
    return { today, kmByDay };
  } catch (err) {
    console.warn('[running] 取得資料失敗：', err);
    return null;
  }
}
