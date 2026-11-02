import Papa from 'papaparse';
import { Attendee } from '../types';
import { toBengaliNumber, toEnglishNumber, formatRegNo } from './bengaliNumerals';

/**
 * Normalizes an image URL, trimming quotes/whitespace and converting
 * common cloud storage links (like Google Drive, Dropbox) to direct image URLs.
 */
export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  let trimmed = String(url).trim();

  // Strip enclosing single or double quotes
  trimmed = trimmed.replace(/^["']+|["']+$/g, '');

  if (!trimmed) return '';

  // If already a Data URL (e.g. data:image/png;base64,...)
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Google Drive share link transformation:
  // Matches:
  // - drive.google.com/file/d/FILE_ID/view...
  // - drive.google.com/open?id=FILE_ID
  // - drive.google.com/uc?id=FILE_ID
  // - drive.google.com/uc?export=view&id=FILE_ID
  // - docs.google.com/uc?id=FILE_ID
  const driveMatch = trimmed.match(
    /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)|docs\.google\.com\/(?:uc\?id=|file\/d\/))([a-zA-Z0-9_-]+)/
  );
  if (driveMatch && driveMatch[1]) {
    // Google's thumbnail API generates a high-resolution, fast-loading, public direct image
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1000`;
  }

  // If user pasted raw Google Drive ID (28-45 alphanumeric chars with _ -)
  if (/^[a-zA-Z0-9_-]{28,45}$/.test(trimmed)) {
    return `https://drive.google.com/thumbnail?id=${trimmed}&sz=w1000`;
  }

  // Dropbox link transformation: www.dropbox.com/... -> dl.dropboxusercontent.com/...
  if (trimmed.includes('dropbox.com')) {
    trimmed = trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/[?&]dl=0/, '?raw=1');
  }

  return trimmed;
}

export const PHOTO_HEADER_KEYS = [
  'image',
  'images',
  'imageurl',
  'image_url',
  'imagelink',
  'image_link',
  'photo',
  'photos',
  'photourl',
  'photo_url',
  'photolink',
  'photo_link',
  'picture',
  'pictures',
  'pictureurl',
  'picturelink',
  'pic',
  'pics',
  'img',
  'imgs',
  'avatar',
  'profile',
  'ছবি',
  'ছবির লিংক',
  'ছবির লিঙ্ক',
  'ছবি লিংক',
  'ছবি লিঙ্ক',
  'ছবি_লিংক',
  'ছবি_লিঙ্ক',
  'ছবির_লিংক',
  'ছবির_লিঙ্ক',
  'সদস্যের ছবি',
  'প্রোফাইল ছবি',
  'পাসপোর্ট ছবি',
  'ইমেজ',
  'ইমেজ লিংক',
  'ইমেজ লিঙ্ক',
  'ফটো',
  'ফটো লিংক',
  'ফটো লিঙ্ক',
  'ড্রাইভ',
  'ড্রাইভ লিংক',
  'ড্রাইভ লিঙ্ক',
  'গুগল ড্রাইভ',
  'drive',
  'drive link',
  'google drive',
  'google drive link',
  'url',
  'link',
  'file',
  'files',
];

export function findPhotoInRow(row: Record<string, string>): string {
  // 1. Try finding by matching known column headers
  const fromHeader = findValue(row, PHOTO_HEADER_KEYS);
  if (fromHeader && fromHeader.trim() !== '') {
    return fromHeader.trim();
  }

  // 2. Fallback: inspect values across all columns for image/drive URLs
  for (const key of Object.keys(row)) {
    const val = String(row[key] || '').trim();
    if (!val) continue;

    // Check for Google Drive / Dropbox / Cloudinary / Imgur
    if (
      val.includes('drive.google.com') ||
      val.includes('dropbox.com') ||
      val.includes('imgur.com') ||
      val.includes('cloudinary.com')
    ) {
      return val;
    }

    // Check for direct web image URL
    if (/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(val)) {
      return val;
    }

    // Check for base64 image data URL
    if (val.startsWith('data:image/')) {
      return val;
    }

    // Check for local image filename (e.g. 1001.jpg, photo.png)
    if (/^[a-zA-Z0-9_\-\u0980-\u09FF\s]+\.(jpg|jpeg|png|webp|gif)$/i.test(val)) {
      return val;
    }

    // Check for any general http/https link that isn't a known textual column
    const cleanKey = key.trim().toLowerCase();
    if (
      /^https?:\/\//i.test(val) &&
      !cleanKey.includes('school') &&
      !cleanKey.includes('college') &&
      !cleanKey.includes('district')
    ) {
      return val;
    }
  }

  return '';
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
          // Normalize possible column keys in both English and Bengali, auto-formatting to 0001 (০০০১), 0002...
          const rawRegNo = findValue(row, ['reg', 'regno', 'id', 'serial', 'sl', 'নিবন্ধন', 'আইডি', 'রোল']);
          const regNo = rawRegNo ? formatRegNo(rawRegNo) : formatRegNo(index + 1);

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

          // Extract Image / Photo URL from column with intelligent auto-detection
          const rawPhoto = findPhotoInRow(row);
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

/**
 * Matches an array of local image files to a list of attendees by filename,
 * registration number, attendee name, or attendee.photoUrl filename.
 */
export async function matchPhotosToAttendees(
  imageFiles: File[],
  attendees: Attendee[]
): Promise<{ updatedAttendees: Attendee[]; matchedCount: number }> {
  const fileDataPromises = imageFiles.map((file) => {
    return new Promise<{ file: File; baseName: string; dataUrl: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dotIndex = file.name.lastIndexOf('.');
        const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex).trim() : file.name.trim();
        resolve({
          file,
          baseName,
          dataUrl: String(reader.result || ''),
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  });

  const loadedFiles = await Promise.all(fileDataPromises);
  let matchedCount = 0;

  const updatedAttendees = attendees.map((att) => {
    const regBn = att.regNo.trim();
    const regEn = toEnglishNumber(regBn);
    const attName = att.name.trim().toLowerCase();
    const existingPhoto = (att.photoUrl || '').trim();

    // Look for matching loaded file
    const matched = loadedFiles.find((f) => {
      const fBase = f.baseName.trim();
      const fBaseEn = toEnglishNumber(fBase);
      const fBaseBn = toBengaliNumber(fBase);
      const fNameLower = fBase.toLowerCase();

      // 1. Matches registration number (e.g. "1001" or "১০০১")
      if (regEn && (fBase === regEn || fBaseEn === regEn || fBaseBn === regBn || fBase === regBn)) {
        return true;
      }

      // 2. Matches attendee name (e.g. "নাম এক")
      if (attName && (fNameLower === attName || attName.includes(fNameLower))) {
        return true;
      }

      // 3. Matches existing photo filename from CSV (e.g. CSV has "photo_1001.jpg" and file is "photo_1001.jpg")
      if (existingPhoto && (existingPhoto.includes(f.file.name) || existingPhoto.includes(fBase))) {
        return true;
      }

      return false;
    });

    if (matched) {
      matchedCount++;
      return { ...att, photoUrl: matched.dataUrl };
    }

    return att;
  });

  return { updatedAttendees, matchedCount };
}

export function generateSampleCsvContent(): string {
  // UTF-8 BOM so Excel opens Bengali characters properly
  const BOM = '\uFEFF';
  const headers = ['নিবন্ধন নং', 'নাম', 'স্কুল', 'জেলা অবস্থান', 'অতিথি', 'মোবাইল নম্বর', 'Image'];
  const sampleRows = [
    ['০০০১', 'মো: নাজমুল আহসান', 'রংপুর জেলা স্কুল', 'রংপুর সদর, রংপুর', '২', '০১৭XXXXXXXX', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'],
    ['০০০২', 'কাজী গোলাম মোস্তফা', 'কারমাইকেল কলেজিয়েট স্কুল', 'ধাপ, রংপুর', '১', '০১৭১১১১১১১১', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'],
    ['০০০৩', 'মোস্তাফিজুর রহমান', 'রংপুর জিলা স্কুল', 'পীরগঞ্জ, রংপুর', '৩', '০১৭২২২২২২২২', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80'],
    ['০০০৪', 'শেখ শফিউল আলম', 'ক্যান্টনমেন্ট পাবলিক স্কুল', 'রংপুর ক্যান্টনমেন্ট', '২', '০১৭৩৩৩৩৩৩৩৩', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80'],
    ['০০০৫', 'আহমেদ জামিল রশীদ', 'রংপুর সরকারি টেকনিক্যাল স্কুল', 'মর্ডান মোড়, রংপুর', '১', '০১৭৪৪৪৪৪৪৪৪', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80'],
    ['০০০৬', 'বদরুল হুদা মিঠু', 'রংপুর জেলা স্কুল', 'জাহাজ কোম্পানি মোড়, রংপুর', '৪', '০১৭৫৫৫৫৫৫৫৫', ''],
    ['০০০৭', 'ফারুক আহমেদ চৌধুরী', 'রংপুর জিলা স্কুল', 'বেগম রোকেয়া কলেজ এলাকা', '২', '০১৭৬৬৬৬৬৬৬৬', ''],
    ['০০০৮', 'তারেক মাহমুদ', 'রংপুর মডেল স্কুল', 'সাতমাথা, রংপুর', '১', '০১৭৭৭৭৭৭৭৭৭', ''],
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
