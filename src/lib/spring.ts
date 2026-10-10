/**
 * Пружина в JS — для того, что нельзя отдать CSS-переходу: цифры на табло микрометра.
 * omega — жёсткость (чем больше, тем быстрее), zeta — затухание (меньше 1 — с перелётом, 1 — без).
 * Возвращает функцию остановки.
 */
export function animateSpring(
  from: number,
  to: number,
  onUpdate: (value: number) => void,
  { omega = 7, zeta = 0.45 }: { omega?: number; zeta?: number } = {},
): () => void {
  let x = from;
  let v = 0;
  let last = 0;
  let raf = 0;
  const step = (t: number) => {
    // Кадр мог задержаться (вкладка в фоне) — не прыгаем дальше, чем на 32 мс
    const dt = Math.min(0.032, (t - last) / 1000);
    last = t;
    for (let i = 0; i < 4; i++) {
      const a = -omega * omega * (x - to) - 2 * zeta * omega * v;
      v += (a * dt) / 4;
      x += (v * dt) / 4;
    }
    if (Math.abs(x - to) < 1e-4 && Math.abs(v) < 1e-3) {
      onUpdate(to);
      return;
    }
    onUpdate(x);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame((t) => {
    last = t;
    raf = requestAnimationFrame(step);
  });
  return () => cancelAnimationFrame(raf);
}
