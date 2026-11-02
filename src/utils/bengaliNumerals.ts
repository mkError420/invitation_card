/**
 * Utility functions for Bengali numeral conversions
 */

const EN_TO_BN_MAP: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

const BN_TO_EN_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

export function toBengaliNumber(val: string | number): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  return str.replace(/[0-9]/g, (digit) => EN_TO_BN_MAP[digit] || digit);
}

export function toEnglishNumber(val: string): string {
  if (!val) return '';
  return val.replace(/[০-৯]/g, (digit) => BN_TO_EN_MAP[digit] || digit);
}
