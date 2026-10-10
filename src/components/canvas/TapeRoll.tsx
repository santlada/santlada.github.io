import { memo, useEffect, useId, useState, type CSSProperties } from 'react';
import { meters, pct, reduced } from './format';

/*
 * Сцена «Ширина рулона»: рулетка выезжает до ширины рулона, затем рулон раскатывается по плану комнаты (вид сверху).
 * Ширину комнаты задаёт ползунок (RoomSlider): если комната шире рулона, рядом раскатывается вторая полоса и
 * появляется линия шва. Стены, пол и полосы меняют размер только через transform (scaleX/translateX), поэтому
 * ползунок двигает рисунок плавно и без перерисовки страницы.
 */

const W = 420;
const H = 262;
const X0 = 44; // левая стена комнаты (внутренний край)
const M = 36; // единиц рисунка на 1 м
export const ROOM_MIN = 2;
export const ROOM_MAX = 9;
const TOP = 92; // верхняя стена
const BOT = 222; // нижняя стена
const TAPE_Y = 58;
const R0 = 15; // радиус полного рулона
const R1 = 6; // остаток на втулке
const WALL = 4;

const Strip = memo(function Strip({ left, width, scale, delay }: { left: number; width: number; scale: string; delay?: boolean }) {
  return (
    <div
      className="cs-tr-strip"
      data-late={delay || undefined}
      style={{ left: pct(left, W), top: pct(TOP, H), width: pct(width, W), height: pct(BOT - TOP, H), '--s': scale } as CSSProperties}
    >
      <i className="cs-tr-film" />
      <div className="cs-tr-roller" style={{ top: pct(-R0, BOT - TOP), height: pct(2 * R0, BOT - TOP) }}>
        <i className="cs-roller-shade" />
        <i className="cs-roller-body">
          <b />
        </i>
      </div>
    </div>
  );
});

/** Лента рулетки: риски через 10 см, крючок на конце */
const Blade = memo(function Blade({ length, roll }: { length: number; roll: number }) {
  return (
    <svg viewBox={`0 0 ${length} 12`} preserveAspectRatio="none" aria-hidden="true">
      <rect width={length - 3} height="12" fill="#eef1f4" />
      <rect width={length - 3} height="1.2" fill="#c6ced7" />
      {Array.from({ length: Math.round(roll * 10) + 1 }, (_, i) => (
        <line key={i} x1={6 + (i * M) / 10} x2={6 + (i * M) / 10} y1="1.2" y2={i % 10 === 0 ? 8 : i % 5 === 0 ? 6 : 4} className="cs-tr-tick" />
      ))}
      <rect x={length - 3} y="0" width="3" height="12" fill="#28323d" />
    </svg>
  );
});

export default function TapeRoll({ roll, room, active }: { roll: number; room: number; active: boolean }) {
  // Пока сцена доигрывает впервые, шов и подписи ждут рулон; потом ползунок меняет их сразу
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (!active) return setPlayed(false);
    if (reduced()) return setPlayed(true);
    const t = window.setTimeout(() => setPlayed(true), 2600);
    return () => window.clearTimeout(t);
  }, [active]);

  const seam = room > roll + 1e-6;
  const span = ROOM_MAX * M;
  const blade = X0 + roll * M + 3 - 38; // от выхода из корпуса до крючка
  const vars = {
    '--sa': Math.min(room, roll) / roll,
    '--sb': Math.max(0, room - roll) / (ROOM_MAX - roll),
    '--sr': room / ROOM_MAX,
    '--swall': (room * M + 2 * WALL) / (span + 2 * WALL),
    '--rw': `${((room * M) / WALL) * 100}%`,
    '--mid': `${((X0 + (room * M) / 2) / W - 0.5) * 100}%`,
    '--travel': `${((BOT - TOP) / (2 * R0)) * 100}%`,
    '--thin': R1 / R0,
  } as CSSProperties;

  const label = `Рулетка показывает ширину рулона — до ${meters(roll)} м. Комната шириной ${meters(room)} м: ${seam ? 'нужен шов' : 'одним полотном, без шва'}.`;

  return (
    <div className="cs-tr" style={vars} data-seam={seam || undefined} data-played={played || undefined} role="img" aria-label={label} aria-hidden={!active || undefined}>
      {/* Пол комнаты */}
      <i className="cs-tr-floor" style={{ left: pct(X0, W), top: pct(TOP, H), width: pct(span, W), height: pct(BOT - TOP, H) }} />

      {/* Полотно: первая полоса — до ширины рулона, вторая — остаток (если комната шире) */}
      <Strip left={X0} width={roll * M} scale="var(--sa)" />
      <Strip left={X0 + roll * M} width={(ROOM_MAX - roll) * M} scale="var(--sb)" delay />

      {/* Стены */}
      <i className="cs-tr-wall" style={{ left: pct(X0 - WALL, W), top: pct(TOP - WALL, H), width: pct(WALL, W), height: pct(BOT - TOP + 2 * WALL, H) }} />
      <i className="cs-tr-wall cs-tr-wall-h" style={{ left: pct(X0 - WALL, W), top: pct(TOP - WALL, H), width: pct(span + 2 * WALL, W), height: pct(WALL, H) }} />
      <i className="cs-tr-wall cs-tr-wall-h" style={{ left: pct(X0 - WALL, W), top: pct(BOT, H), width: pct(span + 2 * WALL, W), height: pct(WALL, H) }} />
      <i className="cs-tr-wall cs-tr-wall-r" style={{ left: pct(X0, W), top: pct(TOP - WALL, H), width: pct(WALL, W), height: pct(BOT - TOP + 2 * WALL, H) }} />

      {/* Шов: там, где кончается ширина рулона */}
      <div className="cs-tr-seam" style={{ left: pct(X0 + roll * M, W), top: pct(TOP, H), height: pct(BOT - TOP, H) }}>
        <span>шов</span>
      </div>

      {/* Подписи по центру комнаты: «без шва» и ширина комнаты */}
      <div className="cs-tr-mid" style={{ top: pct((TOP + BOT) / 2, H) }}>
        <span className="cs-tr-noseam">без шва</span>
      </div>
      <i className="cs-tr-dimline" style={{ left: pct(X0, W), top: pct(BOT + 16, H), width: pct(span, W) }} />
      <div className="cs-tr-mid" style={{ top: pct(BOT + 16, H) }}>
        <span className="cs-tr-dim">{meters(room)} м</span>
      </div>

      {/* Рулетка: корпус слева, лента выезжает до ширины рулона */}
      <div className="cs-tr-tape" style={{ left: pct(38, W), top: pct(TAPE_Y - 6, H), width: pct(span + 20, W), height: pct(12, H) }}>
        <div className="cs-tr-blade" style={{ width: pct(blade, span + 20) }}>
          <Blade length={blade} roll={roll} />
        </div>
      </div>
      <i className="cs-tr-case" style={{ left: pct(4, W), top: pct(TAPE_Y - 17, H), width: pct(36, W), height: pct(34, H) }} />
      <div className="cs-tr-chip" style={{ left: pct(X0 + roll * M, W), top: pct(TAPE_Y - 10, H) }}>
        <span>до {meters(roll)} м</span>
      </div>
    </div>
  );
}

/** Ползунок «Ширина вашей комнаты» — в тексте сцены */
export function RoomSlider({ room, roll, onChange, focusable }: { room: number; roll: number; onChange: (v: number) => void; focusable: boolean }) {
  const seam = room > roll + 1e-6;
  const id = useId();
  return (
    <div className="cs-room">
      <span className="cs-room-head">
        <label htmlFor={id}>Ширина вашей комнаты</label>
        {/* Значение диктор читает из самого ползунка (aria-valuetext) — здесь только для глаз */}
        <output htmlFor={id} aria-hidden="true">
          {meters(room)} м
        </output>
      </span>
      <input
        id={id}
        type="range"
        min={ROOM_MIN}
        max={ROOM_MAX}
        step={0.1}
        value={room}
        tabIndex={focusable ? undefined : -1}
        aria-valuetext={`${meters(room)} м — ${seam ? 'нужен шов' : 'без шва'}`}
        style={{ '--p': `${((room - ROOM_MIN) / (ROOM_MAX - ROOM_MIN)) * 100}%`, '--roll': `${((roll - ROOM_MIN) / (ROOM_MAX - ROOM_MIN)) * 100}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
