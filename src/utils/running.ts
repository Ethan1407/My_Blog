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

// ---------------- 個人最佳紀錄（PB） ----------------

/** [顯示名稱, 時間字串]，時間格式 m:ss 或 h:mm:ss；非時間（例如 "training"）代表尚無紀錄 */
export type RunRecord = [string, string];

const RECORD_METERS: Record<string, number> = {
  '3K': 3000, '5K': 5000, '10K': 10000, '15K': 15000, '21K': 21097.5, '42K': 42195,
};

const toSeconds = (t: string): number | null => {
  if (!/^\d+(:\d{1,2}){1,2}$/.test(t)) return null;
  return t.split(':').map(Number).reduce((s, n) => s * 60 + n, 0);
};
const formatSeconds = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
};

interface PaceCurve { distance: number[]; values: number[] }

/**
 * 以手動填寫的紀錄為基準，檢查 `since`（含）之後的跑步是否破紀錄，有就換成新成績。
 * 成績來自 intervals.icu 的 pace curve（活動中任一段連續距離的最快時間，GPS 計算，
 * 可能和 Garmin / 晶片時間差幾秒），所以只比較基準日之後的新跑步，避免舊紀錄被改掉。
 * 手動更新紀錄時，記得把 `since` 改成更新後的隔天。
 */
export async function getRunningRecords(manual: RunRecord[], since: string): Promise<RunRecord[]> {
  const athleteId = import.meta.env.INTERVALS_ATHLETE_ID;
  const apiKey = import.meta.env.INTERVALS_API_KEY;
  if (!athleteId || !apiKey) return manual;
  try {
    const auth = Buffer.from(`API_KEY:${apiKey}`).toString('base64');
    const url = `https://intervals.icu/api/v1/athlete/${athleteId}/pace-curves.json?type=Run&curves=r.${since}`;
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error(`intervals.icu 回應 ${res.status}`);
    const curve: PaceCurve | undefined = (await res.json()).list?.[0];
    if (!curve) return manual;

    return manual.map(([name, time]) => {
      const meters = RECORD_METERS[name];
      const i = meters ? curve.distance.findIndex((d) => Math.abs(d - meters) < 1) : -1;
      const best = i >= 0 ? curve.values[i] : undefined;
      if (!best) return [name, time];
      const current = toSeconds(time);
      if (current !== null && best >= current) return [name, time];
      console.log(`[running] 新紀錄 ${name}：${time} → ${formatSeconds(best)}`);
      return [name, formatSeconds(best)];
    });
  } catch (err) {
    console.warn('[running] 取得 PB 失敗，使用手動紀錄：', err);
    return manual;
  }
}
