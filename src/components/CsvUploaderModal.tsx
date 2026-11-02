import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Attendee } from '../types';
import { parseAttendeesFromCsv, downloadSampleCsv } from '../utils/csvHelper';

interface CsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newAttendees: Attendee[], mode: 'replace' | 'append') => void;
}

export const CsvUploaderModal: React.FC<CsvUploaderModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Attendee[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processFile(dropped);
    }
  };

  const processFile = async (f: File) => {
    setFile(f);
    setError(null);
    setIsProcessing(true);
    try {
      const attendees = await parseAttendeesFromCsv(f);
      if (attendees.length === 0) {
        setError('CSV ফাইলে কোনো বৈধ তথ্য খুঁজে পাওয়া যায়নি। অনুগ্রহ করে নমুনা ফাইলটি দেখে নিন।');
        setParsedData([]);
      } else {
        setParsedData(attendees);
      }
    } catch (err: any) {
      setError(err?.message || 'CSV ফাইল পড়তে সমস্যা হয়েছে।');
      setParsedData([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (parsedData.length > 0) {
      onImport(parsedData, importMode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-bangla">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">CSV ফাইল থেকে বাল্ক আপলোড</h3>
              <p className="text-xs text-slate-400">এক ক্লিকেই একসাথে শত শত আইডি কার্ড প্রস্তুত করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Sample CSV Download Helper Banner */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-emerald-300">CSV ফরম্যাট কেমন হবে?</h4>
              <p className="text-xs text-emerald-400/90 mt-0.5">
                কলামসমূহ: নিবন্ধন নং, নাম, স্কুল, জেলা অবস্থান, অতিথি, মোবাইল নম্বর, <span className="text-white font-bold underline">Image</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                (Image কলামে ছবির সরাসরি URL বা ড্রাইভ লিংক দিন, যা স্বয়ংক্রিয়ভাবে কার্ডের ছবির অংশে সেট হয়ে যাবে)
              </p>
            </div>
            <button
              onClick={downloadSampleCsv}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition shrink-0 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>নমুনা CSV ডাউনলোড</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              file
                ? 'border-emerald-500/60 bg-emerald-950/20'
                : 'border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800/60'
            }`}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv, .tsv, .txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-200">
              {file ? file.name : 'আপনার CSV ফাইল এখানে ড্রপ করুন অথবা ক্লিক করে নির্বাচন করুন'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              সাপোর্ট করে: .csv, .tsv (UTF-8 এনকোডিং সহ)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="text-center py-4 text-slate-400 text-xs">
              ফাইল প্রসেসিং চলছে...
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  সফলভাবে {parsedData.length} জন সদস্য পাওয়া গেছে
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>বর্তমান লিস্ট প্রতিস্থাপন</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>বর্তমান লিস্টে যোগ করুন</span>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="max-h-52 overflow-y-auto border border-slate-700 rounded-lg bg-slate-950/60 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-800 text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2 w-12 text-center">Image</th>
                      <th className="p-2">নিবন্ধন নং</th>
                      <th className="p-2">নাম</th>
                      <th className="p-2">স্কুল</th>
                      <th className="p-2">জেলা অবস্থান</th>
                      <th className="p-2">অতিথি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-400">
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2 text-center">
                          {row.photoUrl ? (
                            <img
                              src={row.photoUrl}
                              alt={row.name}
                              className="w-7 h-7 rounded-full object-cover mx-auto border border-emerald-500/60 bg-emerald-950/40"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-[10px] text-slate-500">ডিফল্ট</span>
                          )}
                        </td>
                        <td className="p-2 font-mono text-emerald-400 font-semibold">{row.regNo}</td>
                        <td className="p-2 text-slate-200 font-medium">{row.name}</td>
                        <td className="p-2">{row.school}</td>
                        <td className="p-2">{row.district}</td>
                        <td className="p-2">{row.guests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <div className="p-2 text-center text-slate-500 text-[11px] bg-slate-900/80">
                    এবং আরো {parsedData.length - 10} টি রেকর্ড...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-850">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            বাতিল
          </button>
          <button
            onClick={handleConfirm}
            disabled={parsedData.length === 0}
            className={`px-5 py-2 text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 ${
              parsedData.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>কার্ডসমূহ তৈরি করুন ({parsedData.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
