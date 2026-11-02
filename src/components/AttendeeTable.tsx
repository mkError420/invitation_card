import React, { useState, useRef } from 'react';
import { UserPlus, Trash2, Search, Eye, Image, RefreshCw, Images, CheckCircle, Camera } from 'lucide-react';
import { Attendee } from '../types';
import { matchPhotosToAttendees } from '../utils/csvHelper';

interface AttendeeTableProps {
  attendees: Attendee[];
  selectedAttendeeId: string;
  onSelectAttendee: (id: string) => void;
  onAddAttendee: (attendee: Omit<Attendee, 'id'>) => void;
  onUpdateAttendee: (attendee: Attendee) => void;
  onDeleteAttendee: (id: string) => void;
  onLoadSampleData: () => void;
  onPhotoUpload: (id: string, photoUrl: string) => void;
}

export const AttendeeTable: React.FC<AttendeeTableProps> = ({
  attendees,
  selectedAttendeeId,
  onSelectAttendee,
  onAddAttendee,
  onUpdateAttendee,
  onDeleteAttendee,
  onLoadSampleData,
  onPhotoUpload,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkPhotoMsg, setBulkPhotoMsg] = useState<string | null>(null);
  const bulkPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleBulkPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const fileList = Array.from(files);
      const { updatedAttendees, matchedCount } = await matchPhotosToAttendees(fileList, attendees);

      for (const att of updatedAttendees) {
        const original = attendees.find((a) => a.id === att.id);
        if (original && att.photoUrl && att.photoUrl !== original.photoUrl) {
          onPhotoUpload(att.id, att.photoUrl);
        }
      }

      setBulkPhotoMsg(`সফলভাবে ${matchedCount} জন সদস্যের ছবি যুক্ত ও সংরক্ষণ করা হয়েছে!`);
      setTimeout(() => setBulkPhotoMsg(null), 6000);
    } catch (err: any) {
      alert('ছবি আপলোডে সমস্যা হয়েছে: ' + (err?.message || ''));
    }
  };
  const [newAttendee, setNewAttendee] = useState({
    regNo: '',
    name: '',
    school: 'রংপুর জেলা স্কুল',
    district: 'রংপুর',
    guests: '১',
    phone: '০১৭XXXXXXXX',
    photoUrl: '',
  });

  const filteredAttendees = attendees.filter(
    (att) =>
      att.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.district.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendee.name.trim()) return;

    onAddAttendee({
      ...newAttendee,
      regNo: newAttendee.regNo || String(1000 + attendees.length + 1),
    });

    setNewAttendee({
      regNo: '',
      name: '',
      school: 'রংপুর জেলা স্কুল',
      district: 'রংপুর',
      guests: '১',
      phone: '০১৭XXXXXXXX',
      photoUrl: '',
    });
    setShowAddForm(false);
  };

  const handleInlineFileChange = (attendeeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onPhotoUpload(attendeeId, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col font-bangla">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">নিবন্ধিত সদস্যদের তালিকা</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300">
              মোট: {attendees.length} জন
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            যে কোনো সদস্যের কার্ড প্রিভিউ দেখতে তাদের সারিতে ক্লিক করুন
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>নতুন সদস্য যোগ</span>
          </button>

          <button
            onClick={() => bulkPhotoInputRef.current?.click()}
            title="কম্পিউটার থেকে সদস্যদের ছবিসমূহ একসাথে নির্বাচন করুন (যেমন: 1001.jpg, 1002.png)"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-xs"
          >
            <Images className="w-4 h-4" />
            <span>বাল্ক ছবি আপলোড</span>
          </button>
          <input
            ref={bulkPhotoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleBulkPhotos}
          />

          <button
            onClick={onLoadSampleData}
            title="৮ জনের নমুনা ডেটা লোড করুন"
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">নমুনা ডেটা</span>
          </button>
        </div>
      </div>

      {bulkPhotoMsg && (
        <div className="mb-3 p-2.5 bg-emerald-950/60 border border-emerald-700 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bulkPhotoMsg}</span>
        </div>
      )}

      {/* Quick Add Form Modal/Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="mb-4 p-4 bg-slate-850 border border-emerald-500/30 rounded-xl space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <h4 className="text-xs font-bold text-emerald-400">সদস্যের তথ্য পূরণ করুন</h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              বন্ধ করুন
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">নিবন্ধন নং</label>
              <input
                type="text"
                placeholder="১০৩৪"
                value={newAttendee.regNo}
                onChange={(e) => setNewAttendee({ ...newAttendee, regNo: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">নাম *</label>
              <input
                type="text"
                required
                placeholder="সদস্যের নাম"
                value={newAttendee.name}
                onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">স্কুল</label>
              <input
                type="text"
                value={newAttendee.school}
                onChange={(e) => setNewAttendee({ ...newAttendee, school: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">জেলা অবস্থান</label>
              <input
                type="text"
                value={newAttendee.district}
                onChange={(e) => setNewAttendee({ ...newAttendee, district: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">অতিথি সংখ্যা</label>
              <input
                type="text"
                value={newAttendee.guests}
                onChange={(e) => setNewAttendee({ ...newAttendee, guests: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">মোবাইল নম্বর</label>
              <input
                type="text"
                value={newAttendee.phone}
                onChange={(e) => setNewAttendee({ ...newAttendee, phone: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">ছবি আপলোড</label>
              <div className="flex items-center gap-2">
                {newAttendee.photoUrl ? (
                  <div className="flex items-center gap-2 w-full">
                    <img
                      src={newAttendee.photoUrl}
                      alt="Preview"
                      className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shrink-0 bg-slate-850"
                    />
                    <label className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition text-[11px] font-medium border border-slate-700">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ছবি পরিবর্তন</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setNewAttendee({ ...newAttendee, photoUrl: reader.result });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewAttendee({ ...newAttendee, photoUrl: '' })}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                      title="ছবি বাদ দিন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-emerald-500 rounded-lg cursor-pointer transition text-slate-300 text-xs font-medium">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>ছবি নির্বাচন করুন</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setNewAttendee({ ...newAttendee, photoUrl: reader.result });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
            >
              সংরক্ষণ করুন
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="নাম, নিবন্ধন নম্বর বা স্কুল লিখে সার্চ করুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Attendees Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3 w-12 text-center">ছবি</th>
              <th className="p-3">নিবন্ধন নং</th>
              <th className="p-3">নাম</th>
              <th className="p-3">স্কুল</th>
              <th className="p-3">জেলা</th>
              <th className="p-3">অতিথি</th>
              <th className="p-3">মোবাইল</th>
              <th className="p-3 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredAttendees.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  কোনো সদস্য পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              filteredAttendees.map((att) => {
                const isSelected = att.id === selectedAttendeeId;
                return (
                  <tr
                    key={att.id}
                    onClick={() => onSelectAttendee(att.id)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-emerald-950/40 border-l-4 border-l-emerald-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Photo thumbnail */}
                    <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <label className="relative inline-block w-8 h-8 rounded-full overflow-hidden border border-emerald-500/40 cursor-pointer group bg-slate-800">
                        {att.photoUrl ? (
                          <img
                            src={att.photoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                            ডিফল্ট
                          </div>
                        )}
                        <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Image className="w-3.5 h-3.5 text-white" />
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleInlineFileChange(att.id, e)}
                        />
                      </label>
                    </td>

                    {/* Reg No */}
                    <td className="p-3 font-semibold text-emerald-400 font-mono">
                      {att.regNo}
                    </td>

                    {/* Name */}
                    <td className="p-3 font-medium text-slate-200">
                      {att.name}
                    </td>

                    {/* School */}
                    <td className="p-3 text-slate-300 max-w-[150px] truncate">
                      {att.school}
                    </td>

                    {/* District */}
                    <td className="p-3 text-slate-400">
                      {att.district}
                    </td>

                    {/* Guests */}
                    <td className="p-3 text-slate-300 font-semibold">
                      {att.guests}
                    </td>

                    {/* Phone */}
                    <td className="p-3 text-slate-400 font-mono">
                      {att.phone}
                    </td>

                    {/* Actions */}
                    <td
                      className="p-3 text-right space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onSelectAttendee(att.id)}
                        className={`p-1.5 rounded-md transition ${
                          isSelected
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="কার্ড প্রিভিউ দেখুন"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {attendees.length > 1 && (
                        <button
                          onClick={() => onDeleteAttendee(att.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
