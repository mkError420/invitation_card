import Papa from 'papaparse';
import { Attendee } from '../types';
import { toBengaliNumber } from './bengaliNumerals';

/**
 * Normalizes an image URL, trimming quotes/whitespace and converting
 * common cloud storage links (like Google Drive or Dropbox) to direct image URLs.
 */
export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  let trimmed = String(url).trim();

  // Strip enclosing single or double quotes
  trimmed = trimmed.replace(/^["']+|["']+$/g, '');

  if (!trimmed) return '';

  // Google Drive share link transformation
  // Matches https://drive.google.com/file/d/FILE_ID/view... or https://drive.google.com/open?id=FILE_ID
  const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }

  // Dropbox link transformation: www.dropbox.com/... -> dl.dropboxusercontent.com/...
  if (trimmed.includes('dropbox.com')) {
    trimmed = trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/[?&]dl=0/, '?raw=1');
  }

  return trimmed;
}

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

          // Extract Image / Photo URL from column
          const rawPhoto = findValue(row, [
            'image',
            'imageurl',
            'photo',
            'photourl',
            'picture',
            'pic',
            'img',
            'avatar',
            'profile',
            'ছবি',
            'ছবি লিংক',
            'ছবিলিংক',
            'ছবির লিংক',
            'ছবিরলিংক',
            'ইমেজ',
            'ফটো',
          ]);
          const photoUrl = normalizeImageUrl(rawPhoto);

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
  const rowKeys = Object.keys(row);

  // 1. First pass: Exact match (case-insensitive, ignoring common separators & spaces)
  for (const target of possibleKeys) {
    const cleanTarget = target.trim().toLowerCase().replace(/[:\-_#\s]/g, '');
    for (const key of rowKeys) {
      const cleanKey = key.trim().toLowerCase().replace(/[:\-_#\s]/g, '');
      if (cleanKey === cleanTarget) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  // 2. Second pass: Substring / contains match
  for (const target of possibleKeys) {
    const cleanTarget = target.trim().toLowerCase().replace(/[:\-_#\s]/g, '');
    for (const key of rowKeys) {
      const cleanKey = key.trim().toLowerCase().replace(/[:\-_#\s]/g, '');
      if (cleanKey.includes(cleanTarget)) {
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
  const headers = ['নিবন্ধন নং', 'নাম', 'স্কুল', 'জেলা অবস্থান', 'অতিথি', 'মোবাইল নম্বর', 'Image'];
  const sampleRows = [
    ['১০৩৩', 'মো: নাজমুল আহসান', 'রংপুর জেলা স্কুল', 'রংপুর সদর, রংপুর', '২', '০১৭XXXXXXXX', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'],
    ['১০৩৪', 'কাজী গোলাম মোস্তফা', 'কারমাইকেল কলেজিয়েট স্কুল', 'ধাপ, রংপুর', '১', '০১৭১১১১১১১১', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'],
    ['১০৩৫', 'মোস্তাফিজুর রহমান', 'রংপুর জিলা স্কুল', 'পীরগঞ্জ, রংপুর', '৩', '০১৭২২২২২২২২', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80'],
    ['১০৩৬', 'শেখ শফিউল আলম', 'ক্যান্টনমেন্ট পাবলিক স্কুল', 'রংপুর ক্যান্টনমেন্ট', '২', '০১৭৩৩৩৩৩৩৩৩', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80'],
    ['১০৩৭', 'আহমেদ জামিল রশীদ', 'রংপুর সরকারি টেকনিক্যাল স্কুল', 'মর্ডান মোড়, রংপুর', '১', '০১৭৪৪৪৪৪৪৪৪', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80'],
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
