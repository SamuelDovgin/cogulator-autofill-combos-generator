import { describe, expect, it } from 'vitest';

import { GAGS } from '../src/data/gagsInfo';
import type { GagInfo } from '../src/types';
import type { DamageResult } from '../src/utils/calculatorUtils';
import {
  calculateCogHealth,
  calculateTotalDamage,
} from '../src/utils/calculatorUtils';

describe('calculateCogHealth', () => {
  it('should be greater than 0', () => {
    expect(() => calculateCogHealth(0)).toThrowError();
  });

  it('should work 1-11', () => {
    expect(calculateCogHealth(1)).toBe(6);
    expect(calculateCogHealth(11)).toBe(156);
  });

  it('should work 12+', () => {
    expect(calculateCogHealth(12)).toBe(196);
    expect(calculateCogHealth(13)).toBe(224);
  });
});

function expectDamages(result: DamageResult, expectedResult: DamageResult) {
  it('base damage', () => {
    expect(result.baseDamage).toBe(expectedResult.baseDamage);
  });

  it('group bonus', () => {
    expect(result.groupBonus).toBe(expectedResult.groupBonus);
  });

  it('lure bonus', () => {
    expect(result.lureBonus).toBe(expectedResult.lureBonus);
  });

  it('total damage', () => {
    expect(result.totalDamage).toBe(expectedResult.totalDamage);
  });
}

function organic(gag: GagInfo): GagInfo {
  return { ...gag, isOrganic: true };
}

describe('lure, tnt, sound x2', () => {
  const gags = [
    GAGS.TenDollarBill,
    GAGS.TNT,
    GAGS.ElephantTrunk,
    GAGS.ElephantTrunk,
  ];
  const result = calculateTotalDamage(gags);
  expectDamages(result, {
    baseDamage: 222,
    groupBonus: 9,
    lureBonus: 0,
    totalDamage: 231,
  });
});

describe('lure, drop', () => {
  const gags = [GAGS.TenDollarBill, GAGS.GrandPiano];
  const result = calculateTotalDamage(gags);
  expectDamages(result, {
    baseDamage: 0,
    groupBonus: 0,
    lureBonus: 0,
    totalDamage: 0,
  });
});

describe('lure, throw, squirt', () => {
  const gags = [GAGS.TenDollarBill, GAGS.WholeCreamPie, GAGS.FireHose];
  const result = calculateTotalDamage(gags);
  expectDamages(result, {
    baseDamage: 70,
    groupBonus: 0,
    lureBonus: 20,
    totalDamage: 90,
  });
});

describe('lure, sound, throw', () => {
  const gags = [GAGS.TenDollarBill, GAGS.BikeHorn, GAGS.Cupcake];
  const result = calculateTotalDamage(gags);
  expectDamages(result, {
    baseDamage: 10,
    groupBonus: 0,
    lureBonus: 0,
    totalDamage: 10,
  });
});

describe('organic throw', () => {
  const gags = [organic(GAGS.BirthdayCake)];
  const result = calculateTotalDamage(gags);
  expectDamages(result, {
    baseDamage: 110,
    groupBonus: 0,
    lureBonus: 0,
    totalDamage: 110,
  });
});

describe('lure, organic throw', () => {
  const gags = [GAGS.TenDollarBill, organic(GAGS.BirthdayCake)];
  const result = calculateTotalDamage(gags);
  expectDamages(result, {
    baseDamage: 110,
    groupBonus: 0,
    lureBonus: 55,
    totalDamage: 165,
  });
});

describe('multiple trap', () => {
  const gags = [GAGS.Rake, GAGS.Trapdoor, GAGS.Quicksand, GAGS.TenDollarBill];
  const result = calculateTotalDamage(gags);
  expectDamages(result, {
    baseDamage: 20,
    groupBonus: 0,
    lureBonus: 0,
    totalDamage: 20,
  });
});

describe('multiple group', () => {
  const gags = [
    GAGS.WholeCreamPie,
    GAGS.WholeCreamPie,
    GAGS.FireHose,
    GAGS.FireHose,
  ];
  const result = calculateTotalDamage(gags);
  expectDamages(result, {
    baseDamage: 140,
    groupBonus: 28,
    lureBonus: 0,
    totalDamage: 168,
  });
});
