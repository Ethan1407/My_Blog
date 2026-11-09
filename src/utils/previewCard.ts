// 懸浮簡介卡片的定位：預設顯示在目標正下方；超出畫面時往左推、或改顯示在上方
export function positionPreviewCard(card: HTMLElement, anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  const gap = 10;
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  const left = Math.min(Math.max(16, r.left + r.width / 2 - w / 2), window.innerWidth - w - 16);
  const below = r.bottom + gap;
  const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - gap - h) : below;
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}
