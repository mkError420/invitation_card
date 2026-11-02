import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Grid,
  Download,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Attendee, EventConfig } from '../types';
import { InvitationCard } from './InvitationCard';
import { exportSingleCardImage } from '../utils/pdfExport';

interface PrintAttendeeModalProps {
  isOpen: boolean;
  attendee: Attendee | null;
  config: EventConfig;
  onClose: () => void;
  onPrint: (attendee: Attendee, mode: 'single' | 'sheet4') => void;
  isPreparingPrint?: boolean;
}

export const PrintAttendeeModal: React.FC<PrintAttendeeModalProps> = ({
  isOpen,
  attendee,
  config,
  onClose,
  onPrint,
  isPreparingPrint = false,
}) => {
  const [printMode, setPrintMode] = useState<'single' | 'sheet4'>('single');
  const [isExportingPng, setIsExportingPng] = useState(false);

  if (!isOpen || !attendee) return null;

  const handleDownloadPng = async () => {
    setIsExportingPng(true);
    try {
      const filename = `card_${attendee.regNo || 'id'}_${attendee.name.replace(/\s+/g, '_')}.png`;
      await exportSingleCardImage(attendee, config, filename);
    } catch (err) {
      console.error('Single card PNG export failed:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handlePrintClick = () => {
    onPrint(attendee, printMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-bangla">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>কার্ড প্রিন্ট করুন</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                  {attendee.regNo || 'আইডি'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                সদস্য: <span className="text-white font-medium">{attendee.name}</span> • {attendee.school}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isPreparingPrint}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Live Mini Card Preview */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>প্রিন্ট প্রিভিউ (আমন্ত্রণ কার্ড)</span>
              </span>

              <div
                className="overflow-hidden rounded-xl shadow-lg border border-slate-700/60"
                style={{
                  width: '210px',
                  height: '306px',
                  transform: 'scale(0.85)',
                  transformOrigin: 'top center',
                  marginBottom: '-35px',
                }}
              >
                <div style={{ transform: 'scale(0.58)', transformOrigin: 'top left' }}>
                  <InvitationCard
                    attendee={attendee}
                    config={config}
                    isPrintMode={false}
                  />
                </div>
              </div>
            </div>

            {/* Print Options */}
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">প্রিন্ট ফরম্যাট নির্বাচন করুন</h4>
                <p className="text-slate-400 text-xs">
                  A4 সাইজের পেপারে কার্ডটি কীভাবে প্রিন্ট করতে চান:
                </p>
              </div>

              {/* Mode 1: 1 Card on A4 */}
              <div
                onClick={() => setPrintMode('single')}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  printMode === 'single'
                    ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`mt-0.5 p-2 rounded-lg ${
                    printMode === 'single'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">১টি কার্ড প্রিন্ট (A4 পেজ)</span>
                    {printMode === 'single' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    A4 কাগজের প্রথম স্লটে শুধুমাত্র এই সদস্যের ১টি কার্ড প্রিন্ট হবে। বাকী অংশ ফাঁকা থাকবে।
                  </p>
                </div>
              </div>

              {/* Mode 2: 4 Copies on A4 */}
              <div
                onClick={() => setPrintMode('sheet4')}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  printMode === 'sheet4'
                    ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`mt-0.5 p-2 rounded-lg ${
                    printMode === 'sheet4'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">৪টি কপি প্রিন্ট (A4 পেজ ভর্তি)</span>
                    {printMode === 'sheet4' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    কাগজ সাশ্রয় করতে একই A4 পেজে এই সদস্যের ৪টি কার্ডের কপি একসাথে প্রিন্ট হবে।
                  </p>
                </div>
              </div>

              {/* Download PNG alternative button */}
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isExportingPng}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                {isExportingPng ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <Download className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {isExportingPng ? 'ছবি তৈরি হচ্ছে...' : 'এই কার্ডের PNG ছবি ডাউনলোড করুন'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isPreparingPrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
          >
            বাতিল
          </button>

          <button
            type="button"
            onClick={handlePrintClick}
            disabled={isPreparingPrint}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950/60 cursor-pointer"
          >
            {isPreparingPrint ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>প্রিন্ট প্রস্তুত হচ্ছে...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>
                  {printMode === 'sheet4' ? '৪টি কপি প্রিন্ট করুন' : '১টি কার্ড প্রিন্ট করুন'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

