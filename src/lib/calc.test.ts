import { describe, expect, it } from 'vitest';
import { canvases } from '../config/canvases';
import { needsSeam, parseNum, pricePerM2, rollOf, roundArea, surchargeOf } from './calc';

const byId = (id: string) => canvases.find((c) => c.id === id);

describe('калькулятор полотна', () => {
  it('цена и рулон берутся из данных полотен', () => {
    expect(pricePerM2(byId('msd'))).toBe(450);
    expect(pricePerM2(byId('teqtum'))).toBe(1200);
    expect(pricePerM2()).toBe(450);
  });

  it('цена зависит от фактуры: матовое дешевле сатина и глянца', () => {
    expect(pricePerM2(byId('msd'), 'matte')).toBe(450);
    expect(pricePerM2(byId('msd'), 'satin')).toBe(500);
    expect(pricePerM2(byId('msd'), 'gloss')).toBe(500);
    expect(pricePerM2(undefined, 'gloss')).toBe(500);
    expect(pricePerM2(byId('bauf'), 'matte')).toBe(650);
    expect(pricePerM2(byId('bauf'), 'satin')).toBe(700);
    expect(pricePerM2(byId('bauf'), 'gloss')).toBe(700);
    // Недоступная фактура — цена полотна

    expect(pricePerM2(byId('teqtum'), 'gloss')).toBe(1200);
  });

  it('рулон берётся из данных полотен', () => {
    expect(rollOf(byId('msd'))).toBe(5.5);
    expect(rollOf(byId('teqtum'))).toBe(4.5);
    expect(rollOf(byId('bauf'))).toBe(5.5);
  });

  it('шов — если ширина комнаты больше ширины рулона', () => {
    expect(needsSeam(5.5, 5.5)).toBe(false);
    expect(needsSeam(5.6, 5.5)).toBe(true);
    expect(needsSeam(4.6, 4.5)).toBe(true);
  });

  it('надбавка 50 ₽/м², если одна из сторон от 5 м', () => {
    expect(surchargeOf(4.9, 4.9)).toBe(0);
    expect(surchargeOf(5, 3)).toBe(50);
    expect(surchargeOf(3, 5.2)).toBe(50);
    expect(surchargeOf(6, 6)).toBe(50);
  });

  it('площадь до десятых и запятая в полях', () => {
    expect(roundArea(3.5 * 4.5)).toBe(15.8);
    expect(parseNum('3,5')).toBe(3.5);
    expect(parseNum(' 4.25 ')).toBe(4.25);
    expect(parseNum('abc')).toBeNaN();
    expect(parseNum('')).toBeNaN();
  });
});
