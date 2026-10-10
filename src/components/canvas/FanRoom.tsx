import { memo, useState, type CSSProperties } from 'react';
import type { Finish } from '../../config/canvases';
import { pct } from './format';

/*
 * Сцена «Белое и цветное»: веер образцов раскрывается, нажатие на образец перекрашивает потолок в маленькой комнате.
 * Потолки всех цветов лежат друг на друге, выбранный проявляется через opacity — перекраска без перерисовки.
 */

const W = 450;
const H = 240;
const ROOM = { x: 4, y: 18, w: 232, h: 202 };
const BLADE = { w: 40, len: 168, bottom: 236 };
const PIVOT_X = 336;
const SPREAD = 13; // градусов между образцами

const CEIL = '0,0 230,0 162,54 68,54';

export default function FanRoom({ colors, finish, active }: { colors: { hex: string; name: string }[]; finish: Finish; active: boolean }) {
  const [sel, setSel] = useState(0);
  const mid = (colors.length - 1) / 2;
  const pivotY = BLADE.bottom - 10;

  return (
    <div className="cs-pal" data-finish={finish} inert={!active} aria-hidden={!active || undefined}>
      <div
        className="cs-pal-room"
        style={{ left: pct(ROOM.x, W), top: pct(ROOM.y, H), width: pct(ROOM.w, W), height: pct(ROOM.h, H) }}
        role="img"
        aria-label={`Комната с потолком: ${colors[sel].name}`}
      >
        <RoomArt colors={colors} sel={sel} />
      </div>

      <div className="cs-pal-fan" role="group" aria-label="Цвет полотна">
        {colors.map((c, i) => (
          <button
            key={c.hex}
            type="button"
            className="cs-pal-blade"
            aria-pressed={i === sel}
            aria-label={c.name}
            onClick={() => setSel(i)}
            style={
              {
                left: pct(PIVOT_X - BLADE.w / 2, W),
                top: pct(BLADE.bottom - BLADE.len, H),
                width: pct(BLADE.w, W),
                height: pct(BLADE.len, H),
                transformOrigin: `50% ${pct(BLADE.len - 10, BLADE.len)}`,
                '--c': c.hex,
                '--i': i,
                '--r': `${(i - mid) * SPREAD}deg`,
              } as CSSProperties
            }
          />
        ))}
        <i className="cs-pal-rivet" style={{ left: pct(PIVOT_X, W), top: pct(pivotY, H) }} />
      </div>
    </div>
  );
}

/** Рисунок комнаты: перерисовывается только при выборе цвета, а не при прокрутке */
const RoomArt = memo(function RoomArt({ colors, sel }: { colors: { hex: string; name: string }[]; sel: number }) {
  return (
    <svg viewBox="0 0 230 200" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="pal-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(255 255 255 / 0.14)" />
          <stop offset="1" stopColor="rgb(18 26 35 / 0.12)" />
        </linearGradient>
        <linearGradient id="pal-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f8fc" />
          <stop offset="1" stopColor="#cfdcea" />
        </linearGradient>
      </defs>
      <polygon points="68,54 162,54 162,132 68,132" fill="#eceef1" />
      <polygon points="0,0 68,54 68,132 0,200" fill="#dfe3e8" />
      <polygon points="230,0 162,54 162,132 230,200" fill="#e6e9ed" />
      <polygon points="68,132 162,132 230,200 0,200" fill="#d9ccb6" />
      <polygon points="68,132 162,132 230,200 0,200" fill="url(#pal-depth)" opacity="0.6" />
      {/* окно на левой стене и отражение света на полу */}
      <polygon points="16,33 50,60 50,100 16,124" fill="url(#pal-glass)" stroke="#fff" strokeWidth="2" />
      <line x1="33" x2="33" y1="46.5" y2="112" stroke="#fff" strokeWidth="1.6" />
      <polygon points="58,140 92,140 70,170 22,170" fill="rgb(255 255 255 / 0.28)" />
      {/* диван у дальней стены */}
      <rect x="82" y="104" width="66" height="16" rx="4" fill="#8193a6" />
      <rect x="78" y="114" width="74" height="18" rx="4" fill="#6f8296" />
      <rect x="84" y="112" width="30" height="8" rx="3" fill="#90a1b3" />
      <rect x="116" y="112" width="30" height="8" rx="3" fill="#90a1b3" />

      {/* потолок: все цвета друг на друге, выбранный проявляется (подложка — чтобы на перекраске не просвечивало) */}
      <polygon points={CEIL} fill="#eef0f2" />
      {colors.map((c, i) => (
        <polygon key={c.hex} className="cs-pal-ceil" data-on={i === sel || undefined} points={CEIL} fill={c.hex} />
      ))}
      <polygon points={CEIL} fill="url(#pal-depth)" />
      {/* сатин — мягкий отблеск, глянец — отражение окна */}
      <polygon className="cs-pal-satin" points="10,4 120,4 96,30 26,30" fill="rgb(255 255 255 / 0.22)" />
      <polygon className="cs-pal-gloss" points="18,6 46,26 46,44 18,24" fill="rgb(255 255 255 / 0.55)" />
      {/* теневой зазор по периметру и споты */}
      <path d="M0 0 L68 54 H162 L230 0" fill="none" stroke="rgb(18 26 35 / 0.35)" strokeWidth="1.4" />
      {[
        [56, 14],
        [115, 14],
        [174, 14],
        [88, 38],
        [142, 38],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={y + 1} rx="9" ry="4" fill="rgb(255 244 214 / 0.35)" />
          <ellipse cx={x} cy={y} rx="3.6" ry="1.6" fill="#fffdf4" stroke="rgb(18 26 35 / 0.25)" strokeWidth="0.5" />
        </g>
      ))}
    </svg>
  );
});
