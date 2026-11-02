import React from 'react';
import { Attendee, EventConfig } from '../types';
import { InvitationCard } from './InvitationCard';

interface PrintA4SheetProps {
  pageIndex: number;
  totalPages: number;
  attendees: Attendee[]; // Up to 4 attendees
  config: EventConfig;
  sheetId: string;
}

export const PrintA4Sheet: React.FC<PrintA4SheetProps> = ({
  pageIndex,
  totalPages,
  attendees,
  config,
  sheetId,
}) => {
  // Ensure we always have an array of 4 slots (or empty placeholders if fewer)
  const slots: (Attendee | null)[] = [
    attendees[0] || null,
    attendees[1] || null,
    attendees[2] || null,
    attendees[3] || null,
  ];

  return (
    <div className="print-sheet-outer flex flex-col items-center">
      {/* On-screen page label & helper */}
      <div className="no-print w-full max-w-[210mm] flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
        <span>A4 পেজ {pageIndex + 1} / {totalPages} (৪টি আইডি কার্ড)</span>
        <span>সাইজ: ২১০ মিমি × ২৯৭ মিমি</span>
      </div>

      {/* Actual A4 Page Container */}
      <div
        id={sheetId}
        className="print-page relative bg-white text-slate-900 shadow-xl overflow-hidden box-border"
        style={{
          width: '210mm',
          height: '297mm',
          padding: '8.32mm 8mm',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Subtle Cut Marks / Registration Marks around cards if enabled */}
        {config.showCutMarks && (
          <>
            {/* Center horizontal cutting line markers on left and right borders */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 border-t border-slate-300 pointer-events-none" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 border-t border-slate-300 pointer-events-none" />
            {/* Center vertical cutting line markers on top and bottom borders */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2.5 border-l border-slate-300 pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2.5 border-l border-slate-300 pointer-events-none" />
          </>
        )}

        {/* 2x2 Grid of Invitation Cards */}
        <div
          className="grid grid-cols-2 gap-x-[6mm] gap-y-[6mm] w-full h-full"
          style={{
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
          }}
        >
          {slots.map((attendee, index) => (
            <div
              key={attendee ? attendee.id : `empty-${index}`}
              className="relative w-full h-full flex items-center justify-center"
            >
              {attendee ? (
                <div className="w-full h-full max-w-[94mm] max-h-[137.2mm] flex items-center justify-center">
                  <InvitationCard
                    attendee={attendee}
                    config={config}
                    isPrintMode={true}
                  />
                </div>
              ) : (
                <div className="w-full h-full border border-dashed border-slate-200 rounded-[14px] flex items-center justify-center text-slate-300 text-xs font-bangla">
                  খালি স্লট
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
