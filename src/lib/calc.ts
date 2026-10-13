/**
 * Расчёт полотна для блока «Посчитайте полотно»: площадь комнаты × цена полотна за м² из config/canvases.ts.
 * Только полотно — профиль, свет и светильники считаются после замера.
 */
import { canvases, priceOf, type CanvasInfo, type Finish } from '../config/canvases';

/** Самый широкий рулон, м: шире — полотно сваривают из двух частей, появляется шов */
export const WIDEST_ROLL = 5.5;

/** Пределы полей: ширина и длина комнаты, м */
export const limits = {
  side: { min: 1, max: 20 },
};

/** Ширина рулона полотна, м: поле roll в canvases.ts, а если его нет — самый широкий рулон */
export function rollOf(c?: CanvasInfo): number {
  return c?.roll ?? WIDEST_ROLL;
}

/** Фактуры, которые можно выбрать в калькуляторе: у выбранного полотна — его, без выбора — все три */
export const finishesOf = (c?: CanvasInfo): Finish[] => c?.finishes ?? ['matte', 'satin', 'gloss'];

/**
 * Цена за м² для расчёта: у выбранного полотна — цена выбранной фактуры, без выбора — у самого доступного полотна.
 * Если полотно не выпускается в такой фактуре, берётся его первая.
 */
export function pricePerM2(c?: CanvasInfo, finish?: Finish): number {
  const of = (x: CanvasInfo) => priceOf(x, finish && x.finishes.includes(finish) ? finish : x.finishes[0]);
  return c ? of(c) : Math.min(...canvases.map(of));
}

/** Большая комната: одна из сторон от 5 м — расходуется больше полотна, к цене за м² добавляется надбавка */
export const BIG_SIDE = 5;
export const BIG_SURCHARGE = 50;

/** Надбавка к цене за м², ₽: есть, только если известны размеры и одна из сторон не меньше 5 м */
export const surchargeOf = (width: number, length: number) => (Math.max(width, length) >= BIG_SIDE ? BIG_SURCHARGE : 0);

/** Площадь с точностью до 0,1 м² — та же, что видна на экране, чтобы «площадь × цена» сходилось */
export const roundArea = (a: number) => Math.round(a * 10) / 10;

/** Нужен ли шов: полотно раскатывают вдоль длины комнаты, шов появляется, если ширина больше ширины рулона */
export const needsSeam = (width: number, roll: number) => width > roll;

/** «3,5» вместо «3.5»; целые — без запятой */
export const num = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/** «7 110» — тысячи через обычный пробел (в WhatsApp он не разрывает число иначе, чем неразрывный) */
export const rub = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\u00a0|\u202f/g, ' ');

/** Число из поля: принимает запятую и точку; не число — NaN */
export const parseNum = (s: string) => Number(s.trim().replace(',', '.').replace(/\s/g, '')) || NaN;
