import { adviseCeiling, ceilingChoices, lightingChoices, lightingNone, lightingUnsure } from '../config/site';
import type { Details } from '../lib/whatsapp';

interface Props {
  id: string;
  value: Details;
  onChange: (patch: Partial<Details>) => void;
}

/** Варианты, которые нельзя сочетать с остальными: выбор такого сбрасывает прочие, и наоборот */
const exclusive = [adviseCeiling, lightingNone, lightingUnsure];

function toggle(list: string[], item: string): string[] {
  if (list.includes(item)) return list.filter((x) => x !== item);
  return exclusive.includes(item) ? [item] : [...list.filter((x) => !exclusive.includes(x)), item];
}

/** Адрес, вид потолка и свет — всё необязательное, остальное мастер уточнит в чате. Общий для формы замера и калькулятора */
export default function ObjectDetails({ id, value, onChange }: Props) {
  return (
    <>
      <div>
        <label htmlFor={`${id}-address`} className="label">
          Точный адрес
        </label>
        <input
          id={`${id}-address`}
          className="field"
          autoComplete="street-address"
          placeholder="Улица, дом, квартира"
          maxLength={120}
          value={value.address}
          onChange={(e) => onChange({ address: e.target.value })}
        />
      </div>

      <fieldset>
        <legend className="label">Какой потолок хотите</legend>
        <div className="flex flex-wrap gap-2">
          {ceilingChoices.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={value.ceilings.includes(c)} onClick={() => onChange({ ceilings: toggle(value.ceilings, c) })}>
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Свет</legend>
        <div className="flex flex-wrap gap-2">
          {lightingChoices.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={value.lighting.includes(c)} onClick={() => onChange({ lighting: toggle(value.lighting, c) })}>
              {c}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}
