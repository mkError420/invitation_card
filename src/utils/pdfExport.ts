import { Attendee, EventConfig } from '../types';
import { generateA4Pdf, downloadSingleCardPng } from './cardCanvasRenderer';

/**
 * High-reliability PDF export for all A4 sheets
 * Generates PDF directly from canvas representations with zero dependency on UI view state.
 */
export async function exportA4PagesToPdf(
  pages: Attendee[][],
  config: EventConfig,
  onProgress?: (progress: { current: number; total: number; stage: string }) => void,
  fileName: string = 'invitation_cards.pdf'
): Promise<void> {
  await generateA4Pdf(pages, config, onProgress, fileName);
}

/**
 * High-reliability single card PNG export
 */
export async function exportSingleCardImage(
  attendee: Attendee,
  config: EventConfig,
  fileName: string = 'invitation_card.png'
): Promise<void> {
  await downloadSingleCardPng(attendee, config, fileName);
}
