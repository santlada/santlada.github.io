import { startTransition, useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type Ref } from 'react';
import { finishNames, priceOf, type CanvasInfo, type Finish, type Scene, type SceneKind } from '../config/canvases';
import { openOrder, showCanvas } from '../lib/order';
import FanRoom from './canvas/FanRoom';
import { num, reduced } from './canvas/format';
import Micrometer from './canvas/Micrometer';
import { useLamp } from './canvas/useLamp';
import { IconChevronLeft, IconChevronRight } from './icons';

/*
 * «Полотна и цены» — история из сцен: по кусочку полотна скользит блик лампы, толщину меряет микрометр,
 * веер образцов перекрашивает потолок. Действие сцены — CSS-переходы
 * по transform и opacity на пружинных кривых, доигрывают сами; при прокрутке назад сцена так же возвращается.
 *
 * И на компьютере, и на телефоне одинаково: карточка стоит на месте (sticky), а прокрутка страницы снизу вверх
 * переключает сцены. Номер сцены определяет не обработчик прокрутки, а IntersectionObserver: под карточкой лежат
 * невидимые «ступеньки» (по одной на сцену), и та, что пересекает середину экрана, — текущая. Так при прокрутке
 * скрипт ничего не считает и не мерит, страница не дёргается; новая сцена просто запускает CSS-переход.
 * Полотна листаются вкладками, стрелками или горизонтальным свайпом по картинке; сцена при этом остаётся той же —
 * например, микрометр перемеряет новое полотно.
 * Сцены и тексты — в src/config/canvases.ts, рисунки — в ./canvas/, анимации — в global.css (раздел «Полотна: история»).
 */

const rub = new Intl.NumberFormat('ru-RU').format;

/** Кусочек полотна: лицевая сторона (фактура, блик лампы) и четыре торца */
function Swatch({ finish, mark, face }: { finish: Finish; mark?: string; face: Ref<HTMLDivElement> }) {
  return (
    <div className="cs-swatch">
      <div className="cs-top" data-finish={finish} ref={face}>
        {/* Маркировка — под светом: блик и тень от лампы ложатся и на неё */}
        {mark && (
          <span className="cs-mark" aria-hidden="true">
            {Array.from({ length: 8 }, () => mark).join('   ')}
            <i className="cs-mark-cover" />
          </span>
        )}
        <i className="cs-grain" />
        <i className="cs-grain-plaster" />
        <i className="cs-refl" />
        <i className="cs-lamp">
          <i className="cs-lamp-m" />
          <i className="cs-lamp-s" />
          <i className="cs-lamp-g" />
        </i>
        <i className="cs-ripple" />
        <i className="cs-glow" />
      </div>
      <i className="cs-edge cs-edge-b" />
      <i className="cs-edge cs-edge-t" />
      <i className="cs-edge cs-edge-l" />
      <i className="cs-edge cs-edge-r" />
    </div>
  );
}

const kindsWithSwatch: SceneKind[] = ['look', 'thickness', 'opacity', 'marking', 'fire'];

/** Натянутая мембрана: полотно чуть вздрагивает и успокаивается, по нему пробегает волна */
const WOBBLE: Keyframe[] = [
  { transform: 'scale3d(1, 1, 1)' },
  { transform: 'scale3d(1.04, 0.965, 1)' },
  { transform: 'scale3d(0.975, 1.024, 1)' },
  { transform: 'scale3d(1.014, 0.99, 1)' },
  { transform: 'scale3d(0.994, 1.005, 1)' },
  { transform: 'scale3d(1.002, 0.999, 1)' },
  { transform: 'scale3d(1, 1, 1)' },
];

/** Картинка-сцена: при смене сцены кусочек полотна переходит в новое положение, а слои появляются по очереди */
function Stage({ c, finish, scene, appear, art }: { c: CanvasInfo; finish: Finish; scene: Scene; appear: number; art: boolean }) {
  const [ready, setReady] = useState(false);
  const face = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Сначала кадр в исходном положении, потом сцена — чтобы анимация входа сыграла и при смене полотна
    let r2 = 0;
    const r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(() => setReady(true))));
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);

  // Полотно появилось на экране (или сменилось) — оно вздрагивает, как натянутая мембрана
  useEffect(() => {
    const el = face.current;
    if (!ready || scene.kind !== 'look' || !el?.animate || reduced()) return;
    const a = el.animate(WOBBLE, { duration: 1300, delay: 350, easing: 'ease-in-out' });
    const r = el.querySelector('.cs-ripple')?.animate(
      [
        { transform: 'scale(0.15)', opacity: 0.9 },
        { transform: 'scale(1.9)', opacity: 0 },
      ],
      { duration: 1200, delay: 350, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
    );
    return () => {
      a.cancel();
      r?.cancel();
    };
  }, [ready, appear]); // eslint-disable-line react-hooks/exhaustive-deps -- сцену берём на момент появления

  const kinds = new Set(c.scenes.map((s) => s.kind));
  const fire = c.scenes.find((s) => s.kind === 'fire');
  const active = ready ? scene.kind : undefined;
  const look = active === 'look';

  return (
    <div className="cs-stage" data-scene={active} data-swatch={active && kindsWithSwatch.includes(active) ? '' : undefined} style={{ '--sw': c.tone } as CSSProperties}>
      <i className="cs-shadow" />
      <div
        className="cs-float"
        role={look ? 'img' : undefined}
        aria-label={look ? `Образец полотна ${c.name}, ${finishNames[finish].name.toLowerCase()}: ${finishNames[finish].hint}` : undefined}
        aria-hidden={look ? undefined : true}
      >
        <Swatch finish={finish} mark={kinds.has('marking') ? c.name : undefined} face={face} />
      </div>

      {art && kinds.has('palette') && c.colors && <FanRoom colors={c.colors} finish={finish} active={active === 'palette'} />}

      {kinds.has('opacity') && (
        <div className="cs-op" aria-hidden="true">
          <div className="cs-op-thin">
            <i className="cs-op-wire" />
            <i className="cs-op-lamp" />
          </div>
          <span className="cs-op-label cs-op-label-l">Тонкая плёнка</span>
          <span className="cs-op-label cs-op-label-r">{c.name}</span>
        </div>
      )}

      {kinds.has('marking') && (
        <div className="cs-loupe" aria-hidden="true">
          <span>{c.name}</span>
        </div>
      )}

      {fire && (
        <div className="cs-fire" aria-hidden="true">
          <div className="cs-flame">
            <i />
            <i />
            <i />
          </div>
          <span className="cs-nodrops">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
              <path d="m4 4 16 16" />
            </svg>
            без горящих капель
          </span>
        </div>
      )}
    </div>
  );
}

/** Крупная цифра сцены: «около 0,18 мм», «Bs1d0» */
function SceneValue({ scene }: { scene: Scene }) {
  if (scene.badge) return <p className="cs-value">{scene.badge}</p>;
  if (scene.kind === 'thickness' && scene.value)
    return (
      <p className="cs-value">
        {scene.approx && <small>около </small>}
        {num(scene.value)} мм
      </p>
    );
  return null;
}

export default function CanvasStory({ items }: { items: CanvasInfo[] }) {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [finish, setFinish] = useState<Record<string, Finish>>({});
  const [appear, setAppear] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const rungs = useRef<(HTMLDivElement | null)[]>([]);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const steps = Math.max(...items.map((c) => c.scenes.length));
  const last = items.length - 1;

  const c = items[index];
  const current = Math.min(step, c.scenes.length - 1);
  const scene = c.scenes[current];
  const currentFinish = finish[c.id] ?? c.finishes[0];
  const thickness = c.scenes.find((s) => s.kind === 'thickness');

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(last, i))), [last]);

  useLamp(visual, scene.kind === 'look', c.id);

  // Рисунки следующих сцен (микрометр, комната) — сотни SVG-элементов. Чтобы не утяжелять загрузку страницы,
  // подключаем их, когда браузер освободится, с низким приоритетом (React отдаёт работу кусочками), — или сразу,
  // если человек уже долистал дальше первой сцены.
  const [art, setArt] = useState(false);
  useEffect(() => {
    if (art) return;
    if (step > 0) return setArt(true);
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => startTransition(() => setArt(true)), { timeout: 2500 });
    return () => cancel(id);
  }, [art, step]);

  // Прокрутка → номер сцены. Ступенька, которая пересекает середину экрана, — текущая сцена.
  // Сама анимация сцены — CSS-переходы, они доигрывают до конца без скрипта.
  useEffect(() => {
    const els = rungs.current.filter((el): el is HTMLDivElement => !!el);
    if (!els.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        // Быстрый взмах пальца может принести сразу несколько записей — берём самую дальнюю из пересёкших линию
        let pick = -1;
        for (const e of entries) if (e.isIntersecting) pick = Math.max(pick, els.indexOf(e.target as HTMLDivElement));
        if (pick < 0) return;
        setStep(pick);
        if (pick > 0) scroller.current?.setAttribute('data-started', '');
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [steps]);

  // Картинка вышла на экран больше чем наполовину — полотно «вздрагивает». Снова — только после того, как ушла совсем.
  useEffect(() => {
    const el = visual.current;
    if (!el || !('IntersectionObserver' in window)) return;
    let armed = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (armed && e.intersectionRatio >= 0.55) {
          armed = false;
          setAppear((n) => n + 1);
        } else if (!e.isIntersecting) armed = true;
      },
      { threshold: [0, 0.55] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Пока страница прокручивается, держим на <html> метку data-scrolling — CSS на это время замораживает
  // бесконечные анимации (иначе на iPhone картинка мелко дрожит). Слушатель только переключает метку.
  useEffect(() => {
    const root = document.documentElement;
    let timer = 0;
    const onScroll = () => {
      if (!root.hasAttribute('data-scrolling')) root.setAttribute('data-scrolling', '');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => root.removeAttribute('data-scrolling'), 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
      root.removeAttribute('data-scrolling');
    };
  }, []);

  // Пока история на экране, нижняя панель телефона заказывает показанное полотно
  const inView = useRef(false);
  const shownName = useRef(c.name);
  shownName.current = c.name;
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const io = new IntersectionObserver(([e]) => {
      inView.current = e.isIntersecting;
      showCanvas(e.isIntersecting ? shownName.current : null);
    });
    io.observe(box);
    return () => {
      io.disconnect();
      showCanvas(null);
    };
  }, []);
  useEffect(() => {
    if (inView.current) showCanvas(c.name);
  }, [c.name]);

  // Нажатие на шаг прокручивает страницу так, чтобы ступенька этой сцены встала на середину экрана
  const toStep = (i: number) => {
    const el = rungs.current[i];
    if (!el) return;
    const box = el.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + box.top + box.height / 2 - window.innerHeight / 2,
      behavior: reduced() ? 'instant' : 'smooth',
    });
  };

  // Горизонтальный свайп по картинке — другое полотно (вертикальный жест остаётся прокруткой страницы)
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button, a')) return;
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - d.y) * 1.2) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div ref={scroller} className="cs-scroller" style={{ '--steps': steps } as CSSProperties}>
      {/* Невидимые ступеньки — по одной на сцену; их пересечение с серединой экрана переключает сцену */}
      <div className="cs-rungs" aria-hidden="true">
        {Array.from({ length: steps }, (_, i) => (
          <div key={i} ref={(el) => void (rungs.current[i] = el)} className="cs-rung" style={{ '--i': i } as CSSProperties} />
        ))}
      </div>
      <div className="cs-pin">
        <div className="container-page cs-wrap">
          <div className="cs-card">
            <div ref={visual} className="cs-visual" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)}>
              <Stage key={c.id} c={c} finish={currentFinish} scene={scene} appear={appear} art={art} />
              {/* Микрометр общий для всех полотен: при смене полотна он не пропадает, а перемеряет */}
              {art && thickness?.value && (
                <Micrometer
                  value={thickness.value}
                  approx={thickness.approx}
                  id={c.id}
                  name={c.name}
                  tone={c.tone}
                  active={scene.kind === 'thickness'}
                />
              )}

              <div className="cs-tabs" role="group" aria-label="Выбор полотна">
                {items.map((it, i) => (
                  <button key={it.id} type="button" className="chip" aria-pressed={i === index} onClick={() => go(i)}>
                    {it.name}
                  </button>
                ))}
              </div>
              <div className="cs-arrows">
                <button type="button" className="cs-arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Предыдущее полотно">
                  <IconChevronLeft size={20} />
                </button>
                <button type="button" className="cs-arrow" onClick={() => go(index + 1)} disabled={index === last} aria-label="Следующее полотно">
                  <IconChevronRight size={20} />
                </button>
              </div>
              {c.badge && <span className="canvas-badge cs-badge">{c.badge}</span>}
              <p className="cs-swipehint" aria-hidden="true">
                <i />
                Листайте вниз
              </p>
            </div>

            <div className="cs-info">
              <div className="cs-head" key={`head-${c.id}`}>
                <div className="min-w-0">
                  <p className="cs-origin">{c.origin}</p>
                  <h3 className="cs-name">
                    {c.name}
                    <span>{c.nameRu}</span>
                  </h3>
                </div>
                <p className="cs-price">
                  <b>{rub(priceOf(c, currentFinish))} ₽</b>
                  <span>за м²</span>
                </p>
              </div>

              <ol className="cs-steps" aria-label="Что показать про полотно" key={`steps-${c.id}`}>
                {c.scenes.map((s, i) => (
                  <li key={s.kind}>
                    <button
                      type="button"
                      aria-current={i === current ? 'step' : undefined}
                      data-done={i < current || undefined}
                      onClick={() => toStep(i)}
                    >
                      <span className="sr-only">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ol>

              {/* Все сцены лежат друг на друге: высота карточки не прыгает при смене сцены */}
              <div className="cs-scenes" key={`scenes-${c.id}`} aria-live="polite">
                {c.scenes.map((s, i) => (
                  <div
                    key={s.kind}
                    className="cs-scene"
                    data-current={i === current || undefined}
                    data-before={i < current || undefined}
                    aria-hidden={i !== current || undefined}
                  >
                    <p className="cs-kicker">
                      {String(i + 1).padStart(2, '0')} / {String(c.scenes.length).padStart(2, '0')}
                    </p>
                    <h4 className="cs-title">{s.title}</h4>
                    <SceneValue scene={s} />
                    <p className="cs-text">{s.text}</p>

                    {s.kind === 'look' && (
                      <div className="cs-finishes">
                        {c.finishes.length > 1 ? (
                          <div className="flex flex-wrap gap-2" role="group" aria-label="Фактура">
                            {c.finishes.map((f) => (
                              <button
                                key={f}
                                type="button"
                                className="chip cs-chip"
                                aria-pressed={f === currentFinish}
                                tabIndex={i === current ? undefined : -1}
                                onClick={() => setFinish((prev) => ({ ...prev, [c.id]: f }))}
                              >
                                {finishNames[f].name}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <p className="cs-hint">
                          <b>{finishNames[currentFinish].name}</b> — {finishNames[currentFinish].hint}
                        </p>
                      </div>
                    )}

                  </div>
                ))}
              </div>

              <div className="cs-actions">
                <button type="button" className="btn-primary btn-shine flex-1 sm:flex-none sm:px-7" onClick={() => openOrder(c.name)}>
                  Заказать это полотно
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
