import Papa from 'papaparse';
import { Attendee } from '../types';
import { toBengaliNumber } from './bengaliNumerals';

export function parseAttendeesFromCsv(file: File): Promise<Attendee[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const attendees: Attendee[] = rows.map((row, index) => {
          // Normalize possible column keys in both English and Bengali
          const regNo =
            findValue(row, ['reg', 'regno', 'id', 'serial', 'sl', 'নিবন্ধন', 'আইডি', 'রোল']) ||
            String(1001 + index);

          const name =
            findValue(row, ['name', 'fullname', 'attendee', 'সদস্য', 'নাম', 'নামঃ']) ||
            `সদস্য ${index + 1}`;

          const school =
            findValue(row, ['school', 'institute', 'college', 'প্রতিষ্ঠান', 'স্কুল', 'বিদ্যালয়']) ||
            'রংপুর জেলা স্কুল';

          const district =
            findValue(row, ['district', 'location', 'address', 'জেলা', 'অবস্থান', 'ঠিকানা']) ||
            'রংপুর';

          const guests =
            findValue(row, ['guest', 'guests', 'person', 'visitor', 'অতিথি', 'মেহমান']) ||
            '১';

          const phone =
            findValue(row, ['phone', 'mobile', 'cell', 'contact', 'মোবাইল', 'ফোন', 'নম্বর']) ||
            '০১৭XXXXXXXX';

          const photoUrl =
            findValue(row, ['photo', 'image', 'picture', 'pic', 'photourl', 'ছবি', 'ছবি_লিংক']) ||
            '';

          return {
            id: `csv-${Date.now()}-${index}`,
            regNo: toBengaliNumber(regNo),
            name,
            school,
            district,
            guests: toBengaliNumber(guests),
            phone: toBengaliNumber(phone),
            photoUrl,
          };
        });

        resolve(attendees);
      },
      error: (err) => {
        reject(err);
      },
    });
  });
}

function findValue(row: Record<string, string>, possibleKeys: string[]): string | undefined {
  for (const key of Object.keys(row)) {
    const cleanKey = key.trim().toLowerCase().replace(/[:\-_#]/g, '');
    for (const target of possibleKeys) {
      if (cleanKey.includes(target)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }
  return undefined;
}

export function generateSampleCsvContent(): string {
  // UTF-8 BOM so Excel opens Bengali characters properly
  const BOM = '\uFEFF';
  const headers = ['নিবন্ধন নং', 'নাম', 'স্কুল', 'জেলা অবস্থান', 'অতিথি', 'মোবাইল নম্বর', 'ছবি লিংক'];
  const sampleRows = [
    ['১০৩৩', 'মো: নাজমুল আহসান', 'রংপুর জেলা স্কুল', 'রংপুর সদর, রংপুর', '২', '০১৭XXXXXXXX', ''],
    ['১০৩৪', 'কাজী গোলাম মোস্তফা', 'কারমাইকেল কলেজিয়েট স্কুল', 'ধাপ, রংপুর', '১', '০১৭১১১১১১১১', ''],
    ['১০৩৫', 'মোস্তাফিজুর রহমান', 'রংপুর জিলা স্কুল', 'পীরগঞ্জ, রংপুর', '৩', '০১৭২২২২২২২২', ''],
    ['১০৩৬', 'শেখ শফিউল আলম', 'ক্যান্টনমেন্ট পাবলিক স্কুল', 'রংপুর ক্যান্টনমেন্ট', '২', '০১৭৩৩৩৩৩৩৩৩', ''],
    ['১০৩৭', 'আহমেদ জামিল রশীদ', 'রংপুর সরকারি টেকনিক্যাল স্কুল', 'মর্ডান মোড়, রংপুর', '১', '০১৭৪৪৪৪৪৪৪৪', ''],
    ['১০৩৮', 'বদরুল হুদা মিঠু', 'রংপুর জেলা স্কুল', 'জাহাজ কোম্পানি মোড়, রংপুর', '৪', '০১৭৫৫৫৫৫৫৫৫', ''],
    ['১০৩৯', 'ফারুক আহমেদ চৌধুরী', 'রংপুর জিলা স্কুল', 'বেগম রোকেয়া কলেজ এলাকা', '২', '০১৭৬৬৬৬৬৬৬৬', ''],
    ['১০৪০', 'তারেক মাহমুদ', 'রংপুর মডেল স্কুল', 'সাতমাথা, রংপুর', '১', '০১৭৭৭৭৭৭৭৭৭', ''],
  ];

  const csvBody = [
    headers.join(','),
    ...sampleRows.map(row => row.map(v => `"${v}"`).join(',')),
  ].join('\n');

  return BOM + csvBody;
}

export function downloadSampleCsv(): void {
  const content = generateSampleCsvContent();
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'invitation_card_sample_data.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
