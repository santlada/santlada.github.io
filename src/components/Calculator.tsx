import { useId, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { canvases } from '../config/canvases';
import { limits, needsSeam, num, parseNum, pricePerM2, rollOf, roundArea, rub } from '../lib/calc';
import { buildCalcMessage, waLink } from '../lib/whatsapp';
import CityField from './CityField';
import { IconWhatsApp } from './icons';

/**
 * Калькулятор полотна: размеры комнаты (или сразу площадь) × цена полотна за м² из config/canvases.ts.
 * На мини-плане комната в масштабе; если ширина комнаты больше ширины рулона выбранного полотна — появляется шов.
 * «Отправить расчёт мастеру» открывает WhatsApp с готовым текстом — так же, как форма записи на замер.
 */

type Mode = 'size' | 'area';

const ADVISE = '';

export default function Calculator() {
  const uid = useId();
  const [mode, setMode] = useState<Mode>('size');
  const [width, setWidth] = useState('3,5');
  const [length, setLength] = useState('4,5');
  const [areaText, setAreaText] = useState('16');
  const [canvasName, setCanvasName] = useState('MSD Premium');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const firstField = useRef<HTMLInputElement>(null);

  const canvas = canvases.find((c) => c.name === canvasName);
  const price = pricePerM2(canvas);
  const roll = rollOf(canvas);

  const w = parseNum(width);
  const l = parseNum(length);
  const inSide = (v: number) => v >= limits.side.min && v <= limits.side.max;
  const sizeOk = inSide(w) && inSide(l);
  const a = parseNum(areaText);
  const areaOk = a >= limits.area.min && a <= limits.area.max;

  const valid = mode === 'size' ? sizeOk : areaOk;
  const area = valid ? roundArea(mode === 'size' ? w * l : a) : 0;
  const total = Math.round(area * price);
  const seam = mode === 'size' && sizeOk && needsSeam(w, roll);

  const message = buildCalcMessage({
    ...(mode === 'size' ? { width: w, length: l } : {}),
    area,
    canvas: canvasName,
    total,
    city,
  });

  return (
    <form className="calc-card" onSubmit={(e) => e.preventDefault()} noValidate aria-label="Расчёт полотна">
      <div className="calc-visual">
        <Plan mode={mode} w={sizeOk ? w : 0} l={sizeOk ? l : 0} area={area} roll={roll} seam={seam} tone={canvas?.tone ?? '#f7f7f4'} />
        <p className="calc-note" aria-live="polite">
          {seam
            ? `Комната шире ${num(roll)} м — одним полотном не закрыть, будет шов. Где его провести, чтобы он не бросался в глаза, решим на замере.`
            : mode === 'size' && sizeOk
              ? 'Одним полотном, без шва.'
              : ''}
        </p>
      </div>

      <div className="calc-info">
        <div className="calc-modes" role="radiogroup" aria-label="Как считать">
          {(
            [
              ['size', 'По размерам'],
              ['area', 'Знаю площадь'],
            ] as const
          ).map(([m, label]) => (
            <label key={m} className="chip calc-opt">
              <input type="radio" name={`${uid}-mode`} value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>

        {mode === 'size' ? (
          <div className="calc-sides">
            <NumField id={`${uid}-w`} label="Ширина" unit="м" value={width} onChange={setWidth} range={limits.side} inputRef={firstField} />
            <span className="calc-times" aria-hidden="true">
              ×
            </span>
            <NumField id={`${uid}-l`} label="Длина" unit="м" value={length} onChange={setLength} range={limits.side} />
          </div>
        ) : (
          <NumField id={`${uid}-a`} label="Площадь комнаты" unit="м²" value={areaText} onChange={setAreaText} range={limits.area} step={1} inputRef={firstField} />
        )}

        <fieldset>
          <legend className="label">Полотно</legend>
          <div className="flex flex-wrap gap-2">
            {[...canvases.map((c) => c.name), ADVISE].map((name) => (
              <label key={name || 'advise'} className="chip calc-opt">
                <input
                  type="radio"
                  name={`${uid}-canvas`}
                  value={name}
                  checked={canvasName === name}
                  onChange={() => setCanvasName(name)}
                  className="sr-only"
                />
                {name || 'Посоветуйте'}
              </label>
            ))}
          </div>
        </fieldset>

        <CityField
          id={`${uid}-city`}
          value={city}
          error={error}
          selectRef={selectRef}
          onChange={(c) => {
            setError('');
            setCity(c);
          }}
        />

        <div className="calc-result" aria-live="polite">
          {valid ? (
            <>
              <p className="calc-total">
                Полотно: <b>от {rub(total)} ₽</b>
              </p>
              <p className="calc-formula">
                {num(area)} м² × {rub(price)} ₽ за м²
              </p>
              {!canvas && <p className="calc-how">Посчитано по самому доступному полотну.</p>}
            </>
          ) : (
            <p className="calc-how">Введите размеры комнаты — цена посчитается сразу.</p>
          )}
          <p className="calc-how">Профиль, свет и светильники — после бесплатного замера.</p>
        </div>

        <a
          href={waLink(message)}
          target="_blank"
          rel="noopener"
          className="btn-wa w-full sm:w-auto sm:justify-self-start"
          onClick={(e) => {
            if (!valid) {
              e.preventDefault();
              firstField.current?.focus();
              return;
            }
            if (!city.trim()) {
              e.preventDefault();
              setError('Выберите город — так я пойму, куда ехать на замер.');
              selectRef.current?.focus();
              return;
            }
            setSent(true);
          }}
        >
          <IconWhatsApp size={20} />
          Отправить расчёт мастеру
        </a>
        {sent && (
          <p className="text-[0.9375rem] text-ink-soft" role="status">
            Открыли WhatsApp с текстом расчёта. Нажмите «Отправить» в чате — я отвечу и договорюсь с вами о замере.
          </p>
        )}
      </div>
    </form>
  );
}

/**
 * Поле для числа с запятой. Клавиши: ↑/↓ — на шаг (0,1 м), с Shift и PageUp/PageDown — на 1, Home/End — к пределам.
 * role="spinbutton": экранный диктор называет текущее значение и пределы.
 */
function NumField({
  id,
  label,
  unit,
  value,
  onChange,
  range,
  step = 0.1,
  inputRef,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  range: { min: number; max: number };
  step?: number;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const v = parseNum(value);
  const ok = v >= range.min && v <= range.max;
  const set = (n: number) => onChange(num(Math.min(range.max, Math.max(range.min, Math.round(n * 10) / 10))));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const base = Number.isNaN(v) ? range.min : v;
    const big = e.shiftKey ? 1 : step;
    const moves: Record<string, () => void> = {
      ArrowUp: () => set(base + big),
      ArrowDown: () => set(base - big),
      PageUp: () => set(base + 1),
      PageDown: () => set(base - 1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      moves[e.key]();
    }
  };

  return (
    <div className="calc-num">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          className="field pr-10 tabular-nums"
          inputMode="decimal"
          autoComplete="off"
          role="spinbutton"
          aria-valuemin={range.min}
          aria-valuemax={range.max}
          aria-valuenow={ok ? v : undefined}
          aria-valuetext={ok ? `${num(v)} ${unit}` : undefined}
          aria-invalid={!ok || undefined}
          aria-describedby={ok ? undefined : `${id}-hint`}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
          onKeyDown={onKey}
          onBlur={() => ok && onChange(num(v))}
        />
        <span className="calc-unit" aria-hidden="true">
          {unit}
        </span>
      </div>
      {!ok && (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.875rem] font-medium text-danger">
          Число от {range.min} до {range.max}
        </p>
      )}
    </div>
  );
}

/** Мини-план комнаты сверху: прямоугольник в масштабе, размеры по краям, шов — если ширина больше рулона */
function Plan({ mode, w, l, area, roll, seam, tone }: { mode: Mode; w: number; l: number; area: number; roll: number; seam: boolean; tone: string }) {
  const W = 320;
  const H = 230;
  const pad = 40;
  // По площади рисуем квадрат: стороны неизвестны
  const side = Math.sqrt(area || 1);
  const rw = mode === 'size' && w ? w : side;
  const rl = mode === 'size' && l ? l : side;
  const k = Math.min((W - pad * 2) / rw, (H - pad * 2) / rl);
  const pw = rw * k;
  const ph = rl * k;
  const x = (W - pw) / 2;
  const y = (H - ph) / 2;
  // Полотно раскатывают вдоль длины: шов идёт вдоль неё, на ширине рулона от левой стены
  const seamAt = roll * k;
  const showDims = mode === 'size' && w > 0 && l > 0;

  return (
    <svg className="calc-plan" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={showDims ? `План комнаты ${num(w)} на ${num(l)} метра` : `План комнаты ${num(area)} квадратных метров`}>
      <defs>
        <linearGradient id="calc-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Стены: толстая обводка, внутри — полотно цвета выбранного */}
      <rect className="calc-room" x={x} y={y} width={pw} height={ph} style={{ x, y, width: pw, height: ph, fill: tone }} rx="2" />
      <rect className="calc-room-light" x={x} y={y} width={pw} height={ph} style={{ x, y, width: pw, height: ph }} fill="url(#calc-light)" />
      {seam && (
        <g className="calc-seam">
          <line x1={x + seamAt} y1={y} x2={x + seamAt} y2={y + ph} />
          <text x={x + seamAt} y={y + ph + 20} textAnchor="middle" className="calc-seam-label">
            шов
          </text>
        </g>
      )}
      <text x={W / 2} y={H / 2 + 6} textAnchor="middle" className="calc-plan-area">
        {area ? `${num(area)} м²` : ''}
      </text>
      {showDims && (
        <>
          <text x={W / 2} y={y - 12} textAnchor="middle" className="calc-plan-dim">
            {num(w)} м
          </text>
          <text x={x - 12} y={H / 2} textAnchor="middle" className="calc-plan-dim" transform={`rotate(-90 ${x - 12} ${H / 2})`}>
            {num(l)} м
          </text>
        </>
      )}
    </svg>
  );
}
