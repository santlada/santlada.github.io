/** Общие мелочи для рисунков блока «Полотна и цены» */
export const num = (n: number, digits = 2) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
export const meters = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(n);
export const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Доля в процентах — для слоёв, положенных поверх рисунка в его же координатах */
export const pct = (part: number, whole: number) => `${(part / whole) * 100}%`;
