import { useEffect, type RefObject } from 'react';
import { reduced } from './format';

/*
 * Блик лампы на кусочке полотна (сцена «Фактура»).
 * На компьютере блик идёт за курсором, на телефоне — за наклоном (DeviceOrientation). Пока ни того ни другого нет,
 * блик сам медленно гуляет по кусочку (CSS-анимация cs-lamp-auto). Как только курсор или наклон появились,
 * на картинку ставится data-lamp: CSS-анимация выключается, и блик ведёт скрипт — пружиной, через transform.
 * На iPhone наклон доступен только с разрешения: его спрашиваем по касанию кусочка, не сами.
 */

// Где блик стоит в покое, % от лица кусочка. Совпадает с первым кадром cs-lamp-auto в CSS.
const REST = { x: -16, y: -20 };
const RANGE = 42;
// Кусочек повёрнут: rotateX(56deg) rotateZ(-36deg) — переводим движение на экране в плоскость кусочка
const COS = Math.cos((36 * Math.PI) / 180);
const SIN = Math.sin((36 * Math.PI) / 180);
const FORESHORTEN = 0.56;

const clamp = (v: number, m = 1.25) => Math.max(-m, Math.min(m, v));

let tiltAllowed = false;

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

export function useLamp(box: RefObject<HTMLElement | null>, on: boolean, swap: string) {
  useEffect(() => {
    const el = box.current;
    if (!el || !on || reduced()) return;

    const cur = { ...REST };
    const vel = { x: 0, y: 0 };
    const target = { ...REST };
    let raf = 0;
    let driven = false;
    let leaving = false;
    let rect: DOMRect | null = null;

    const lamp = () => el.querySelector<HTMLElement>('.cs-lamp');

    const loop = () => {
      let moving = false;
      for (const k of ['x', 'y'] as const) {
        vel[k] = (vel[k] + (target[k] - cur[k]) * 0.07) * 0.78;
        cur[k] += vel[k];
        if (Math.abs(vel[k]) > 0.02 || Math.abs(target[k] - cur[k]) > 0.05) moving = true;
      }
      const l = lamp();
      if (l) l.style.transform = `translate3d(${cur.x.toFixed(2)}%, ${cur.y.toFixed(2)}%, 0)`;
      if (moving) {
        raf = requestAnimationFrame(loop);
        return;
      }
      raf = 0;
      // Курсор ушёл и блик вернулся в покой — снова отдаём его CSS-анимации (она начинается с той же точки)
      if (leaving) {
        driven = false;
        leaving = false;
        el.removeAttribute('data-lamp');
        if (l) l.style.transform = '';
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    // Перехватываем блик у CSS-анимации с того места, где он сейчас, — без рывка
    const drive = () => {
      leaving = false;
      if (driven) return;
      driven = true;
      const l = lamp();
      if (l) {
        const m = new DOMMatrixReadOnly(getComputedStyle(l).transform);
        if (l.offsetWidth) {
          cur.x = (m.m41 / l.offsetWidth) * 100;
          cur.y = (m.m42 / l.offsetHeight) * 100;
        }
      }
      el.setAttribute('data-lamp', '');
    };

    const aim = (sx: number, sy: number) => {
      const y = sy / FORESHORTEN;
      target.x = clamp(sx * COS - y * SIN) * RANGE;
      target.y = clamp(sx * SIN + y * COS) * RANGE;
      kick();
    };

    // ── Курсор ──
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const float = el.querySelector('.cs-float');
      if (!rect && float) rect = float.getBoundingClientRect();
      if (!rect) return;
      drive();
      const r = rect.width * 0.9;
      aim((e.clientX - (rect.left + rect.width / 2)) / r, (e.clientY - (rect.top + rect.height / 2)) / r);
    };
    const onLeave = () => {
      rect = null;
      if (!driven) return;
      leaving = true;
      target.x = REST.x;
      target.y = REST.y;
      kick();
    };
    const resetRect = () => (rect = null);
    if (fine) {
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      window.addEventListener('scroll', resetRect, { passive: true });
    }

    // ── Наклон телефона ──
    let base: { b: number; g: number } | null = null;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      // «Ноль» медленно подтягивается к тому, как человек держит телефон, — блик не залипает у края
      base.b += (e.beta - base.b) * 0.006;
      base.g += (e.gamma - base.g) * 0.006;
      drive();
      aim(-(e.gamma - base.g) / 16, -(e.beta - base.b) / 16);
    };
    const Ctor = (window as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
    const needsPermission = !!Ctor && typeof Ctor.requestPermission === 'function';
    let listening = false;
    const listen = () => {
      if (listening) return;
      listening = true;
      window.addEventListener('deviceorientation', onTilt);
    };
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onTap = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || (e.target as Element).closest('button, a, input')) return;
      Ctor!.requestPermission!()
        .then((s) => {
          if (s === 'granted') tiltAllowed = true;
        })
        .catch(() => {});
    };
    // Слушаем сразу: Android присылает наклон без разрешения, iPhone — только после него (до того событий просто нет).
    // requestPermission теперь есть и в Chrome, поэтому по нему не отличить iPhone — спрашиваем по касанию, где он есть.
    if (!fine && Ctor) {
      listen();
      if (needsPermission && !tiltAllowed) {
        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointerup', onTap);
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onTap);
      window.removeEventListener('scroll', resetRect);
      window.removeEventListener('deviceorientation', onTilt);
      el.removeAttribute('data-lamp');
      const l = lamp();
      if (l) l.style.transform = '';
    };
  }, [box, on, swap]);
}
