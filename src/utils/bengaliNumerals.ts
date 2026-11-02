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

/**
 * Format registration number with 4-digit leading zeros in Bengali (e.g. 1 -> ০০০১, 2 -> ০০০২)
 */
export function formatRegNo(num: number | string): string {
  const cleanDigits = toEnglishNumber(String(num)).replace(/\D/g, '');
  const n = parseInt(cleanDigits, 10);
  if (isNaN(n) || n <= 0) {
    return '০০০১';
  }
  return toBengaliNumber(String(n).padStart(4, '0'));
}

/**
 * Auto-generate next registration number starting from 0001 (০০০১), 0002 (০০০২), ...
 */
export function getNextRegNo(attendees: { regNo?: string; name?: string }[]): string {
  const valid = attendees.filter((a) => (a.name || '').trim() !== '');
  let maxNum = 0;
  for (const att of valid) {
    const enDigits = toEnglishNumber(att.regNo || '').replace(/\D/g, '');
    const num = parseInt(enDigits, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  const nextNum = maxNum > 0 ? maxNum + 1 : (valid.length > 0 ? valid.length + 1 : 1);
  return toBengaliNumber(String(nextNum).padStart(4, '0'));
}
