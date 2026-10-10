import { memo, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { animateSpring } from '../../lib/spring';
import { num, pct, reduced } from './format';

/*
 * Сцена «Толщина»: цифровой микрометр меряет срез плёнки, рядом два листа бумаги для сравнения.
 *
 * Рисунок разложен на слои в одних и тех же координатах (viewBox W×H): неподвижная скоба с пяткой и табло,
 * шпиндель, стебель со шкалой и барабан с трещоткой. Подвижные слои — отдельные блоки, которые едут через transform,
 * поэтому анимацию рисует видеокарта. Риски барабана и насечка трещотки — полоски внутри «окошек», они бегут вверх-вниз,
 * будто барабан вращается.
 *
 * Микрометр не пересоздаётся при смене полотна: шпиндель отходит, табло сбрасывается на 0,00 и замер идёт заново,
 * а прошлое значение остаётся бледной меткой.
 */

const W = 460;
const H = 246;
const XA = 132; // торец пятки — от него меряем
const K = 230; // единиц рисунка на 1 мм зазора (срез плёнки увеличен)
const OPEN = 0.32; // на сколько мм шпиндель отведён до замера
const FILM_BASE = 0.25; // ширина слоя плёнки в разметке; реальная толщина — через scaleX
const AXIS = 92;

const SEG: Record<number, string> = {
  0: 'abcdef',
  1: 'bc',
  2: 'abdeg',
  3: 'abcdg',
  4: 'bcfg',
  5: 'acdfg',
  6: 'acdefg',
  7: 'abc',
  8: 'abcdefg',
  9: 'abcdfg',
};

/** Сегменты одной цифры табло: w×h, толщина t */
function segRects(w: number, h: number, t: number) {
  const half = h / 2;
  const v = half - t * 0.9;
  return {
    a: [t * 0.55, 0, w - t * 1.1, t],
    b: [w - t, t * 0.55, t, v],
    c: [w - t, half + t * 0.35, t, v],
    d: [t * 0.55, h - t, w - t * 1.1, t],
    e: [0, half + t * 0.35, t, v],
    f: [0, t * 0.55, t, v],
    g: [t * 0.55, half - t / 2, w - t * 1.1, t],
  } as Record<string, number[]>;
}

const DIGIT = { w: 13, h: 22, t: 2.8 };
const DIGIT_X = [150, 174, 192];
const DIGIT_Y = 180;

interface Props {
  /** Толщина полотна, мм */
  value: number;
  approx?: boolean;
  /** Полотно, которое меряем: id — чтобы понять, что его сменили, name — для подписей */
  id: string;
  name: string;
  /** Цвет полотна для среза */
  tone: string;
  active: boolean;
}

export default function Micrometer({ value, approx, id, name, tone, active }: Props) {
  const [gap, setGap] = useState(value + OPEN);
  const [phase, setPhase] = useState<'open' | 'close'>('open');
  const [ghost, setGhost] = useState<{ id: string; name: string; value: number } | null>(null);
  const measured = useRef<{ id: string; name: string; value: number } | null>(null);
  const segs = useRef<SVGRectElement[][]>([[], [], []]);

  // Табло: показываем число, зажигая нужные сегменты
  const paint = (v: number) => {
    const s = Math.max(0, Math.round(v * 100));
    const digits = [Math.floor(s / 100) % 10, Math.floor(s / 10) % 10, s % 10];
    digits.forEach((d, i) =>
      segs.current[i].forEach((el) => {
        if (el) el.style.opacity = SEG[d].includes(el.dataset.seg!) ? '1' : '0';
      }),
    );
  };

  useEffect(() => {
    if (!active) {
      setPhase('open');
      setGap(value + OPEN);
      paint(0);
      return;
    }
    // Прошлый замер другого полотна остаётся бледной меткой
    const prev = measured.current;
    if (prev && prev.id !== id) setGhost(Math.abs(prev.value - value) > 0.004 ? prev : null);
    else if (ghost?.id === id) setGhost(null);

    if (reduced()) {
      setPhase('close');
      setGap(value);
      paint(value);
      measured.current = { id, name, value };
      return;
    }

    // Шпиндель отходит (если стоял закрытым), табло сбрасывается — и замер заново
    const reopen = prev !== null && phase === 'close';
    setPhase('open');
    setGap(value + OPEN);
    paint(0);
    let stop = () => {};
    const t = window.setTimeout(
      () => {
        setPhase('close');
        setGap(value);
        stop = animateSpring(0, value, paint, { omega: 6.5, zeta: 0.42 });
        measured.current = { id, name, value };
      },
      reopen ? 420 : 600,
    );
    return () => {
      window.clearTimeout(t);
      stop();
    };
  }, [active, id, value]); // eslint-disable-line react-hooks/exhaustive-deps -- phase и ghost читаем на момент смены

  const u = gap * K; // зазор в единицах рисунка
  const vars = {
    '--sw': tone,
    '--gx': pct(u, W),
    '--tx': pct(u * 0.16, W),
    '--rot': `${-gap * 110}%`,
    '--film': value / FILM_BASE,
  } as CSSProperties;

  const label = `Микрометр меряет толщину полотна ${name}: ${approx ? 'около ' : ''}${num(value)} мм. Рядом для сравнения — два листа офисной бумаги.`;

  return (
    <div className="cs-micro" data-active={active || undefined} data-phase={phase} style={vars} role="img" aria-label={label} aria-hidden={!active || undefined}>
      <div className="cs-mm">
        <Art segs={segs} />

        {/* Бледная метка прошлого замера */}
        <div className="cs-mm-ghost" data-on={(ghost && active) || undefined} style={{ left: pct(XA + (ghost?.value ?? value) * K, W), top: pct(22, H), height: pct(140, H) }}>
          <span>
            {ghost?.name} {ghost && num(ghost.value)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Неподвижная часть рисунка: от прокрутки и смены полотна не перерисовывается (двигают её только CSS-переменные) */
const Art = memo(function Art({ segs }: { segs: RefObject<SVGRectElement[][]> }) {
  const ticks = Array.from({ length: 15 }, (_, i) => i);
  return (
    <>
      {/* Скоба, пятка, табло, листы бумаги */}
      <svg className="cs-mm-layer" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id="mm-frame" gradientUnits="userSpaceOnUse" x1="0" y1="64" x2="0" y2="230">
            <stop offset="0" stopColor="#62778d" />
            <stop offset="0.3" stopColor="#3e5871" />
            <stop offset="0.72" stopColor="#31465b" />
            <stop offset="1" stopColor="#1f2d3a" />
          </linearGradient>
          <linearGradient id="mm-chrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7f8a98" />
            <stop offset="0.2" stopColor="#f5f7f9" />
            <stop offset="0.38" stopColor="#c6cdd5" />
            <stop offset="0.64" stopColor="#97a1ae" />
            <stop offset="0.84" stopColor="#e2e6eb" />
            <stop offset="1" stopColor="#68737f" />
          </linearGradient>
          <linearGradient id="mm-carbide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6570" />
            <stop offset="0.3" stopColor="#c3c8cf" />
            <stop offset="0.7" stopColor="#7d8590" />
            <stop offset="1" stopColor="#4c535c" />
          </linearGradient>
          <linearGradient id="mm-lcd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9c5b1" />
            <stop offset="1" stopColor="#cdd7c6" />
          </linearGradient>
          <radialGradient id="mm-shadow">
            <stop offset="0" stopColor="rgb(18 26 35 / 0.32)" />
            <stop offset="1" stopColor="rgb(18 26 35 / 0)" />
          </radialGradient>
        </defs>

        <ellipse cx="214" cy="238" rx="190" ry="8" fill="url(#mm-shadow)" />

        {/* Скоба */}
        <path
          className="cs-mm-frame"
          d="M70 74 Q70 64 80 64 H104 Q112 64 112 74 V106 C112 146 148 166 190 166 C232 166 262 144 262 110 V74 Q262 64 272 64 H298 Q308 64 308 74 V124 C308 192 258 230 190 230 C118 230 70 190 70 120 Z"
        />
        <path className="cs-mm-bevel" d="M73 120 C73 186 120 226 190 226 C256 226 305 190 305 124" />

        {/* Табло и кнопки */}
        <rect x="140" y="172" width="104" height="38" rx="6" fill="#18222d" />
        <rect x="144" y="176" width="96" height="30" rx="3" fill="url(#mm-lcd)" />
        <rect x="144" y="176" width="96" height="6" rx="3" fill="rgb(255 255 255 / 0.25)" />
        {DIGIT_X.map((x, i) => (
          <g key={i} transform={`translate(${x} ${DIGIT_Y}) skewX(-6)`}>
            {Object.entries(segRects(DIGIT.w, DIGIT.h, DIGIT.t)).map(([k, [sx, sy, sw, sh]]) => (
              <g key={k}>
                <rect className="cs-mm-seg-off" x={sx} y={sy} width={sw} height={sh} rx="0.8" />
                <rect
                  className="cs-mm-seg"
                  data-seg={k}
                  ref={(el) => {
                    if (el) segs.current[i]['abcdefg'.indexOf(k)] = el;
                  }}
                  x={sx}
                  y={sy}
                  width={sw}
                  height={sh}
                  rx="0.8"
                  style={{ opacity: k === 'g' ? 0 : 1 }}
                />
              </g>
            ))}
          </g>
        ))}
        <rect x="168" y="199" width="3" height="4" rx="0.6" className="cs-mm-dot" />
        <text x="226" y="200" className="cs-mm-unit">
          mm
        </text>
        <circle cx="256" cy="184" r="4" fill="#18222d" />
        <circle cx="256" cy="198" r="4" fill="#18222d" />
        <circle cx="255" cy="183" r="1.4" fill="rgb(255 255 255 / 0.25)" />
        <circle cx="255" cy="197" r="1.4" fill="rgb(255 255 255 / 0.25)" />

        {/* Пятка с твёрдосплавным наконечником */}
        <rect x="112" y="81" width="5" height="22" rx="1" fill="url(#mm-chrome)" />
        <rect x="116" y="83" width="12" height="18" fill="url(#mm-chrome)" />
        <rect x="127" y="83" width="5" height="18" fill="url(#mm-carbide)" />

      </svg>

      {/* Срез плёнки: ширина — толщина полотна в том же увеличении; края растворяются — это кусочек листа */}
      <i className="cs-mm-film" style={{ left: pct(XA, W), top: pct(28, H), width: pct(FILM_BASE * K, W), height: pct(128, H) }} />

      {/* Два листа офисной бумаги в том же увеличении: 0,1 мм каждый */}
      {[352, 353 + 0.1 * K].map((x) => (
        <i key={x} className="cs-mm-paper" style={{ left: pct(x, W), top: pct(124, H), width: pct(0.1 * K, W), height: pct(92, H) }} />
      ))}

      {/* Шпиндель */}
      <div className="cs-mm-layer cs-mm-spindle">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <rect x={XA} y="83" width="190" height="18" fill="url(#mm-chrome)" />
          <rect x={XA} y="83" width="5" height="18" fill="url(#mm-carbide)" />
        </svg>
      </div>

      {/* Ступица скобы, стопор и стебель со шкалой — поверх шпинделя */}
      <svg className="cs-mm-layer" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <path className="cs-mm-frame" d="M262 74 Q262 64 272 64 H298 Q308 64 308 74 V126 H262 Z" />
        <rect x="276" y="55" width="18" height="10" rx="2.5" fill="url(#mm-chrome)" />
        <rect x="280" y="50" width="10" height="6" rx="2" fill="#18222d" />
        <rect x="308" y="80" width="92" height="24" fill="url(#mm-chrome)" />
        <line className="cs-mm-engrave" x1="308" x2="400" y1={AXIS} y2={AXIS} />
        {ticks.map((i) => (
          <g key={i}>
            <line className="cs-mm-engrave" x1={314 + i * 6} x2={314 + i * 6} y1={AXIS} y2={AXIS - (i % 5 === 0 ? 8 : 5)} />
            <line className="cs-mm-engrave" x1={317 + i * 6} x2={317 + i * 6} y1={AXIS} y2={AXIS + 4.5} />
          </g>
        ))}
        {[0, 5, 10].map((n, i) => (
          <text key={n} className="cs-mm-num" x={314 + i * 30} y={AXIS - 9.5}>
            {n}
          </text>
        ))}
      </svg>

      {/* Барабан и трещотка: едут вместе со шпинделем, риски и насечка бегут — барабан вращается */}
      <div className="cs-mm-layer cs-mm-thimble">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path d="M352 82 L362 76 H414 V108 H362 L352 102 Z" fill="url(#mm-chrome)" />
          <path d="M352 82 L362 76 V108 L352 102 Z" fill="rgb(255 255 255 / 0.18)" />
          <line x1="404" x2="404" y1="76" y2="108" className="cs-mm-groove" />
          <line x1="408" x2="408" y1="76" y2="108" className="cs-mm-groove" />
          <rect x="414" y="84" width="22" height="16" rx="3" fill="url(#mm-chrome)" />
        </svg>
        <div className="cs-mm-turn" style={{ left: pct(352.5, W), top: pct(80, H), width: pct(9, W), height: pct(24, H) }}>
          <svg className="cs-mm-strip" viewBox="0 0 9 72" aria-hidden="true">
            {Array.from({ length: 30 }, (_, i) => (
              <line key={i} className="cs-mm-engrave" x1="0.5" x2={i % 5 === 0 ? 8.5 : 5} y1={1 + i * 2.4} y2={1 + i * 2.4} />
            ))}
          </svg>
        </div>
        <div className="cs-mm-turn" style={{ left: pct(415, W), top: pct(84, H), width: pct(20, W), height: pct(16, H) }}>
          <svg className="cs-mm-strip" viewBox="0 0 20 48" preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: 30 }, (_, i) => (
              <line key={i} className="cs-mm-knurl" x1="0" x2="20" y1={0.8 + i * 1.6} y2={0.8 + i * 1.6} />
            ))}
          </svg>
        </div>
      </div>

      <span className="cs-mm-label cs-mm-label-end" style={{ left: pct(XA - 6, W), top: pct(30, H) }}>
        срез плёнки
      </span>
      <span className="cs-mm-label" style={{ left: pct(353 + 0.1 * K, W), top: pct(220, H) }}>
        2 листа бумаги
      </span>
    </>
  );
});
