import { useEffect, useState } from 'react';
import { navLinks, site } from '../config/site';
import { CANVAS_EVENT, openOrder } from '../lib/order';
import { helloMessage, waLink } from '../lib/whatsapp';
import { IconArrowUp, IconClose, IconMenu, IconPhone, IconWhatsApp } from './icons';

/**
 * Нижняя панель на телефоне (меню, WhatsApp, запись на замер), кнопка «наверх» и круглая кнопка WhatsApp на компьютере.
 * Пока на экране блок «Полотна и цены», главная кнопка заказывает показанное полотно
 * (в карточке полотна на телефоне своей кнопки нет — там всё место отдано картинке).
 */
export default function MobileBar() {
  const wa = waLink(helloMessage);
  const [canvas, setCanvas] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    const on = (e: Event) => setCanvas((e as CustomEvent<{ canvas: string | null }>).detail.canvas);
    window.addEventListener(CANVAS_EVENT, on);
    return () => window.removeEventListener(CANVAS_EVENT, on);
  }, []);

  // «Наверх» появляется, когда страница прокручена больше чем на экран
  useEffect(() => {
    const sync = () => setShowTop(window.scrollY > window.innerHeight);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, []);

  // Меню закрывается по Escape и не даёт странице прокручиваться под собой
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [menu]);

  // Пока на экране прилипшая карточка полотен, «Наверх» не показываем — кнопка легла бы на ползунок и образцы
  const topVisible = showTop && !canvas;

  const toTop = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  };

  return (
    <>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Меню">
          <button type="button" className="absolute inset-0 bg-ink/50" onClick={() => setMenu(false)} aria-label="Закрыть меню" tabIndex={-1} />
          <div className="mobile-sheet absolute inset-x-0 bottom-0 rounded-t-[1.5rem] bg-plane px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-float)]">
            <div className="mb-1 flex items-center justify-between px-2">
              <p className="text-[0.9375rem] font-medium text-ink-soft">Меню</p>
              <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-haze" onClick={() => setMenu(false)} aria-label="Закрыть меню" autoFocus>
                <IconClose size={22} />
              </button>
            </div>
            <ul className="grid">
              {navLinks.map((l) => (
                <li key={l.id}>
                  <a href={`${base}#${l.id}`} className="block rounded-xl px-3 py-3.5 text-[1.125rem] font-medium hover:bg-haze" onClick={() => setMenu(false)}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2">
              <a href={wa} target="_blank" rel="noopener" className="btn-wa min-h-12">
                <IconWhatsApp size={18} />
                Написать в WhatsApp
              </a>
              <a href={`tel:+${site.phoneDigits}`} className="btn-ghost min-h-12">
                <IconPhone size={18} />
                Позвонить: {site.phone}
              </a>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toTop}
        tabIndex={topVisible ? undefined : -1}
        aria-hidden={topVisible ? undefined : true}
        aria-label="Наверх"
        className="to-top"
        data-show={topVisible || undefined}
      >
        <IconArrowUp size={22} />
      </button>

      <nav
        aria-label="Быстрые действия"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-plane px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="grid grid-cols-[auto_auto_1fr] gap-2">
          <button type="button" className="btn-ghost min-h-12 px-3.5" onClick={() => setMenu(true)} aria-label="Открыть меню" aria-haspopup="dialog">
            <IconMenu size={22} />
          </button>
          <a href={wa} target="_blank" rel="noopener" className="btn-ghost min-h-12 px-3.5" aria-label="Написать в WhatsApp">
            <IconWhatsApp size={22} className="text-wa" />
          </a>
          {canvas ? (
            <button type="button" className="btn-primary btn-shine min-h-12" onClick={() => openOrder(canvas)}>
              Заказать {canvas}
            </button>
          ) : (
            <a href={`${base}#kontakty`} className="btn-primary btn-shine min-h-12">
              Записаться на замер
            </a>
          )}
        </div>
      </nav>

      <a
        href={wa}
        target="_blank"
        rel="noopener"
        className="fixed right-6 bottom-6 z-40 hidden size-14 place-items-center rounded-full bg-wa text-white shadow-[var(--shadow-float)] transition-transform hover:scale-105 lg:grid"
        aria-label="Написать в WhatsApp"
      >
        <IconWhatsApp size={28} />
      </a>
    </>
  );
}
