/**
 * Собирает работы из src/assets/works/<вид>/ (и видео из src/assets/videos/<вид>/, если они включены),
 * пары «до / после» из src/assets/before-after/ и готовит оптимизированные картинки.
 * Выполняется при сборке сайта.
 */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { ceilingTypes, ceilingOrder, type CeilingType } from '../config/site';
import { angleInfo, beforeAfter, featured, showVideos, workInfo } from '../data/works';

export interface WorkImage {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

export interface Work {
  /** w-… для фото, v-… для видео — по нему строится ссылка на работу */
  id: string;
  file: string;
  kind: 'photo' | 'video';
  types: CeilingType[];
  caption: string;
  thumb: WorkImage;
  full: WorkImage;
  video?: string;
}

export interface BeforeAfterPair {
  id: string;
  title: string;
  text: string;
  type: CeilingType;
  before: ImageMetadata;
  after: ImageMetadata;
}

const photoFiles = import.meta.glob<{ default: ImageMetadata }>('/src/assets/works/*/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
});
const videoFiles = import.meta.glob<string>('/src/assets/videos/*/*.{mp4,MP4,webm}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const posterFiles = import.meta.glob<{ default: ImageMetadata }>('/src/assets/videos/*/*.{jpg,jpeg,png,webp}', { eager: true });
const angleFiles = import.meta.glob<{ default: ImageMetadata }>('/src/assets/angles/*/*.{jpg,jpeg,png,webp}', { eager: true });
const renderFiles = import.meta.glob<{ default: ImageMetadata }>('/src/assets/renders/*/*.{jpg,jpeg,png,webp}', { eager: true });
const pairFiles = import.meta.glob<{ default: ImageMetadata }>('/src/assets/before-after/*.{jpg,jpeg,png,webp}', { eager: true });

const parse = (path: string) => {
  const [, type, file] = path.match(/\/([^/]+)\/([^/]+)\.[a-z0-9]+$/i) ?? [];
  return { type: type as CeilingType, file };
};

async function optimize(img: ImageMetadata): Promise<{ thumb: WorkImage; full: WorkImage }> {
  const thumb = await getImage({ src: img, widths: [360, 540, 720, 1080].filter((w) => w <= img.width), format: 'webp', quality: 74 });
  const full = await getImage({ src: img, width: Math.min(img.width, 1800), format: 'webp', quality: 82 });
  return {
    thumb: { src: thumb.src, srcset: thumb.srcSet.attribute, width: img.width, height: img.height },
    full: { src: full.src, srcset: full.srcSet.attribute, width: img.width, height: img.height },
  };
}

const order = (file: string) => {
  const i = featured.indexOf(file);
  return i >= 0 ? i : featured.length;
};

let cache: Promise<Work[]> | undefined;

/** Работы для галереи */
export function getWorks(): Promise<Work[]> {
  cache ??= build();
  return cache;
}

async function build(): Promise<Work[]> {
  const works: Work[] = [];

  for (const [path, mod] of Object.entries(photoFiles)) {
    const { type, file } = parse(path);
    if (!ceilingOrder.includes(type)) continue;
    const info = workInfo[file];
    works.push({
      id: `w-${file}`,
      file,
      kind: 'photo',
      types: [type, ...(info?.also ?? []).filter((t) => t !== type)],
      caption: info?.caption ?? ceilingTypes[type].name,
      ...(await optimize(mod.default)),
    });
  }

  for (const [path, url] of Object.entries(showVideos ? videoFiles : {})) {
    const { type, file } = parse(path);
    if (!ceilingOrder.includes(type)) continue;
    const poster = Object.entries(posterFiles).find(([p]) => parse(p).file === file && parse(p).type === type)?.[1];
    if (!poster) continue;
    const info = workInfo[file];
    works.push({
      id: `v-${file}`,
      file,
      kind: 'video',
      types: [type, ...(info?.also ?? []).filter((t) => t !== type)],
      caption: info?.caption ?? ceilingTypes[type].name,
      video: url,
      ...(await optimize(poster.default)),
    });
  }

  // Сначала избранные, затем от новых постов к старым (имя файла — номер поста), остальные по имени
  return works.sort(
    (a, b) => order(a.file) - order(b.file) || Number(b.file) - Number(a.file) || a.file.localeCompare(b.file, 'ru', { numeric: true }),
  );
}

/** Пары «до / после» в порядке из data/works.ts; пара без обоих файлов пропускается */
export function getBeforeAfter(): BeforeAfterPair[] {
  const find = (name: string) => Object.entries(pairFiles).find(([p]) => parse(p).file === name)?.[1].default;
  return beforeAfter.flatMap((pair) => {
    const before = find(`${pair.id}-do`);
    const after = find(`${pair.id}-posle`);
    return before && after ? [{ ...pair, before, after }] : [];
  });
}

/** Фото «с других ракурсов» по видам потолка — для блока про устройство вида */
export async function getAngles(type: CeilingType): Promise<Work[]> {
  const list: Work[] = [];
  for (const [path, mod] of Object.entries(angleFiles).sort(([a], [b]) => a.localeCompare(b, 'ru', { numeric: true }))) {
    const { type: t, file } = parse(path);
    if (t !== type || !angleInfo[file]) continue;
    list.push({ id: `a-${file}`, file, kind: 'photo', types: [type], caption: angleInfo[file], ...(await optimize(mod.default)) });
  }
  return list;
}

/**
 * Визуализации вида потолка: комната, узел «в разрезе» и крупный план. Файлы — src/assets/renders/<вид>/{room,cut,close}.jpg.
 * Нет файла — этот кадр просто не показывается.
 */
export async function getRenders(type: CeilingType): Promise<{ room?: Work; cut?: Work; close?: Work }> {
  const info = ceilingTypes[type];
  const captions = {
    room: `${info.name} потолок в комнате — визуализация`,
    cut: `В разрезе: ${info.section[0].toLowerCase()}${info.section.slice(1)} — визуализация`,
    close: `${info.name} потолок вблизи — визуализация`,
  };
  const out: { room?: Work; cut?: Work; close?: Work } = {};
  for (const key of ['room', 'cut', 'close'] as const) {
    const found = Object.entries(renderFiles).find(([path]) => parse(path).type === type && parse(path).file === key);
    if (!found) continue;
    out[key] = { id: `r-${type}-${key}`, file: key, kind: 'photo', types: [type], caption: captions[key], ...(await optimize(found[1].default)) };
  }
  return out;
}
