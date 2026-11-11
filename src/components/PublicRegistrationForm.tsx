import React, { useState, useRef } from 'react';
import {
  Camera,
  Trash2,
  CheckCircle2,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  Send,
  AlertCircle,
  RefreshCw,
  PartyPopper,
  ShieldCheck,
} from 'lucide-react';
import { Attendee, EventConfig, DEFAULT_EVENT_CONFIG } from '../types';
import { api } from '../services/api';

interface PublicRegistrationFormProps {
  config?: EventConfig;
  onRegistered?: (attendee: Attendee) => void;
}

export const PublicRegistrationForm: React.FC<PublicRegistrationFormProps> = ({
  config = DEFAULT_EVENT_CONFIG,
  onRegistered,
}) => {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [district, setDistrict] = useState('');
  const [guests, setGuests] = useState('১');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedAttendee, setSubmittedAttendee] = useState<Attendee | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage('ছবির সাইজ অনেক বড়। অনুগ্রহ করে ৮ মেগাবাইট বা তার ছোট ছবি নির্বাচন করুন।');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
          setErrorMessage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage('অনুগ্রহ করে তোমার পুরো নাম পূরণ করো।');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // 1. Upload photo to server if base64 provided
      let finalPhoto = photoUrl;
      if (finalPhoto && finalPhoto.startsWith('data:image')) {
        try {
          const uploadedUrl = await api.uploadPhoto(finalPhoto);
          if (uploadedUrl) finalPhoto = uploadedUrl;
        } catch (uploadErr) {
          console.warn('Photo upload note:', uploadErr);
        }
      }

      // 2. Submit to backend API with automatic sequential ID generation
      const savedAttendee = await api.registerPublicAttendee({
        name: name.trim(),
        school: school.trim(),
        district: district.trim(),
        guests: guests.trim() || '১',
        phone: phone.trim(),
        photoUrl: finalPhoto,
      });

      setSubmittedAttendee(savedAttendee);
      if (onRegistered) {
        onRegistered(savedAttendee);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(err?.message || 'নিবন্ধনে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করো।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setSchool('');
    setDistrict('');
    setGuests('১');
    setPhone('');
    setPhotoUrl('');
    setSubmittedAttendee(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-bangla flex flex-col justify-between py-6 px-3 sm:px-6">
      <div className="max-w-xl mx-auto w-full">
        {/* Top Header Card */}
        <div className="bg-gradient-to-b from-emerald-900/50 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden mb-6">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Event Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">

            <span>{config.headerArcTitle || 'এসএসসি ৮৮ ব্যাচের বন্ধুদের মিলনমেলা'}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wide mb-2 drop-shadow-md">
            {config.mainTitle || 'বাহের ডাক'}
          </h1>

          {/* Slogan */}
          <p className="text-emerald-300 font-medium text-sm sm:text-base mb-4 leading-relaxed">
            {config.slogan1 || 'স্মৃতির আবেশে...বন্ধুত্বের উচ্ছ্বাসে...'}
            <br />
            <span className="text-emerald-400 font-bold">{config.slogan2 || 'আমরা আবার এক সাথে'}</span>
          </p>

          {/* Date & Venue Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-emerald-800/30 text-xs text-slate-300">
            <div className="flex items-center gap-1 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{config.date || '১৮ ডিসেম্বর, ২০২৬'}</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{config.venue || 'আনান সিটি পার্ক, রংপুর'}</span>
            </div>
          </div>
        </div>

        {/* SUCCESS CONFIRMATION VIEW */}
        {submittedAttendee ? (
          <div className="bg-slate-900 border border-emerald-600/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <PartyPopper className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
                নিবন্ধন সফল হয়েছে! 🎉
              </h2>
              <p className="text-slate-300 text-sm">
                মিলনমেলায় তোমার উপস্থিতি নিশ্চিত হয়েছে। তোমার তথ্য ডাটাবেজে সংরক্ষিত রয়েছে।
              </p>
            </div>

            {/* Generated Registration ID Badge */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 border-2 border-emerald-500/60 rounded-2xl shadow-inner">
              <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1">
                তোমার অনন্য নিবন্ধন আইডি নম্বর
              </div>
              <div className="text-4xl sm:text-5xl font-black text-emerald-300 tracking-widest font-mono">
                {submittedAttendee.regNo}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                (এই আইডি নম্বরটি ইনভাইটেশন কার্ড ও ভেন্যু প্রবেশের জন্য সংরক্ষিত থাকবে)
              </p>
            </div>

            {/* Submitted Summary Details */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left text-xs sm:text-sm space-y-2">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">নাম:</span>
                <span className="font-bold text-white text-right">{submittedAttendee.name}</span>
              </div>
              {submittedAttendee.school && (
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">প্রতিষ্ঠান:</span>
                  <span className="font-semibold text-slate-200 text-right">{submittedAttendee.school}</span>
                </div>
              )}
              {submittedAttendee.district && (
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">জেলা / ঠিকানা:</span>
                  <span className="font-semibold text-slate-200 text-right">{submittedAttendee.district}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">অতিথি সংখ্যা:</span>
                <span className="font-semibold text-emerald-300 text-right">{submittedAttendee.guests} জন</span>
              </div>
              {submittedAttendee.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-400">মোবাইল:</span>
                  <span className="font-mono text-slate-200 text-right">{submittedAttendee.phone}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 border border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>প্রয়োজনে আরেকটি নিবন্ধন করুন</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>তথ্যটি নিরাপদে সার্ভার ডাটাবেজে সংরক্ষিত হয়েছে</span>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM VIEW */
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5"
          >
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  অংশগ্রহণ নিশ্চিতকরণ ফর্ম
                </h2>
                <p className="text-slate-400 text-xs">
                  নিচের তথ্যগুলো দিয়ে সাবমিট করলে তোমার নাম ও কার্ড স্বয়ংক্রিয়ভাবে তৈরি হবে।
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                মুক্ত নিবন্ধন
              </span>
            </div>

            {/* Profile Photo Uploader */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-emerald-500/40 flex items-center justify-center shrink-0 shadow-md">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="প্রোফাইল ছবি"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Camera className="w-7 h-7 mb-1 text-slate-400" />
                    <span className="text-[10px]">ছবি যুক্ত করো</span>
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="text-xs text-slate-300 font-semibold">
                  কার্ডের জন্য তোমার ছবি (ঐচ্ছিক)
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{photoUrl ? 'ছবি পরিবর্তন' : 'ছবি নির্বাচন করো'}</span>
                  </button>

                  {photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>মুছুন</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  পরিষ্কার পাসপোর্ট বা পোর্ট্রেট সাইজ ছবি দিলে কার্ডটি দেখতে চমৎকার লাগবে।
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Name Field (Required) */}
            <div>
              <label className="block text-slate-300 font-semibold text-xs sm:text-sm mb-1.5">
                তোমার পুরো নাম <span className="text-rose-400 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: মোঃ আসাদুল করিম"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* School / Institution Field */}
            <div>
              <label className="block text-slate-300 font-semibold text-xs sm:text-sm mb-1.5">
                স্কুল / প্রতিষ্ঠানের নাম
              </label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="যেমন: রংপুর জেলা স্কুল"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* District / Address Field */}
            <div>
              <label className="block text-slate-300 font-semibold text-xs sm:text-sm mb-1.5">
                জেলা / বর্তমান অবস্থান
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="যেমন: রংপুর সদর, রংপুর"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Guests Count Selector */}
            <div>
              <label className="block text-slate-300 font-semibold text-xs sm:text-sm mb-1.5">
                সাথে অতিথি সংখ্যা (তুমি সহ মোট উপস্থিতি)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['১', '২', '৩', '৪'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGuests(val)}
                    className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold border transition ${guests === val
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                  >
                    {val} জন
                  </button>
                ))}
              </div>
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="block text-slate-300 font-semibold text-xs sm:text-sm mb-1.5">
                মোবাইল / হোয়াটসঅ্যাপ নম্বর
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="০১৭XXXXXXXX"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-sm sm:text-base font-bold shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>নিবন্ধন জমা নেওয়া হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>নিবন্ধন সম্পন্ন করুন (Submit)</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              * সাবমিট করার সাথে সাথে তোমার জন্য একটি ধারাবাহিক আইডি নম্বর তৈরি হবে এবং তা অ্যাডমিন ডাটাবেজে যুক্ত হয়ে যাবে।
            </p>
          </form>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 mt-8 pb-2">
        {config.mainTitle || 'বাহের ডাক'} © {new Date().getFullYear()} • এসএসসি ৮৮ ব্যাচ পুনর্মিলনী
      </footer>
    </div>
  );
};

