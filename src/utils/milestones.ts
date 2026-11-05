import experienceData from '@/data/experience.json';

export interface Milestone {
  date: string;
  title: string;
  summary?: string;
}

/** experience.json 中標記 "milestone": true 的人生階段（新到舊） */
export const milestones: Milestone[] = (experienceData as any[])
  .filter((item) => item.milestone)
  .map(({ date, title, summary }) => ({ date, title, summary }))
  .sort((a, b) => b.date.localeCompare(a.date));

/**
 * 把階段分隔線穿插進已「新到舊」排序的列表：
 * 分隔線放在所有「日期 >= 該階段日期」的項目之後。
 */
export function withMilestones<T>(items: T[], getDate: (item: T) => string) {
  const result: ({ type: 'item'; item: T } | { type: 'milestone'; milestone: Milestone })[] = [];
  let m = 0;
  for (const item of items) {
    const date = getDate(item).split('-')[0];
    while (m < milestones.length && date.localeCompare(milestones[m].date) < 0) {
      result.push({ type: 'milestone', milestone: milestones[m++] });
    }
    result.push({ type: 'item', item });
  }
  return result;
}

/* ===== 時期篩選（大學 / 高中 / 更早）===== */

export interface Period {
  key: string;   // 用於 data-period
  label: string; // 顯示文字
}

/** 由 milestone 推導出時期：「進入大學」→「大學」；最舊的 milestone 之前 →「高中以前」 */
export const periods: Period[] = (() => {
  const list: Period[] = milestones.map((m) => {
    const label = m.title.replace(/^進入/, '');
    return { key: label, label };
  });
  if (list.length) {
    const label = `${list[list.length - 1].label}以前`;
    list.push({ key: label, label });
  }
  return list;
})();

/** 依日期判斷屬於哪個時期（日期 >= 該 milestone 日期即屬於該時期） */
export function getPeriod(date: string): string {
  const start = String(date || '').split('-')[0];
  const idx = milestones.findIndex((m) => start.localeCompare(m.date) >= 0);
  return idx === -1 ? periods[periods.length - 1]?.key ?? '' : periods[idx].key;
}
