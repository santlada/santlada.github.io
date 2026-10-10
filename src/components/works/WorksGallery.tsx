import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { ceilingOrder, ceilingTypes, type CeilingType } from '../../config/site';
import type { Work } from '../../lib/works';
import { buildLikeMessage, waLink } from '../../lib/whatsapp';
import { IconChevronLeft, IconChevronRight, IconClose, IconPlay, IconWhatsApp } from '../icons';

export type Filter = CeilingType | 'all';

/** Ссылка «Хочу такой потолок»: адрес сайта подставляется при нажатии — так ссылка верна и на временном адресе */
const likeHref = (work: Work) => waLink(buildLikeMessage(work.caption, work.id));
const likeClick = (work: Work) => (e: MouseEvent<HTMLAnchorElement>) => {
  e.currentTarget.href = waLink(buildLikeMessage(work.caption, work.id, window.location.origin + import.meta.env.BASE_URL));
};

interface Props {
  works: Work[];
  /** На главной часть работ прячется на телефоне до нажатия «Показать ещё» */
  compact?: boolean;
  /** Синхронизировать фильтр с адресом страницы (?vid=linii) */
  syncUrl?: boolean;
  /** Кнопки фильтра по виду потолка */
  filters?: boolean;
  /** masonry — фото в натуральных пропорциях, grid — ровная сетка квадратов,
   *  strip — лента: на телефоне листается пальцем вбок, на компьютере — сетка */
  layout?: 'masonry' | 'grid' | 'strip';
  /** Галерея раздела одного вида: ссылку /#w-… открывает только раздел основного вида работы
   *  (работа с дополнительным видом показана в двух разделах, а открыться должна один раз) */
  owns?: CeilingType;
}

export const filterNames: Record<Filter, string> = {
  all: 'Все',
  linii: 'Световые линии',
  paryashchiy: 'Парящие',
  tenevoy: 'Теневые',
  klassika: 'Классические',
};

const MOBILE_LIMIT = 8;

const listClass = {
  grid: 'grid grid-cols-2 gap-3 sm:grid-cols-4',
  masonry: 'columns-2 gap-3 sm:columns-3 lg:columns-4 [&>li]:mb-3',
  strip: 'works-strip',
};

export default function WorksGallery({ works, compact = false, syncUrl = false, filters = true, layout = 'masonry', owns }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const stripRef = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: false, end: true });

  const list = useMemo(() => (filter === 'all' ? works : works.filter((w) => w.types.includes(filter))), [works, filter]);
  const counts = useMemo(() => {
    const c = { all: works.length } as Record<Filter, number>;
    for (const t of ceilingOrder) c[t] = works.filter((w) => w.types.includes(t)).length;
    return c;
  }, [works]);

  // Ссылка вида /#w-226 сразу открывает работу; ?vid=linii — включает фильтр
  const ownsLink = useCallback((w: Work) => !owns || w.types[0] === owns, [owns]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get('vid') as Filter | null;
    let current: Filter = 'all';
    if (syncUrl && filters && vid && vid in filterNames) {
      current = vid;
      setFilter(vid);
    }
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const linked = works.find((w) => w.id === id);
    if (!linked || !ownsLink(linked)) return;
    const inCurrent = (current === 'all' ? works : works.filter((w) => w.types.includes(current as CeilingType))).findIndex((w) => w.id === id);
    if (inCurrent >= 0) setOpenIndex(inCurrent);
    else {
      const all = works.findIndex((w) => w.id === id);
      if (all >= 0) {
        setFilter('all');
        setOpenIndex(all);
      }
    }
  }, [works, syncUrl, filters, ownsLink]);

  // Стрелки ленты: блокируются в начале и в конце, лента едет плавно на ширину экрана без одной карточки
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const sync = () => setEdge({ start: el.scrollLeft > 4, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', sync);
      ro.disconnect();
    };
  }, [list]);

  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    const item = el.querySelector<HTMLElement>('li');
    const step = item ? item.offsetWidth + 12 : el.clientWidth * 0.8;
    const count = Math.max(1, Math.floor(el.clientWidth / step));
    el.scrollBy({ left: dir * step * count, behavior: 'smooth' });
  };

  const choose = (f: Filter) => {
    setFilter(f);
    setExpanded(false);
    if (syncUrl) {
      const url = new URL(window.location.href);
      if (f === 'all') url.searchParams.delete('vid');
      else url.searchParams.set('vid', f);
      history.replaceState(null, '', url);
    }
  };

  return (
    <div>
      {filters && (
        <div className="-mx-5 mb-6 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" role="group" aria-label="Фильтр по виду потолка">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {(['all', ...ceilingOrder] as Filter[]).map((f) => (
              <button key={f} type="button" className="chip whitespace-nowrap" aria-pressed={filter === f} onClick={() => choose(f)}>
                {filterNames[f]}
                <span className="text-[0.8125rem] tabular-nums opacity-60">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={layout === 'strip' ? 'works-carousel' : undefined}>
      <ul ref={layout === 'strip' ? stripRef : undefined} className={listClass[layout]}>
        {list.map((work, i) => (
          <li
            key={work.id}
            id={syncUrl && ownsLink(work) ? work.id : undefined}
            className={`${layout === 'strip' ? 'works-strip-item' : 'break-inside-avoid'} ${compact && !expanded && i >= MOBILE_LIMIT ? 'hidden lg:block' : ''}`}
          >
            <Tile work={work} square={layout === 'grid'} portrait={layout === 'strip'} onOpen={() => setOpenIndex(i)} />
          </li>
        ))}
      </ul>
      {layout === 'strip' && list.length > 1 && (
        <>
          <button type="button" className="works-arrow works-arrow-prev" onClick={() => scrollStrip(-1)} disabled={!edge.start} aria-label="Показать предыдущие работы">
            <IconChevronLeft size={22} />
          </button>
          <button type="button" className="works-arrow works-arrow-next" onClick={() => scrollStrip(1)} disabled={!edge.end} aria-label="Показать следующие работы">
            <IconChevronRight size={22} />
          </button>
        </>
      )}
      </div>

      {compact && !expanded && list.length > MOBILE_LIMIT && (
        <button type="button" className="btn-ghost mt-2 w-full lg:hidden" onClick={() => setExpanded(true)}>
          Показать ещё {list.length - MOBILE_LIMIT}
        </button>
      )}

      {openIndex !== null && list[openIndex] && (
        <Lightbox
          list={list}
          index={openIndex}
          onIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}

function Tile({ work, square, portrait = false, onOpen }: { work: Work; square: boolean; portrait?: boolean; onOpen: () => void }) {
  return (
    <figure className="group relative overflow-hidden rounded-[var(--radius-card)] bg-haze">
      <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`Открыть: ${work.caption}${work.kind === 'video' ? ', видео' : ''}`}>
        <img
          src={work.thumb.src}
          srcSet={work.thumb.srcset}
          sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
          width={work.thumb.width}
          height={work.thumb.height}
          alt={work.caption}
          loading="lazy"
          decoding="async"
          className={square ? 'block aspect-square w-full object-cover' : portrait ? 'block aspect-[4/5] w-full object-cover' : 'block h-auto w-full'}
        />
        {work.kind === 'video' && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-2.5 py-1 text-[0.75rem] font-semibold text-white">
            <IconPlay size={12} />
            Видео
          </span>
        )}
      </button>
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-ink/80 via-ink/40 to-transparent p-3 pt-12 text-[0.875rem] leading-snug text-white [@media(hover:hover)]:block [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {work.caption}
      </figcaption>
      <a
        href={likeHref(work)}
        onClick={likeClick(work)}
        target="_blank"
        rel="noopener"
        className="absolute top-2.5 right-2.5 hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[0.8125rem] font-semibold text-ink opacity-0 shadow-[var(--shadow-float)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:inline-flex"
      >
        <IconWhatsApp size={14} className="text-wa" />
        Хочу такой
      </a>
    </figure>
  );
}

export function Lightbox({
  list,
  index,
  onIndex,
  onClose,
  plain = false,
}: {
  list: Work[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Просто фото: без ссылки на работу в адресе и без кнопки «Хочу такой потолок» */
  plain?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const startX = useRef<number | null>(null);
  // Куда листали в последний раз — от этого зависит, с какой стороны выезжает новое фото
  const [dir, setDir] = useState<1 | -1>(1);
  const work = list[index];
  const prev = useCallback(() => {
    setDir(-1);
    onIndex((index - 1 + list.length) % list.length);
  }, [index, list.length, onIndex]);
  const next = useCallback(() => {
    setDir(1);
    onIndex((index + 1) % list.length);
  }, [index, list.length, onIndex]);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      if (!plain) history.replaceState(null, '', window.location.pathname + window.location.search);
    };
  }, [plain]);

  useEffect(() => {
    if (!plain) history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${work.id}`);
    // Заранее подгружаем соседние фото
    for (const n of [list[(index + 1) % list.length], list[(index - 1 + list.length) % list.length]]) {
      if (n && n.kind === 'photo') new Image().src = n.full.src;
    }
  }, [work.id, index, list, plain]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  const types = work.types.map((t) => ceilingTypes[t].name).join(', ');

  return (
    <dialog
      ref={ref}
      aria-label={work.caption}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-ink/95 p-0 text-white"
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-[0.875rem] text-white/70 tabular-nums">
            {index + 1} из {list.length}
          </p>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            onClick={onClose}
            aria-label="Закрыть просмотр"
            autoFocus
          >
            <IconClose size={22} />
          </button>
        </div>

        <div
          className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden px-2 sm:px-20"
          onPointerDown={(e) => {
            startX.current = e.clientX;
          }}
          onPointerCancel={() => {
            startX.current = null;
          }}
          onPointerUp={(e) => {
            if (startX.current === null) return;
            const dx = e.clientX - startX.current;
            startX.current = null;
            if (Math.abs(dx) > 50) {
              if (dx > 0) prev();
              else next();
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {work.kind === 'video' && work.video ? (
            <video
              key={work.id}
              src={work.video}
              poster={work.full.src}
              controls
              autoPlay
              muted
              loop
              playsInline
              className={`max-h-full max-w-full rounded-[var(--radius-card)] bg-black ${dir > 0 ? 'lb-in-next' : 'lb-in-prev'}`}
            />
          ) : (
            <img
              key={work.id}
              src={work.full.src}
              width={work.full.width}
              height={work.full.height}
              alt={work.caption}
              className={`max-h-full max-w-full rounded-[var(--radius-card)] object-contain select-none ${dir > 0 ? 'lb-in-next' : 'lb-in-prev'}`}
              draggable={false}
            />
          )}

          {list.length > 1 && (
            <>
              <button type="button" onClick={prev} className="lb-arrow left-2 sm:left-4" aria-label="Предыдущее фото">
                <IconChevronLeft size={24} />
              </button>
              <button type="button" onClick={next} className="lb-arrow right-2 sm:right-4" aria-label="Следующее фото">
                <IconChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold">{work.caption}</p>
            {!plain && <p className="text-[0.875rem] text-white/70">{types}</p>}
          </div>
          {!plain && (
            <a href={likeHref(work)} onClick={likeClick(work)} target="_blank" rel="noopener" className="btn-wa min-h-12 whitespace-nowrap">
              <IconWhatsApp size={18} />
              Хочу такой потолок
            </a>
          )}
        </div>
      </div>
    </dialog>
  );
}
