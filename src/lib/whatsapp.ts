import { canvases, priceLabel } from '../config/canvases';
import { site } from '../config/site';
import { num, rub } from './calc';

/** Подробности объекта: чем больше клиент указал сам, тем меньше вопросов в чате */
export interface Details {
  /** Улица, дом, квартира */
  address: string;
  /** Виды потолка (названия как в «Работах») или «Посоветуйте» */
  ceilings: string[];
  /** Свет: светильники, люстра, трек; «Без света» или «Пока не знаю» */
  lighting: string[];
}

export const emptyDetails: Details = { address: '', ceilings: [], lighting: [] };

export interface Contact extends Details {
  name: string;
  city: string;
  when: string;
  /** Выбранное полотно или пусто — «посоветуйте» */
  canvas: string;
  comment: string;
}

export const emptyContact: Contact = { ...emptyDetails, name: '', city: '', when: '', canvas: '', comment: '' };

/** Звёздочки и подчёркивания в WhatsApp включают форматирование — убираем их из текста клиента */
const clean = (s: string) => s.replace(/[*_~`]/g, '').replace(/\s+\n/g, '\n').trim();

const list = (items: string[] = []) =>
  items
    .map(clean)
    .filter(Boolean)
    .map((i) => i.toLowerCase())
    .join(', ');

/** Строки «Адрес», «Вид потолка», «Свет» — только заполненные */
function detailLines(d: Partial<Details>): string[] {
  const lines: string[] = [];
  if (clean(d.address ?? '')) lines.push(`Адрес: ${clean(d.address ?? '')}.`);
  if (list(d.ceilings)) lines.push(`Вид потолка: ${list(d.ceilings)}.`);
  if (list(d.lighting)) lines.push(`Свет: ${list(d.lighting)}.`);
  return lines;
}

/** Ссылка на работу: главная страница откроет её на весь экран */
export function workUrl(id: string, origin: string = site.url): string {
  return `${origin.replace(/\/$/, '')}/#${id}`;
}

/** Исламское приветствие — первой строкой в каждом сообщении мастеру */
export const greeting = 'السلام عليكم ورحمة الله وبركاته';

/** Текст общей кнопки «Написать в WhatsApp» (шапка, нижняя панель, 404) */
export const helloMessage = `${greeting}\nПишу с сайта ${site.brand} по поводу натяжного потолка.`;

/** Текст заказа от первого лица: с выбранным полотном — заказ, без него — просто запись на замер */
export function buildMeasureMessage(contact: Contact): string {
  const canvas = clean(contact.canvas);
  const info = canvases.find((c) => c.name === canvas);
  const lines = [
    greeting,
    canvas
      ? `Пишу с сайта ${site.brand}. Хочу заказать натяжной потолок, выбрал полотно ${info ? `${canvas} (${priceLabel(info)} ₽/м²)` : canvas}.`
      : `Пишу с сайта ${site.brand}. Хочу записаться на бесплатный замер, полотно — посоветуйте.`,
  ];
  if (clean(contact.name)) lines.push(`Меня зовут ${clean(contact.name)}.`);
  if (clean(contact.city)) lines.push(`Город: ${clean(contact.city)}.`);
  if (clean(contact.address)) lines.push(`Адрес: ${clean(contact.address)}.`);
  if (clean(contact.when)) lines.push(`Замер удобно: ${clean(contact.when).toLowerCase()}.`);
  lines.push(...detailLines({ ceilings: contact.ceilings, lighting: contact.lighting }));

  const blocks = [lines];
  if (clean(contact.comment)) blocks.push([`Что нужно: ${clean(contact.comment)}`]);
  return blocks.map((b) => b.join('\n')).join('\n\n');
}

export interface CalcRequest extends Partial<Details> {
  /** Размеры комнаты, м; без них — посчитано по площади */
  width?: number;
  length?: number;
  /** Площадь, м² (уже округлённая) */
  area: number;
  /** Название полотна или пусто — «посоветуйте» */
  canvas: string;
  /** Фактура: «Матовое», «Сатин» или «Глянец» (необязательно) */
  finish?: string;
  /** Ориентир за полотно, ₽ */
  total: number;
  city: string;
}

/** Текст «Отправить расчёт мастеру» из калькулятора */
export function buildCalcMessage(r: CalcRequest): string {
  const room = r.width && r.length ? `~${num(r.width)}×${num(r.length)} м (${num(r.area)} м²)` : `~${num(r.area)} м²`;
  const finish = clean(r.finish ?? '');
  const canvasName = clean(r.canvas) ? `выбрал полотно ${clean(r.canvas)}` : 'полотно — посоветуйте';
  const canvas = finish ? `${canvasName}, ${finish.toLowerCase()}` : canvasName;
  return `${greeting}\nПишу с сайта ${site.brand}. Посчитал потолок: комната ${room}, ${canvas}. По расчёту на сайте — от ${rub(r.total)} ₽ за полотно. Город: ${clean(r.city)}. ${[...detailLines(r), 'Хочу записаться на замер.'].join(' ')}`;
}

/** Текст «Хочу такой потолок» со ссылкой на работу */
export function buildLikeMessage(caption: string, id: string, origin: string = site.url): string {
  return `${greeting}\nПишу с сайта ${site.brand}. Хочу такой потолок, как у вас на сайте: «${clean(caption)}».\n${workUrl(id, origin)}`;
}

export function waLink(text?: string, phone: string = site.phoneDigits): string {
  return text ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/${phone}`;
}
