// src/utils/tags.ts
// 標籤的「顯示文字」：只影響畫面，篩選仍使用原本的標籤值（data-tag-name）
const TAG_LABELS: Record<string, string> = {
  推薦: '⭐ 推薦',
};

export const tagLabel = (tag: string) => TAG_LABELS[tag] ?? tag;
