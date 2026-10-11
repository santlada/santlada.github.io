import { describe, expect, it } from 'vitest';
import { buildCalcMessage, buildLikeMessage, buildMeasureMessage, emptyContact, waLink, workUrl } from './whatsapp';

const contact = { ...emptyContact, name: 'Магомед', city: 'Хасавюрт', when: 'В выходные' };

describe('заказ и запись на замер', () => {
  it('содержит контакты, полотно и комментарий', () => {
    const text = buildMeasureMessage({ ...contact, canvas: 'BAUF', comment: 'Три комнаты' });
    expect(text).toContain('*Заказ натяжного потолка — SANTLADA*');
    expect(text).toContain('Имя: Магомед');
    expect(text).toContain('Адрес: Хасавюрт');
    expect(text).toContain('Замер: в выходные');
    expect(text).toContain('Полотно: BAUF, 650 ₽/м²');
    expect(text).toContain('Что нужно: Три комнаты');
  });

  it('без выбранного полотна — запись на замер, просит совет', () => {
    const text = buildMeasureMessage({ ...emptyContact, city: 'Кизляр' });
    expect(text).toContain('*Запись на бесплатный замер — SANTLADA*');
    expect(text).toContain('Полотно: посоветуйте');
  });

  it('не пишет пустые поля', () => {
    const text = buildMeasureMessage({ ...emptyContact, city: 'Кизляр' });
    expect(text).not.toContain('Имя:');
    expect(text).not.toContain('Замер:');
    expect(text).not.toContain('Что нужно:');
  });

  it('убирает символы форматирования из текста клиента', () => {
    const text = buildMeasureMessage({ ...emptyContact, name: '_Али_', comment: '*срочно*' });
    expect(text).toContain('Имя: Али');
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
    expect(text).toContain('«Парящий потолок в ванной»');
    expect(text).toContain('https://santlada.ru/#w-530');
  });
});

describe('расчёт с сайта', () => {
  it('по размерам комнаты — точно по шаблону', () => {
    const text = buildCalcMessage({ width: 3.5, length: 4.5, area: 15.8, canvas: 'MSD Premium', total: 7110, city: 'Хасавюрт' });
    expect(text).toBe(
      'Расчёт с сайта: комната ~3,5×4,5 м (15,8 м²), полотно MSD Premium, ориентир от 7 110 ₽ за полотно, город Хасавюрт. Хочу записаться на замер.',
    );
  });

  it('по площади и без выбранного полотна', () => {
    const text = buildCalcMessage({ area: 20, canvas: '', total: 9000, city: 'Кизляр' });
    expect(text).toContain('комната ~20 м²,');
    expect(text).toContain('полотно — посоветуйте');
    expect(text).toContain('от 9 000 ₽ за полотно');
  });
});
