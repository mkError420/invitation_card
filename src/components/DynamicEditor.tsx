import React, { useState } from 'react';
import {
  Type,
  UserCheck,
  Calendar,
  MapPin,
  Camera,
  Layers,
  Settings2,
  Trash2,
  Sparkles,
  Save,
  CheckCircle,
  AlertCircle,
  Users,
  RotateCcw,
} from 'lucide-react';
import { Attendee, EventConfig } from '../types';

interface DynamicEditorProps {
  selectedAttendee: Attendee;
  config: EventConfig;
  onUpdateAttendee: (attendee: Attendee) => void;
  onUpdateConfig: (config: EventConfig) => void;
  onSaveAttendee?: (attendee: Attendee) => Promise<void> | void;
  onClearForm?: () => void;
  onViewTable?: () => void;
}

export const DynamicEditor: React.FC<DynamicEditorProps> = ({
  selectedAttendee,
  config,
  onUpdateAttendee,
  onUpdateConfig,
  onSaveAttendee,
  onClearForm,
  onViewTable,
}) => {
  const [activeTab, setActiveTab] = useState<'attendee' | 'event' | 'labels' | 'print'>('attendee');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSaveAttendee = async () => {
    // If attendee name is empty but config.labelName has a name (from previous accidental input in labels tab), auto-populate!
    const effectiveAttendee = { ...selectedAttendee };
    if (!effectiveAttendee.name.trim() && config.labelName && config.labelName.trim()) {
      effectiveAttendee.name = config.labelName.trim();
      onUpdateAttendee(effectiveAttendee);
    }

    if (!effectiveAttendee.name.trim()) {
      setValidationError('অনুগ্রহ করে সদস্যের নাম পূরণ করুন।');
      return;
    }
    setValidationError(null);
    setIsSaving(true);
    try {
      if (onSaveAttendee) {
        await onSaveAttendee(effectiveAttendee);
      }
      setSaveSuccessMsg(`'${effectiveAttendee.name}' সফলভাবে ডাটাবেজে সংরক্ষণ করা হয়েছে এবং নতুন সদস্যের জন্য কার্ড ক্লিয়ার হয়েছে।`);
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    } catch (err: any) {
      setValidationError('সংরক্ষণে ত্রুটি হয়েছে: ' + (err?.message || 'ডাটাবেজে সংরক্ষণ করা যায়নি'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateAttendee({
            ...selectedAttendee,
            photoUrl: reader.result,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    onUpdateAttendee({
      ...selectedAttendee,
      photoUrl: '',
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col font-bangla overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-850/70 p-1.5 gap-1 text-xs">
        <button
          onClick={() => setActiveTab('attendee')}
          className={`flex-1 py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition ${activeTab === 'attendee'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>কার্ড তথ্য</span>
        </button>

        <button
          onClick={() => setActiveTab('event')}
          className={`flex-1 py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition ${activeTab === 'event'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
        >
          <Layers className="w-4 h-4" />
          <span>ইভেন্ট ব্যানার</span>
        </button>

        <button
          onClick={() => setActiveTab('labels')}
          className={`flex-1 py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition ${activeTab === 'labels'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
        >
          <Type className="w-4 h-4" />
          <span>লেবেল</span>
        </button>

        <button
          onClick={() => setActiveTab('print')}
          className={`flex-1 py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition ${activeTab === 'print'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>প্রিন্ট অপশন</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-5 overflow-y-auto max-h-[580px] space-y-4 text-xs">
        {/* Tab 1: Attendee Information */}
        {activeTab === 'attendee' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="font-bold text-sm text-white">সদস্যের ব্যক্তিগত তথ্য পরিবর্তন</h4>
                <p className="text-slate-400 text-[11px]">নিচের যেকোনো তথ্য পরিবর্তন করলে কার্ডে তৎক্ষণাৎ আপডেট হবে</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                আইডি: {selectedAttendee.regNo}
              </span>
            </div>

            {/* Photo Upload & Preview Row */}
            <div className="flex items-center gap-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500 shrink-0 bg-emerald-950/40 flex items-center justify-center">
                {selectedAttendee.photoUrl ? (
                  <img
                    src={selectedAttendee.photoUrl}
                    alt={selectedAttendee.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCheck className="w-8 h-8 text-emerald-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-slate-200">প্রোফাইল ছবি</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition font-medium"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>ছবি আপলোড</span>
                  </button>
                  {selectedAttendee.photoUrl && (
                    <button
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg transition"
                      title="ডিফল্ট ছবি ফিরিয়ে আনুন"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>রিমুভ</span>
                    </button>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="অথবা ছবির সরাসরি URL / লিংক দিন"
                    value={selectedAttendee.photoUrl || ''}
                    onChange={(e) => onUpdateAttendee({ ...selectedAttendee, photoUrl: e.target.value })}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-[11px] placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Photo Size Slider Control */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span>ছবির সাইজ (আকার নিয়ন্ত্রণ)</span>
                <span className="font-mono text-emerald-400 font-bold">{config.photoScale || 88}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="100"
                value={config.photoScale || 88}
                onChange={(e) =>
                  onUpdateConfig({ ...config, photoScale: Number(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>ছোট (৭০%)</span>
                <span className="text-emerald-400 font-medium">আদর্শ সাইজ (৮৮%)</span>
                <span>বড় (১০০%)</span>
              </div>
            </div>

            {/* Registration No & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  নিবন্ধন নম্বর (আইডি)
                </label>
                <input
                  type="text"
                  value={selectedAttendee.regNo}
                  onChange={(e) =>
                    onUpdateAttendee({ ...selectedAttendee, regNo: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="০০০১"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  সদস্যের পুরো নাম <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={selectedAttendee.name}
                  onChange={(e) =>
                    onUpdateAttendee({ ...selectedAttendee, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold focus:border-emerald-500 focus:outline-none"
                  placeholder="নাম লিখুন"
                />
              </div>
            </div>

            {/* School & District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  স্কুল / প্রতিষ্ঠানের নাম
                </label>
                <input
                  type="text"
                  value={selectedAttendee.school}
                  onChange={(e) =>
                    onUpdateAttendee({ ...selectedAttendee, school: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="প্রতিষ্ঠান এর নাম লিখুন"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  জেলা / বর্তমান অবস্থান
                </label>
                <input
                  type="text"
                  value={selectedAttendee.district}
                  onChange={(e) =>
                    onUpdateAttendee({ ...selectedAttendee, district: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="রংপুর"
                />
              </div>
            </div>

            {/* Guests & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  অতিথির সংখ্যা
                </label>
                <input
                  type="text"
                  value={selectedAttendee.guests}
                  onChange={(e) =>
                    onUpdateAttendee({ ...selectedAttendee, guests: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="১"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={selectedAttendee.phone}
                  onChange={(e) =>
                    onUpdateAttendee({ ...selectedAttendee, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="০১৭XXXXXXXX"
                />
              </div>
            </div>

            {/* Validation Message */}
            {validationError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Save Success Message */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-700 text-emerald-300 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
                {onViewTable && (
                  <button
                    type="button"
                    onClick={onViewTable}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition shrink-0"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>সদস্য তালিকায় দেখুন</span>
                  </button>
                )}
              </div>
            )}

            {/* Save & Clear Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAttendee}
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'সংরক্ষণ করা হচ্ছে...' : 'ডাটাবেজে সংরক্ষণ করুন (Save & Clear)'}</span>
              </button>

              {onClearForm && (
                <button
                  type="button"
                  onClick={onClearForm}
                  title="ফর্মটি নতুন সদস্যের জন্য খালি করুন"
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ফর্ম খালি করুন</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              সংরক্ষণ করলে মেম্বার ডাটাবেজ ও 'নিবন্ধিত সদস্যদের তালিকা'য় যুক্ত হবে এবং ফর্মটি পরবর্তী মেম্বারের জন্য ক্লিয়ার হয়ে যাবে।
            </p>
          </div>
        )}

        {/* Tab 2: Event Details (Date & Venue) */}
        {activeTab === 'event' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">ইভেন্টের তারিখ ও স্থান</h4>
                <p className="text-slate-400 text-[11px]">কার্ডের নিচের অংশে প্রদর্শিত তারিখ ও স্থান</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                মূল ব্যানার সক্রিয়
              </span>
            </div>

            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 space-y-1">
              <p className="font-bold">✓ মূল গ্রাফিক্স ব্যানার সক্রিয়:</p>
              <p className="text-slate-300">
                কার্ডের শীর্ষ স্লোগান "স্মৃতির আবেশে" এখন সম্পূর্ণ ফাংশনাল। প্রয়োজনে নিচের ঘর থেকে স্লোগান পরিবর্তন করতে পারবেন।
              </p>
            </div>

            {/* Slogan 1 Input */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-emerald-400" />
                <span>কার্ডের মূল স্লোগান (স্লোগান ১)</span>
              </label>
              <input
                type="text"
                value={config.slogan1}
                onChange={(e) =>
                  onUpdateConfig({ ...config, slogan1: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                placeholder="স্মৃতির আবেশে...বন্ধুত্বের উচ্ছ্বাসে..."
              />
              <p className="text-[11px] text-slate-400 mt-1">
                কার্ডের উপরের ব্যানারে প্রদর্শিত মূল স্লোগান ("স্মৃতির আবেশে...বন্ধুত্বের উচ্ছ্বাসে...")
              </p>
            </div>

            {/* Date & Venue Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ইভেন্টের তারিখ</span>
                </label>
                <input
                  type="text"
                  value={config.date}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, date: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="১৮ ডিসেম্বর, ২০২৬"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ইভেন্টের স্থান</span>
                </label>
                <input
                  type="text"
                  value={config.venue}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, venue: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="আনান সিটি পার্ক, রংপুর"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Field Labels */}
        {activeTab === 'labels' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">কার্ডের টেক্সট প্রিফিক্স (লেবেল সেটিংস)</h4>
                <p className="text-slate-400 text-[11px]">কার্ডের লেখার পূর্বে কোনো নির্দিষ্ট শব্দ (যেমন 'অতিথিঃ ') প্রদর্শনের জন্য ব্যবহার করুন। সদস্যের নিজস্ব তথ্য এখানে লিখবেন না।</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onUpdateConfig({
                    ...config,
                    labelReg: 'নিবন্ধন নং',
                    labelName: '',
                    labelSchool: '',
                    labelDistrict: '',
                    labelGuests: 'অতিথিঃ ',
                    labelPhone: '',
                  });
                }}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition shrink-0"
              >
                ডিফল্ট রিসেট
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">নিবন্ধন লেবেল</label>
                <input
                  type="text"
                  value={config.labelReg}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, labelReg: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                  placeholder="ডিফল্ট: নিবন্ধন নং"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">নামের প্রিফিক্স (সাধারণত খালি)</label>
                <input
                  type="text"
                  value={config.labelName}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, labelName: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                  placeholder="ডিফল্ট খালি থাকবে"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">প্রতিষ্ঠানের প্রিফিক্স (সাধারণত খালি)</label>
                <input
                  type="text"
                  value={config.labelSchool}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, labelSchool: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                  placeholder="ডিফল্ট খালি থাকবে"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">অবস্থানের প্রিফিক্স (সাধারণত খালি)</label>
                <input
                  type="text"
                  value={config.labelDistrict}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, labelDistrict: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                  placeholder="ডিফল্ট খালি থাকবে"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">অতিথির প্রিফিক্স</label>
                <input
                  type="text"
                  value={config.labelGuests}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, labelGuests: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                  placeholder="ডিফল্ট: অতিথিঃ "
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">মোবাইলের প্রিফিক্স (সাধারণত খালি)</label>
                <input
                  type="text"
                  value={config.labelPhone}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, labelPhone: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                  placeholder="ডিফল্ট খালি থাকবে"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Print Options */}
        {activeTab === 'print' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h4 className="font-bold text-sm text-white">প্রিন্ট ও কাটিং সেটিংস</h4>
              <p className="text-slate-400 text-[11px]">A4 পেজে প্রিন্ট করার সুবিধার জন্য অপশনসমূহ</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-950">
                <div>
                  <span className="font-semibold text-slate-200">ফিতা পরানোর স্লট পাঞ্চ গাইড</span>
                  <p className="text-[11px] text-slate-400">কার্ডের ওপরের দিকে ফিতা বা ক্লিপ লাগানোর পাঞ্চিং দাগ দেখাবে</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.showLanyardSlot}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, showLanyardSlot: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-950">
                <div>
                  <span className="font-semibold text-slate-200">কাটিং গাইড দাগ (Crop Marks)</span>
                  <p className="text-[11px] text-slate-400">A4 পেজে ৪টি কার্ড কাঁচি বা কাটার দিয়ে কাটার সুবিধার্থে সূক্ষ্ম গাইডলাইন</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.showCutMarks}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, showCutMarks: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700 focus:ring-emerald-500"
                />
              </label>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-300 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  প্রিন্ট তথ্য:
                </p>
                <p>• কাগজ সাইজ: আন্তর্জাতিক স্ট্যান্ডার্ড A4 (২১০ মিমি × ২৯৭ মিমি)</p>
                <p>• প্রতিটি A4 পাতায় হুবহু ৪টি কার্ড (২×২ গ্রিডে) অবস্থান করবে</p>
                <p>• ব্রাউজার থেকে সরাসরি প্রিন্ট দিতে 'প্রিন্ট' বাটনে ক্লিক করে 'Save as PDF' বা প্রিন্টার নির্বাচন করুন</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
