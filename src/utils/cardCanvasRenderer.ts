import jsPDF from 'jspdf';
import { Attendee, EventConfig, DEFAULT_EVENT_CONFIG } from '../types';
import { normalizeImageUrl } from './csvHelper';

// Cache for preloaded template image
let cachedTemplateImage: HTMLImageElement | null = null;

// Font family helpers for Canvas rendering
export function getCanvasRegFont(fontChoice?: string): string {
  if (fontChoice === 'solaiman') {
    return '"SolaimanLipi", "Kalpurush", sans-serif';
  }
  if (fontChoice === 'solaiman_kalpurush') {
    return '"SolaimanLipi", "Kalpurush", sans-serif';
  }
  if (fontChoice === 'kalpurush' || fontChoice === 'kalpurush_solaiman') {
    return '"Kalpurush", "SolaimanLipi", sans-serif';
  }
  // Default: 'solaiman_kalpurush' (আইডি সোলাইমানলিপি)
  return '"SolaimanLipi", "Kalpurush", sans-serif';
}

export function getCanvasFieldsFont(fontChoice?: string): string {
  if (fontChoice === 'solaiman') {
    return '"SolaimanLipi", "Kalpurush", sans-serif';
  }
  if (fontChoice === 'kalpurush_solaiman') {
    return '"SolaimanLipi", "Kalpurush", sans-serif';
  }
  // Default and 'kalpurush' and 'solaiman_kalpurush' (তথ্য কালপুরুষ)
  return '"Kalpurush", "SolaimanLipi", sans-serif';
}

/**
 * Preload and cache the card template image
 */
export async function preloadTemplateImage(): Promise<HTMLImageElement> {
  if (cachedTemplateImage && cachedTemplateImage.complete && cachedTemplateImage.naturalWidth > 0) {
    return cachedTemplateImage;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedTemplateImage = img;
      resolve(img);
    };
    img.onerror = () => {
      // Fallback try without crossOrigin if local
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        cachedTemplateImage = fallbackImg;
        resolve(fallbackImg);
      };
      fallbackImg.onerror = () => reject(new Error('Failed to load invitation template image'));
      fallbackImg.src = '/assets/aistudio/current_template.jpeg';
    };
    img.src = '/assets/aistudio/current_template.jpeg';
  });
}

/**
 * Preload any attendee photo URL
 */
function loadAttendeePhoto(photoUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load attendee photo'));
    img.src = normalizeImageUrl(photoUrl);
  });
}

/**
 * Render a single card to a high-resolution HTMLCanvasElement (1038 x 1515)
 */
export async function renderCardToCanvas(
  attendee: Attendee,
  config: EventConfig,
  options: { isPrintMode?: boolean } = {}
): Promise<HTMLCanvasElement> {
  // Ensure Bangla fonts (Kalpurush, SolaimanLipi) and general fonts are loaded
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('bold 82px "Kalpurush"'),
        document.fonts.load('bold 82px "SolaimanLipi"'),
        document.fonts.load('bold 39px "Kalpurush"'),
        document.fonts.load('bold 39px "SolaimanLipi"'),
        document.fonts.ready,
      ]);
    } catch {
      // Ignore font readiness timeout
    }
  }

  const templateImg = await preloadTemplateImage();

  const width = 1038;
  const height = 1515;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. Base background
  ctx.fillStyle = '#e6f3eb';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw template graphic
  ctx.drawImage(templateImg, 0, 0, width, height);

  // 3. Attendee Profile Photo (Circle in upper left)
  const photoScale = (config.photoScale || 98) / 100;
  const baseDiameter = 316; // native template circle diameter
  const diameter = baseDiameter * photoScale;
  const radius = diameter / 2;

  // Center coordinates
  const centerX = width * 0.1830; // 18.30%
  const centerY = height * 0.3195 + ((config.photoOffsetY || 0) * height) / 100;

  // Draw photo inside clipped circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // White background for the circle
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  let photoDrawn = false;
  if (attendee.photoUrl && attendee.photoUrl.trim() !== '') {
    try {
      const photoImg = await loadAttendeePhoto(attendee.photoUrl);
      // Draw image with aspect fill (cover)
      const pW = photoImg.naturalWidth || photoImg.width;
      const pH = photoImg.naturalHeight || photoImg.height;
      const aspect = pW / pH;

      let drawW = diameter;
      let drawH = diameter;
      if (aspect > 1) {
        drawW = diameter * aspect;
      } else {
        drawH = diameter / aspect;
      }

      const drawX = centerX - drawW / 2;
      const drawY = centerY - drawH / 2;

      ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
      photoDrawn = true;
    } catch (err) {
      console.warn('Could not load attendee photo for canvas render:', err);
    }
  }

  if (!photoDrawn) {
    // Draw elegant default avatar silhouette
    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(centerX - radius, centerY - radius, diameter, diameter);

    ctx.fillStyle = '#059669';
    // Head circle
    const headRadius = radius * 0.32;
    const headCenterY = centerY - radius * 0.15;
    ctx.beginPath();
    ctx.arc(centerX, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Body shoulders curve
    ctx.beginPath();
    ctx.arc(centerX, centerY + radius * 0.85, radius * 0.65, Math.PI, 0, false);
    ctx.fill();
  }
  ctx.restore();

  // Thin smooth border around photo circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.stroke();
  ctx.restore();

  // 4. Registration Number (Bold Bengali Digits)
  // Box: left: 42.5%, top: 37.16%, width: 45.0%, height: 7.79%
  const regBoxX = width * 0.425;
  const regBoxY = height * 0.3716;
  const regBoxW = width * 0.450;
  const regBoxH = height * 0.0779;
  const regCenterX = regBoxX + regBoxW / 2;
  const regCenterY = regBoxY + regBoxH / 2 + 6; // visual baseline adjustment

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#09522e';
  ctx.strokeStyle = '#09522e';
  ctx.lineWidth = 1.2;
  // Use selected Bangla font (Kalpurush / SolaimanLipi)
  const regFont = getCanvasRegFont(config.fontChoice);
  ctx.font = `bold 82px ${regFont}`;
  ctx.strokeText(attendee.regNo || '', regCenterX, regCenterY);
  ctx.fillText(attendee.regNo || '', regCenterX, regCenterY);
  ctx.restore();

  // 5. Five Information Fields
  const infoLeft = width * 0.325 + 10;
  const infoMaxWidth = width * 0.545 - 20;
  const fieldsFont = getCanvasFieldsFont(config.fontChoice);

  const fields = [
    {
      label: config.labelName,
      value: attendee.name,
      centerY: height * 0.4620 + (height * 0.0647) / 2 + 2,
    },
    {
      label: config.labelSchool,
      value: attendee.school,
      centerY: height * 0.5406 + (height * 0.0673) / 2 + 2,
    },
    {
      label: config.labelDistrict,
      value: attendee.district,
      centerY: height * 0.6218 + (height * 0.0667) / 2 + 2,
    },
    {
      label: config.labelGuests,
      value: attendee.guests,
      centerY: height * 0.7003 + (height * 0.0660) / 2 + 2,
    },
    {
      label: config.labelPhone,
      value: attendee.phone,
      centerY: height * 0.7782 + (height * 0.0667) / 2 + 2,
    },
  ];

  for (const field of fields) {
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const fullText = field.label && field.label.trim() !== ''
      ? `${field.label}${field.value}`
      : field.value;

    // Dynamically adjust font size if text is very long (small increase to 39px)
    let fontSize = 39;
    ctx.font = `bold ${fontSize}px ${fieldsFont}`;
    let measuredWidth = ctx.measureText(fullText).width;

    while (measuredWidth > infoMaxWidth && fontSize > 22) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px ${fieldsFont}`;
      measuredWidth = ctx.measureText(fullText).width;
    }

    ctx.lineWidth = 0.8;
    if (field.label && field.label.trim() !== '') {
      ctx.fillStyle = '#063b20';
      ctx.strokeStyle = '#063b20';
      ctx.strokeText(field.label, infoLeft, field.centerY);
      ctx.fillText(field.label, infoLeft, field.centerY);
      const labelWidth = ctx.measureText(field.label).width;

      ctx.fillStyle = '#0a1826';
      ctx.strokeStyle = '#0a1826';
      ctx.strokeText(field.value, infoLeft + labelWidth, field.centerY);
      ctx.fillText(field.value, infoLeft + labelWidth, field.centerY);
    } else {
      ctx.fillStyle = '#0a1826';
      ctx.strokeStyle = '#0a1826';
      ctx.strokeText(field.value, infoLeft, field.centerY);
      ctx.fillText(field.value, infoLeft, field.centerY);
    }
    ctx.restore();
  }

  // 6. Custom Footer Overlay (if modified from default)
  const isCustomFooter =
    config.date !== DEFAULT_EVENT_CONFIG.date ||
    config.venue !== DEFAULT_EVENT_CONFIG.venue;

  if (isCustomFooter) {
    const fX = width * 0.036;
    const fY = height * 0.858;
    const fW = width * 0.928;
    const fH = height * 0.072;
    const fRadius = fH / 2;

    ctx.save();
    // Rounded container
    ctx.beginPath();
    ctx.roundRect(fX, fY, fW, fH, fRadius);
    ctx.fillStyle = '#eef7f2';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0d633d';
    ctx.stroke();

    // Center divider
    const dividerX = fX + fW * 0.52;
    ctx.beginPath();
    ctx.moveTo(dividerX, fY + fH * 0.2);
    ctx.lineTo(dividerX, fY + fH * 0.8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0d633d';
    ctx.stroke();

    // Date text (Left)
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#09522e';
    ctx.font = 'bold 28px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📅 ${config.date}`, fX + 28, fY + fH / 2 + 2);

    // Venue text (Right)
    ctx.fillText(`📍 ${config.venue}`, dividerX + 24, fY + fH / 2 + 2);
    ctx.restore();
  }

  // 7. Lanyard Hole Slot Punch Guide (Print mode or enabled)
  if (config.showLanyardSlot && options.isPrintMode) {
    const slotW = width * 0.18;
    const slotH = height * 0.028;
    const slotX = width / 2 - slotW / 2;
    const slotY = height * 0.025;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(slotX, slotY, slotW, slotH, slotH / 2);
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 80, 40, 0.45)';
    ctx.stroke();
    ctx.restore();
  }

  return canvas;
}

/**
 * Generate PDF with 4 cards per A4 page using jsPDF
 */
export async function generateA4Pdf(
  pages: Attendee[][],
  config: EventConfig,
  onProgress?: (progress: { current: number; total: number; stage: string }) => void,
  fileName: string = 'invitation_cards.pdf'
): Promise<void> {
  if (pages.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const totalPages = pages.length;

  // A4 Page dimensions: 210mm x 297mm
  // We place 4 cards in a 2x2 grid.
  // Card dimensions on page:
  const cardWidthMm = 94; // mm
  const cardHeightMm = cardWidthMm * (1515 / 1038); // ~137.18 mm

  // Horizontal spacing
  // Available width: 210mm. Total cards width: 94 * 2 = 188mm.
  // Remaining space: 22mm. Left margin: 8mm, Gap: 6mm, Right margin: 8mm
  const marginLeftMm = 8;
  const colGapMm = 6;

  // Vertical spacing
  // Available height: 297mm. Total cards height: 137.18 * 2 = 274.36mm.
  // Remaining space: 22.64mm. Top margin: 8.32mm, Gap: 6mm, Bottom margin: 8.32mm
  const marginTopMm = 8.32;
  const rowGapMm = 6;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      pdf.addPage('a4', 'portrait');
    }

    const currentAttendees = pages[pageIdx];

    if (onProgress) {
      onProgress({
        current: pageIdx + 1,
        total: totalPages,
        stage: `A4 পাতা ${pageIdx + 1}/${totalPages} তৈরি হচ্ছে...`,
      });
    }

    // Positions for 4 slots: [row, col]
    const slotPositions = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ];

    for (let slotIdx = 0; slotIdx < currentAttendees.length && slotIdx < 4; slotIdx++) {
      const attendee = currentAttendees[slotIdx];
      if (!attendee) continue;

      const { col, row } = slotPositions[slotIdx];
      const xMm = marginLeftMm + col * (cardWidthMm + colGapMm);
      const yMm = marginTopMm + row * (cardHeightMm + rowGapMm);

      // Render high-res card canvas
      const cardCanvas = await renderCardToCanvas(attendee, config, { isPrintMode: true });
      const imgData = cardCanvas.toDataURL('image/jpeg', 0.92);

      // Add to PDF
      pdf.addImage(imgData, 'JPEG', xMm, yMm, cardWidthMm, cardHeightMm, undefined, 'FAST');
    }

    // Optional Cut Marks around cards on the A4 page
    if (config.showCutMarks) {
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.2);

      // Horizontal center cut mark line on left and right margins
      const midY = marginTopMm + cardHeightMm + rowGapMm / 2;
      pdf.line(1, midY, marginLeftMm - 1, midY);
      pdf.line(210 - marginLeftMm + 1, midY, 209, midY);

      // Vertical center cut mark line on top and bottom margins
      const midX = marginLeftMm + cardWidthMm + colGapMm / 2;
      pdf.line(midX, 1, midX, marginTopMm - 1);
      pdf.line(midX, 297 - marginTopMm + 1, midX, 296);

      // Page footer info
      pdf.setFontSize(8);
      pdf.setTextColor(140, 140, 140);
      pdf.text(
        `মিলনমেলা ২০২৬ • A4 পেজ ${pageIdx + 1} / ${totalPages} (প্রতি পাতায় ৪টি আইডি কার্ড)`,
        105,
        294,
        { align: 'center' }
      );
    }
  }

  if (onProgress) {
    onProgress({
      current: totalPages,
      total: totalPages,
      stage: 'পিডিএফ ফাইল ডাউনলোড হচ্ছে...',
    });
  }

  pdf.save(fileName);
}

/**
 * Export single card as PNG
 */
export async function downloadSingleCardPng(
  attendee: Attendee,
  config: EventConfig,
  fileName: string = 'invitation_card.png'
): Promise<void> {
  const canvas = await renderCardToCanvas(attendee, config, { isPrintMode: false });
  const dataUrl = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
