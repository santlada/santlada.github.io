import { useState } from 'react';
import type { Work } from '../../lib/works';
import { Lightbox } from './WorksGallery';

/** Фото вида потолка с других ракурсов: две плитки под схемой, по нажатию открываются на весь экран */
export default function Angles({ works }: { works: Work[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <ul className="angles" aria-label="Фото с других ракурсов">
        {works.map((w, i) => (
          <li key={w.id}>
            <button type="button" className="angle" onClick={() => setOpen(i)} aria-label={`Открыть фото: ${w.caption}`}>
              <img
                src={w.thumb.src}
                srcSet={w.thumb.srcset}
                sizes="(min-width: 1024px) 260px, 45vw"
                width={w.thumb.width}
                height={w.thumb.height}
                alt={w.caption}
                loading="lazy"
                decoding="async"
              />
              <span>{w.caption}</span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox plain list={works} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
