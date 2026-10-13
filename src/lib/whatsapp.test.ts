import { describe, expect, it } from 'vitest';
import { buildCalcMessage, buildLikeMessage, buildMeasureMessage, emptyContact, waLink, workUrl } from './whatsapp';

const contact = { ...emptyContact, name: 'Магомед', city: 'Хасавюрт', when: 'В выходные' };

describe('заказ и запись на замер', () => {
  it('содержит контакты, полотно и комментарий', () => {
    const text = buildMeasureMessage({ ...contact, canvas: 'BAUF', comment: 'Три комнаты' });
    expect(text.startsWith('السلام عليكم ورحمة الله وبركاته\n')).toBe(true);
    expect(text).toContain('Хочу заказать натяжной потолок, выбрал полотно BAUF (650–700 ₽/м²).');
    expect(text).toContain('Меня зовут Магомед.');
    expect(text).toContain('Город: Хасавюрт.');
    expect(text).toContain('Замер удобно: в выходные.');
    expect(text).toContain('Что нужно: Три комнаты');
  });

  it('без выбранного полотна — запись на замер, просит совет', () => {
    const text = buildMeasureMessage({ ...emptyContact, city: 'Кизляр' });
    expect(text.startsWith('السلام عليكم ورحمة الله وبركاته\n')).toBe(true);
    expect(text).toContain('Хочу записаться на бесплатный замер, полотно — посоветуйте.');
  });

  it('добавляет адрес, вид потолка и свет', () => {
    const text = buildMeasureMessage({
      ...contact,
      address: 'ул. Амирханова, 12, кв. 4',
      ceilings: ['Парящий', 'Световые линии'],
      lighting: ['Точечные светильники', 'Люстра'],
    });
    expect(text).toContain('Адрес: ул. Амирханова, 12, кв. 4.');
    expect(text).toContain('Вид потолка: парящий, световые линии.');
    expect(text).toContain('Свет: точечные светильники, люстра.');
  });

  it('не пишет пустые поля', () => {
    const text = buildMeasureMessage({ ...emptyContact, city: 'Кизляр' });
    expect(text).not.toContain('Меня зовут');
    expect(text).not.toContain('Замер удобно');
    expect(text).not.toContain('Что нужно:');
    expect(text).not.toContain('Адрес');
    expect(text).not.toContain('Вид потолка');
    expect(text).not.toContain('Свет');
  });

  it('убирает символы форматирования из текста клиента', () => {
    const text = buildMeasureMessage({ ...emptyContact, name: '_Али_', comment: '*срочно*' });
    expect(text).toContain('Меня зовут Али.');
    expect(text).toContain('Что нужно: срочно');
  });
});

describe('ссылки', () => {
  it('кодирует текст для wa.me', () => {
    const link = waLink('Привет & пока\nновая строка');
    expect(link.startsWith('https://wa.me/79285983432?text=')).toBe(true);
    expect(decodeURIComponent(link.split('text=')[1])).toBe('Привет & пока\nновая строка');
  });

  it('ссылка на работу ведёт на главную', () => {
    expect(workUrl('v-898', 'https://santlada.ru/')).toBe('https://santlada.ru/#v-898');
  });

  it('«Хочу такой потолок» с подписью и ссылкой', () => {
    const text = buildLikeMessage('Парящий потолок в ванной', 'w-530', 'https://santlada.ru');
    expect(text.startsWith('السلام عليكم ورحمة الله وبركاته\n')).toBe(true);
    expect(text).toContain('«Парящий потолок в ванной»');
    expect(text).toContain('https://santlada.ru/#w-530');
  });
});

describe('расчёт с сайта', () => {
  it('по размерам комнаты — точно по шаблону', () => {
    const text = buildCalcMessage({ width: 3.5, length: 4.5, area: 15.8, canvas: 'MSD Premium', total: 7110, city: 'Хасавюрт' });
    expect(text).toBe(
      'السلام عليكم ورحمة الله وبركاته\nПишу с сайта SANTLADA. Посчитал потолок: комната ~3,5×4,5 м (15,8 м²), выбрал полотно MSD Premium. По расчёту на сайте — от 7 110 ₽ за полотно. Город: Хасавюрт. Хочу записаться на замер.',
    );
  });

  it('с фактурой полотна', () => {
    const base = { area: 20, canvas: 'BAUF', total: 9000, city: 'Кизляр' };
    expect(buildCalcMessage({ ...base, finish: 'Глянец' })).toContain('выбрал полотно BAUF, глянец.');
    expect(buildCalcMessage({ ...base, finish: 'Сатин' })).toContain('выбрал полотно BAUF, сатин.');
  });

  it('с адресом, видом потолка и светом — перед просьбой о замере', () => {
    const text = buildCalcMessage({
      area: 20,
      canvas: 'BAUF',
      total: 9000,
      city: 'Кизляр',
      address: 'ул. Мира, 5',
      ceilings: ['Теневой'],
      lighting: ['Без света'],
    });
    expect(text).toContain('Город: Кизляр. Адрес: ул. Мира, 5. Вид потолка: теневой. Свет: без света. Хочу записаться на замер.');
  });

  it('по площади и без выбранного полотна', () => {
    const text = buildCalcMessage({ area: 20, canvas: '', total: 9000, city: 'Кизляр' });
    expect(text).toContain('комната ~20 м²,');
    expect(text).toContain('полотно — посоветуйте');
    expect(text).toContain('от 9 000 ₽ за полотно');
    expect(text.startsWith('السلام عليكم ورحمة الله وبركاته\n')).toBe(true);
  });
});
