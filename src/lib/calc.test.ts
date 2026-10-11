import { describe, expect, it } from 'vitest';
import { canvases } from '../config/canvases';
import { needsSeam, parseNum, pricePerM2, rollOf, roundArea } from './calc';

const byId = (id: string) => canvases.find((c) => c.id === id);

describe('калькулятор полотна', () => {
  it('цена и рулон берутся из данных полотен', () => {
    expect(pricePerM2(byId('msd'))).toBe(450);
    expect(pricePerM2(byId('teqtum'))).toBe(1200);
    expect(pricePerM2()).toBe(450);
    expect(rollOf(byId('msd'))).toBe(5.5);
    expect(rollOf(byId('teqtum'))).toBe(4.5);
    expect(rollOf(byId('bauf'))).toBe(5.5);
  });

  it('шов — если ширина комнаты больше ширины рулона', () => {
    expect(needsSeam(5.5, 5.5)).toBe(false);
    expect(needsSeam(5.6, 5.5)).toBe(true);
    expect(needsSeam(4.6, 4.5)).toBe(true);
  });

  it('площадь до десятых и запятая в полях', () => {
    expect(roundArea(3.5 * 4.5)).toBe(15.8);
    expect(parseNum('3,5')).toBe(3.5);
    expect(parseNum(' 4.25 ')).toBe(4.25);
    expect(parseNum('abc')).toBeNaN();
    expect(parseNum('')).toBeNaN();
  });
});
