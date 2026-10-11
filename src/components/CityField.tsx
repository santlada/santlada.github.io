import { useState, type Ref } from 'react';
import { site } from '../config/site';

const OTHER = '__other';

interface Props {
  id: string;
  value: string;
  onChange: (city: string) => void;
  /** Текст ошибки под полем (пусто — ошибки нет) */
  error?: string;
  selectRef?: Ref<HTMLSelectElement>;
}

/** Город из списка site.cities или свой — «Другой город или село». Общий для формы замера и калькулятора */
export default function CityField({ id, value, onChange, error, selectRef }: Props) {
  const [other, setOther] = useState(false);
  const listed = site.cities.includes(value);
  const selected = listed ? value : other || value ? OTHER : '';

  return (
    <div>
      <label htmlFor={id} className="label">
        Город или район
      </label>
      <select
        id={id}
        ref={selectRef}
        className="field select-field"
        value={selected}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          const isOther = e.target.value === OTHER;
          setOther(isOther);
          onChange(isOther ? '' : e.target.value);
        }}
      >
        <option value="" disabled>
          Выберите из списка
        </option>
        {site.cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={OTHER}>Другой город или село</option>
      </select>
      {selected === OTHER && (
        <input
          className="field mt-2"
          placeholder="Название города или села"
          aria-label="Название города или села"
          value={listed ? '' : value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[0.875rem] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
