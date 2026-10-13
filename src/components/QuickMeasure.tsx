import { useId, useRef, useState } from 'react';
import { canvases } from '../config/canvases';
import { measureTimes } from '../config/site';
import { buildMeasureMessage, emptyContact, waLink, type Contact } from '../lib/whatsapp';
import CityField from './CityField';
import ObjectDetails from './ObjectDetails';
import { IconWhatsApp } from './icons';

interface Props {
  /** Полотно, выбранное в каталоге */
  canvas?: string;
  /** Полотно уже выбрано в каталоге — выбор полотна в форме не показываем */
  locked?: boolean;
}

/** Заказ полотна и запись на замер — заявка уходит мастеру в WhatsApp */
export default function QuickMeasure({ canvas = '', locked = false }: Props) {
  const uid = useId();
  const [contact, setContact] = useState<Contact>({ ...emptyContact, canvas });
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const set = (patch: Partial<Contact>) => setContact((c) => ({ ...c, ...patch }));
  // Окно заказа из блока полотен отправляет заказ, форма в контактах — запись на замер
  const ordering = locked && Boolean(contact.canvas);

  return (
    <form className="grid gap-4" onSubmit={(e) => e.preventDefault()} noValidate aria-label={ordering ? 'Заказ полотна' : 'Запись на бесплатный замер'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <CityField
          id={`${uid}-city`}
          value={contact.city}
          error={error}
          selectRef={selectRef}
          onChange={(city) => {
            setError('');
            set({ city });
          }}
        />
        <div>
          <label htmlFor={`${uid}-name`} className="label">
            Как к вам обращаться
          </label>
          <input
            id={`${uid}-name`}
            className="field"
            autoComplete="given-name"
            placeholder="Имя"
            maxLength={60}
            value={contact.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
      </div>

      <ObjectDetails id={uid} value={contact} onChange={set} />

      <fieldset>
        <legend className="label">Когда удобно на замер</legend>
        <div className="flex flex-wrap gap-2">
          {measureTimes.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={contact.when === t} onClick={() => set({ when: contact.when === t ? '' : t })}>
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      {!locked && (
        <fieldset>
          <legend className="label">Полотно</legend>
          <div className="flex flex-wrap gap-2">
            {canvases.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={contact.canvas === c.name} onClick={() => set({ canvas: contact.canvas === c.name ? '' : c.name })}>
                {c.name}
              </button>
            ))}
            <button type="button" className="chip" aria-pressed={contact.canvas === ''} onClick={() => set({ canvas: '' })}>
              Посоветуйте
            </button>
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor={`${uid}-comment`} className="label">
          Что нужно сделать
        </label>
        <textarea
          id={`${uid}-comment`}
          className="field min-h-[5.5rem] resize-y"
          placeholder="Например, две комнаты и кухня. Фото понравившегося потолка можно прислать в чате"
          maxLength={600}
          value={contact.comment}
          onChange={(e) => set({ comment: e.target.value })}
        />
      </div>

      <a
        href={waLink(buildMeasureMessage(contact))}
        target="_blank"
        rel="noopener"
        className="btn-wa w-full text-[1rem] sm:w-auto sm:justify-self-start"
        onClick={(e) => {
          if (!contact.city.trim()) {
            e.preventDefault();
            setError('Выберите город — так я пойму, куда ехать на замер.');
            selectRef.current?.focus();
            return;
          }
          setSent(true);
        }}
      >
        <IconWhatsApp size={20} />
        {ordering ? 'Отправить заказ мастеру' : 'Записаться на замер'}
      </a>
      {sent && (
        <p className="text-[0.9375rem] text-ink-soft" role="status">
          Открыли WhatsApp с текстом {ordering ? 'заказа' : 'заявки'}. Нажмите «Отправить» в чате — заявка придёт мне, и, если есть фото потолка, который понравился, приложите его. Размеры, цвета и детали обсудим в чате — я отвечу и договорюсь с вами о времени.
        </p>
      )}
    </form>
  );
}
