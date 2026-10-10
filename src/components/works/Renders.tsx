import { useState } from 'react';
import type { Work } from '../../lib/works';
import { Lightbox } from './WorksGallery';

interface Props {
  room?: Work;
  cut?: Work;
  close?: Work;
  /** Подпись к узлу «в разрезе» — из ceilingTypes[вид].section */
  section: string;
}

/** Визуализации вида потолка: комната на всю ширину, под ней «в разрезе» и «вблизи». По нажатию открываются на весь экран */
export default function Renders({ room, cut, close, section }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const list = [room, cut, close].filter((w): w is Work => Boolean(w));
  const show = (w: Work, sizes: string, cls: string, label?: string, text?: string) => (
    <button type="button" className={cls} onClick={() => setOpen(list.indexOf(w))} aria-label={`Открыть: ${w.caption}`}>
      <img src={w.thumb.src} srcSet={w.thumb.srcset} sizes={sizes} width={w.thumb.width} height={w.thumb.height} alt={w.caption} loading="lazy" decoding="async" />
      {label && (
        <span>
          <strong>{label}</strong>
          {text}
        </span>
      )}
    </button>
  );

  return (
    <>
      <div className="renders">
        {room && show(room, '(min-width: 1024px) 560px, 100vw', 'render render-room')}
        <div className="renders-pair">
          {cut && show(cut, '(min-width: 1024px) 280px, 50vw', 'render', 'В разрезе', section)}
          {close && show(close, '(min-width: 1024px) 280px, 50vw', 'render', 'Вблизи')}
        </div>
        <p className="renders-note">Визуализации: так вид выглядит в интерьере и в узле крепления.</p>
      </div>
      {open !== null && <Lightbox plain list={list} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
