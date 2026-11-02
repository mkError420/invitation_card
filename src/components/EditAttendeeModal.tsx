import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Camera,
  Trash2,
  Phone,
  School,
  MapPin,
  Users,
  Hash,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Attendee } from '../types';

interface EditAttendeeModalProps {
  isOpen: boolean;
  attendee: Attendee | null;
  onClose: () => void;
  onSave: (updated: Attendee) => Promise<boolean | void> | void;
}

export const EditAttendeeModal: React.FC<EditAttendeeModalProps> = ({
  isOpen,
  attendee,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Attendee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form data whenever the attendee prop changes
  useEffect(() => {
    if (attendee) {
      setFormData({ ...attendee });
      setErrorMsg(null);
      setSuccessMsg(null);
    } else {
      setFormData(null);
    }
  }, [attendee, isOpen]);

  if (!isOpen || !formData) return null;

  const handleInputChange = (field: keyof Attendee, value: string) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('ছবির সাইজ সর্বোচ্চ ১০ মেগাবাইট হতে পারবে।');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleInputChange('photoUrl', reader.result);
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    handleInputChange('photoUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('সদস্যের নাম পূরণ করা আবশ্যক।');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await onSave(formData);
      setSuccessMsg('তথ্য সফলভাবে ডাটাবেজে আপডেট করা হয়েছে!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || 'ডাটাবেজে আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 font-bangla">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>সদস্য তথ্য এডিট করুন</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                  {formData.regNo || 'আইডি'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                ডাটাবেজ ও আমন্ত্রণ কার্ডের জন্য তথ্য পরিবর্তন ও সংরক্ষণ করুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Photo Upload Section */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-800 shrink-0 flex items-center justify-center">
              {formData.photoUrl ? (
                <img
                  src={formData.photoUrl}
                  alt={formData.name || 'সদস্যের ছবি'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-slate-500" />
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="block text-slate-300 font-semibold text-xs">
                সদস্যের ছবি
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formData.photoUrl ? 'ছবি পরিবর্তন' : 'নতুন ছবি আপলোড'}</span>
                </button>

                {formData.photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-medium border border-rose-500/30 transition"
                    title="ছবি মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মুছুন</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                JPG, PNG বা WEBP (সর্বোচ্চ ১০ মেগাবাইট)
              </p>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Registration Number */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                <span>নিবন্ধন নম্বর</span>
              </label>
              <input
                type="text"
                value={formData.regNo}
                onChange={(e) => handleInputChange('regNo', e.target.value)}
                placeholder="০০০১"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>সদস্যের নাম <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="যেমন: এস এম জাহিদ রানা"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            {/* School / Institution */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-emerald-400" />
                <span>স্কুল / শিক্ষাপ্রতিষ্ঠান</span>
              </label>
              <input
                type="text"
                value={formData.school}
                onChange={(e) => handleInputChange('school', e.target.value)}
                placeholder="যেমন: রংপুর জেলা স্কুল"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            {/* District / Location */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>জেলা / বর্তমান অবস্থান</span>
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleInputChange('district', e.target.value)}
                placeholder="যেমন: রংপুর"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            {/* Guests */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>অতিথি সংখ্যা</span>
              </label>
              <input
                type="text"
                value={formData.guests}
                onChange={(e) => handleInputChange('guests', e.target.value)}
                placeholder="যেমন: ১ অথবা ২"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            {/* Mobile / Phone */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>মোবাইল নম্বর</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="০১৭XXXXXXXX"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
            >
              বাতিল
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950/60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ডাটাবেজে সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

