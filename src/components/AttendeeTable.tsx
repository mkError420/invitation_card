import React, { useState } from 'react';
import {
  UserPlus,
  Trash2,
  Search,
  Eye,
  Image,
  CheckCircle,
  Camera,
  Printer,
  Pencil,
  Share2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  GripVertical,
  Info,
  X,
  Archive,
  RotateCcw,
  Users,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Attendee, EventConfig, DEFAULT_EVENT_CONFIG } from '../types';
import { getNextRegNo, formatRegNo, toBengaliNumber, toEnglishNumber } from '../utils/bengaliNumerals';
import { EditAttendeeModal } from './EditAttendeeModal';
import { PrintAttendeeModal } from './PrintAttendeeModal';

interface AttendeeTableProps {
  attendees: Attendee[];
  archivedAttendees?: Attendee[];
  selectedAttendeeId: string;
  config?: EventConfig;
  onSelectAttendee: (id: string) => void;
  onAddAttendee: (attendee: Omit<Attendee, 'id'>) => void;
  onUpdateAttendee: (attendee: Attendee) => Promise<boolean | void> | void;
  onDeleteAttendee: (id: string) => void;
  onRestoreAttendee?: (id: string) => void;
  onRestoreAllAttendees?: () => void;
  onPermanentDeleteAttendee?: (id: string) => void;
  onClearArchive?: () => void;
  onReorderAttendees?: (reorderedList: Attendee[]) => Promise<void> | void;
  onPhotoUpload: (id: string, photoUrl: string) => void;
  onBulkPrint?: () => void;
  onPrintAttendee?: (attendee: Attendee, mode: 'single' | 'sheet4') => void;
  onShareFormLink?: () => void;
  isPreparingPrint?: boolean;
}

export const AttendeeTable: React.FC<AttendeeTableProps> = ({
  attendees,
  archivedAttendees = [],
  selectedAttendeeId,
  config = DEFAULT_EVENT_CONFIG,
  onSelectAttendee,
  onAddAttendee,
  onUpdateAttendee,
  onDeleteAttendee,
  onRestoreAttendee,
  onRestoreAllAttendees,
  onPermanentDeleteAttendee,
  onClearArchive,
  onReorderAttendees,
  onPhotoUpload,
  onBulkPrint,
  onPrintAttendee,
  onShareFormLink,
  isPreparingPrint = false,
}) => {
  const [tableMode, setTableMode] = useState<'active' | 'archive'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [printingAttendee, setPrintingAttendee] = useState<Attendee | null>(null);

  // Position change & reordering states
  const [placeModalData, setPlaceModalData] = useState<{ attendee: Attendee; currentIndex: number } | null>(null);
  const [targetPlaceInput, setTargetPlaceInput] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [newAttendee, setNewAttendee] = useState({
    regNo: '',
    name: '',
    school: 'রংপুর জেলা স্কুল',
    district: 'রংপুর',
    guests: '১',
    phone: '০১৭XXXXXXXX',
    photoUrl: '',
  });

  const savedAttendees = attendees.filter((a) => a.name.trim() !== '');
  const filteredAttendees = savedAttendees.filter(
    (att) =>
      att.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArchived = (archivedAttendees || []).filter(
    (att) =>
      att.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (att.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatArchivedDateTime = (dateStr?: string) => {
    if (!dateStr) return 'তারিখ পাওয়া যায়নি';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const dateFormatted = d.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeFormatted = d.toLocaleTimeString('bn-BD', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dateFormatted}, ${timeFormatted}`;
    } catch {
      return dateStr;
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const handleRestoreAttendeeClick = (att: Attendee) => {
    if (onRestoreAttendee) {
      onRestoreAttendee(att.id);
      showFeedback(`'${att.name}' কে সফলভাবে সক্রিয় তালিকায় ফিরিয়ে আনা হয়েছে (রিস্টোর করা হয়েছে)!`);
    }
  };

  const handlePermanentDeleteClick = (att: Attendee) => {
    if (onPermanentDeleteAttendee) {
      onPermanentDeleteAttendee(att.id);
      showFeedback(`'${att.name}' কে আর্কাইভ ও ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে।`);
    }
  };

  const handleRestoreAllClick = () => {
    if (onRestoreAllAttendees) {
      onRestoreAllAttendees();
      showFeedback('আর্কাইভের সকল সদস্যকে সফলভাবে সক্রিয় তালিকায় রিস্টোর করা হয়েছে!');
    }
  };

  const handleClearArchiveClick = () => {
    if (onClearArchive) {
      onClearArchive();
      showFeedback('আর্কাইভ সম্পূর্ণ খালি করা হয়েছে।');
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0 || !onReorderAttendees) return;
    const updated = [...savedAttendees];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;

    // Resequence registration IDs sequentially (0001, 0002...)
    const resequenced = updated.map((item, idx) => ({
      ...item,
      regNo: formatRegNo(idx + 1),
    }));

    onReorderAttendees(resequenced);
    showFeedback(`'${updated[index - 1].name}' এক ধাপ উপরে স্থানান্তর করা হয়েছে এবং আইডি সমন্বয় করা হয়েছে`);
  };

  const handleMoveDown = (index: number) => {
    if (index >= savedAttendees.length - 1 || !onReorderAttendees) return;
    const updated = [...savedAttendees];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;

    // Resequence registration IDs sequentially (0001, 0002...)
    const resequenced = updated.map((item, idx) => ({
      ...item,
      regNo: formatRegNo(idx + 1),
    }));

    onReorderAttendees(resequenced);
    showFeedback(`'${updated[index + 1].name}' এক ধাপ নিচে স্থানান্তর করা হয়েছে এবং আইডি সমন্বয় করা হয়েছে`);
  };

  const handleChangePlace = (fromIndex: number, targetPosition1Based: number) => {
    if (!onReorderAttendees) return;
    const targetIdx = Math.max(0, Math.min(savedAttendees.length - 1, targetPosition1Based - 1));
    if (fromIndex === targetIdx) return;

    const updated = [...savedAttendees];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(targetIdx, 0, movedItem);

    // Resequence registration IDs sequentially (0001, 0002...)
    const resequenced = updated.map((item, idx) => ({
      ...item,
      regNo: formatRegNo(idx + 1),
    }));

    onReorderAttendees(resequenced);
    showFeedback(`'${movedItem.name}' কে ${toBengaliNumber(targetIdx + 1)} নং অবস্থানে স্থানান্তর করা হয়েছে এবং সকল আইডি আপডেট করা হয়েছে`);
  };

  const handleOpenPlaceModal = (att: Attendee, currIdx: number) => {
    setPlaceModalData({ attendee: att, currentIndex: currIdx });
    setTargetPlaceInput(String(currIdx + 1));
  };

  const handleConfirmPlaceModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!placeModalData) return;
    const cleanDigits = toEnglishNumber(targetPlaceInput).replace(/\D/g, '');
    const num = parseInt(cleanDigits, 10);
    if (!isNaN(num) && num >= 1 && num <= savedAttendees.length) {
      handleChangePlace(placeModalData.currentIndex, num);
      setPlaceModalData(null);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendee.name.trim()) return;

    onAddAttendee({
      ...newAttendee,
      regNo: newAttendee.regNo ? formatRegNo(newAttendee.regNo) : getNextRegNo(attendees),
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

  const handlePrintModalTrigger = (attendee: Attendee, mode: 'single' | 'sheet4') => {
    if (onPrintAttendee) {
      onPrintAttendee(attendee, mode);
    }
    setPrintingAttendee(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col font-bangla">
      {/* Header & Controls with Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setTableMode('active');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  tableMode === 'active'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>সক্রিয় সদস্য</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  tableMode === 'active' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-300'
                }`}>
                  {toBengaliNumber(savedAttendees.length)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTableMode('archive');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  tableMode === 'archive'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>আর্কাইভ</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  tableMode === 'archive'
                    ? 'bg-amber-800 text-amber-100'
                    : (archivedAttendees?.length || 0) > 0
                    ? 'bg-amber-500/20 text-amber-400 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {toBengaliNumber(archivedAttendees?.length || 0)}
                </span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            {tableMode === 'active'
              ? 'সদস্যদের উপরে/নিচে স্থানান্তর (Change Place) করতে ড্র্যাগ করুন বা ↑ / ↓ ব্যবহার করুন। স্থান পরিবর্তনের সাথে সাথে নিবন্ধন নম্বর (আইডি) স্বয়ংক্রিয়ভাবে পুনর্নির্ধারণ হবে।'
              : 'মুছে ফেলা সদস্যরা এই আর্কাইভে সংরক্ষিত থাকে। আপনি যেকোনো সদস্যকে পুনরায় সক্রিয় তালিকায় ফিরিয়ে নিতে (Restore) পারেন অথবা স্থায়ীভাবে মুছে ফেলতে পারেন।'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {tableMode === 'active' ? (
            <>
              {onShareFormLink && (
                <button
                  type="button"
                  onClick={onShareFormLink}
                  title="আমন্ত্রিত বন্ধুদের জন্য অনলাইন নিবন্ধন ফর্ম লিংক কপি করুন"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-teal-950/80 hover:bg-teal-900 border border-teal-700/60 text-teal-300 hover:text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>আমন্ত্রণ ফর্ম লিংক</span>
                </button>
              )}

              {onBulkPrint && (
                <button
                  type="button"
                  onClick={onBulkPrint}
                  disabled={isPreparingPrint || attendees.length === 0}
                  title="সকল নিবন্ধিত সদস্যের কার্ড একসাথে A4 সাইজে (৪টি/পেজ) সরাসরি প্রিন্ট করুন"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>{isPreparingPrint ? 'প্রস্তুত হচ্ছে...' : 'Bulk Print (সব কার্ড)'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!showAddForm) {
                    setNewAttendee((prev) => ({ ...prev, regNo: getNextRegNo(attendees) }));
                  }
                  setShowAddForm(!showAddForm);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition border border-slate-700 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>নতুন সদস্য যোগ</span>
              </button>
            </>
          ) : (
            <>
              {(archivedAttendees?.length || 0) > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleRestoreAllClick}
                    title="আর্কাইভের সকল সদস্যকে একসাথে সক্রিয় তালিকায় ফিরিয়ে আনুন"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>সব রিস্টোর করুন ({toBengaliNumber(archivedAttendees?.length || 0)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearArchiveClick}
                    title="আর্কাইভের সব সদস্যকে স্থায়ীভাবে ডাটাবেজ থেকে মুছে ফেলুন"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 hover:text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>আর্কাইভ খালি করুন</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setTableMode('active');
                  setSearchTerm('');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition border border-slate-700 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>সক্রিয় তালিকায় ফিরুন</span>
              </button>
            </>
          )}
        </div>
      </div>

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
                placeholder="০০০১"
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
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              সংরক্ষণ করুন
            </button>
          </div>
        </form>
      )}

      {/* Search Input & Notices */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              tableMode === 'active'
                ? 'সক্রিয় সদস্যদের মধ্যে নাম, নিবন্ধন নম্বর, স্কুল বা মোবাইল লিখে সার্চ করুন...'
                : 'আর্কাইভে নাম, পূর্বের আইডি, স্কুল বা মোবাইল লিখে সার্চ করুন...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {feedbackMessage && (
          <div className="p-2.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-emerald-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {tableMode === 'active' && searchTerm.trim() !== '' && (
          <div className="p-2 bg-amber-950/40 border border-amber-600/30 rounded-xl text-amber-300/90 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>ফিল্টার চালু থাকা অবস্থায় ক্রম পরিবর্তন নিষ্ক্রিয় থাকে। সদস্যদের স্থান বা আইডি পরিবর্তন করতে উপরের সার্চ বক্স খালি করুন।</span>
          </div>
        )}
      </div>

      {/* Attendees Table or Archive Table */}
      {tableMode === 'active' ? (
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3 w-32 text-center" title="উপরে/নিচে বাটন চেপে বা টেনে স্থান পরিবর্তন করুন">ক্রম ও অবস্থান</th>
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
                <td colSpan={9} className="p-6 text-center text-slate-500">
                  কোনো সদস্য পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              filteredAttendees.map((att) => {
                const isSelected = att.id === selectedAttendeeId;
                const originalIndex = savedAttendees.findIndex((a) => a.id === att.id);
                const isDraggingThis = draggedIndex === originalIndex;
                const isDragOverThis = dragOverIndex === originalIndex;

                return (
                  <tr
                    key={att.id}
                    draggable={!searchTerm.trim()}
                    onDragStart={(e) => {
                      if (searchTerm.trim()) return;
                      e.dataTransfer.setData('text/plain', String(originalIndex));
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedIndex(originalIndex);
                    }}
                    onDragOver={(e) => {
                      if (searchTerm.trim()) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverIndex !== originalIndex) {
                        setDragOverIndex(originalIndex);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === originalIndex) {
                        setDragOverIndex(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (searchTerm.trim()) return;
                      e.preventDefault();
                      if (draggedIndex !== null && draggedIndex !== originalIndex) {
                        handleChangePlace(draggedIndex, originalIndex + 1);
                      }
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onClick={() => onSelectAttendee(att.id)}
                    className={`cursor-pointer transition select-none ${
                      isDraggingThis
                        ? 'opacity-40 bg-slate-800 border-2 border-dashed border-emerald-500'
                        : isDragOverThis
                        ? 'bg-emerald-950/60 ring-2 ring-emerald-500'
                        : isSelected
                        ? 'bg-emerald-950/40 border-l-4 border-l-emerald-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Position / Move Controls Column */}
                    <td
                      className="p-2 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {/* Drag Handle */}
                        <div
                          className={`p-1 text-slate-500 hover:text-slate-300 transition ${
                            searchTerm ? 'opacity-25 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                          }`}
                          title={searchTerm ? 'সার্চ থাকা অবস্থায় ড্র্যাগ নিষ্ক্রিয়' : 'মাউস দিয়ে টেনে উপরে বা নিচে সরান'}
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Serial Number & Change Place Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenPlaceModal(att, originalIndex)}
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/60 transition inline-flex items-center gap-1"
                          title="সরাসরি নির্দিষ্ট অবস্থানে সরান (Change Place)"
                        >
                          <span>{toBengaliNumber(originalIndex + 1)}</span>
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />
                        </button>

                        {/* Move Up Button */}
                        <button
                          type="button"
                          disabled={originalIndex <= 0 || !!searchTerm}
                          onClick={() => handleMoveUp(originalIndex)}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                          title="এক ধাপ উপরে সরান (Move Up)"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>

                        {/* Move Down Button */}
                        <button
                          type="button"
                          disabled={originalIndex >= savedAttendees.length - 1 || !!searchTerm}
                          onClick={() => handleMoveDown(originalIndex)}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                          title="এক ধাপ নিচে সরান (Move Down)"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

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
                      className="p-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1 justify-end">
                        {/* 1. Preview Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAttendee(att.id);
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            isSelected
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                          title="কার্ড প্রিভিউ দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* 2. Edit Button (Opens Popup for editing) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAttendee(att);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition"
                          title="সদস্য তথ্য এডিট করুন (পপআপ)"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* 3. Print Button (Opens Print Popup / Triggers Print) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintingAttendee(att);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                          title="এই সদস্যের কার্ড প্রিন্ট করুন"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* 4. Delete (Move to Archive) Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAttendee(att.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                          title="আর্কাইভে পাঠান (মুছে ফেলা সদস্যকে যেকোনো সময় আর্কাইভ থেকে রিস্টোর করা যাবে)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      ) : (
        /* ARCHIVE TABLE VIEW */
        <div className="space-y-3">
          <div className="p-2.5 bg-amber-950/20 border border-amber-700/30 rounded-xl text-amber-300/90 text-xs flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-400 shrink-0" />
            <span>মুছে ফেলা সদস্যরা এখানে সুরক্ষিতভাবে জমা থাকে। আপনি যেকোনো সদস্যকে পুনরায় সক্রিয় তালিকায় ফিরিয়ে নিতে (Restore) পারেন অথবা স্থায়ীভাবে মুছে ফেলতে পারেন।</span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 w-12 text-center">ক্রঃ</th>
                  <th className="p-3 w-12 text-center">ছবি</th>
                  <th className="p-3">পূর্বের আইডি</th>
                  <th className="p-3">নাম</th>
                  <th className="p-3">প্রতিষ্ঠান</th>
                  <th className="p-3">জেলা</th>
                  <th className="p-3">অতিথি</th>
                  <th className="p-3">মোবাইল</th>
                  <th className="p-3">আর্কাইভের সময়</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredArchived.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      {searchTerm.trim() ? (
                        <div className="space-y-1">
                          <p className="text-slate-300 font-medium">'{searchTerm}' এর সাথে মিলে এমন কোনো আর্কাইভ সদস্য পাওয়া যায়নি।</p>
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="text-xs text-amber-400 hover:underline cursor-pointer"
                          >
                            সার্চ রিসেট করুন
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2 py-6">
                          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-1">
                            <Archive className="w-6 h-6" />
                          </div>
                          <div className="font-bold text-slate-200">আর্কাইভ বর্তমানে সম্পূর্ণ খালি</div>
                          <div className="text-slate-500 text-[11px] max-w-sm">
                            সক্রিয় সদস্যদের তালিকা থেকে কোনো সদস্য মুছে ফেলা হলে তিনি সরাসরি এই আর্কাইভে সংরক্ষিত হবেন এবং যেকোনো সময় রিস্টোর করা যাবে।
                          </div>
                          <button
                            type="button"
                            onClick={() => setTableMode('active')}
                            className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-700 cursor-pointer"
                          >
                            সক্রিয় সদস্যদের তালিকায় ফিরুন
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredArchived.map((att, idx) => (
                    <tr key={att.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 text-center font-mono text-slate-500">
                        {toBengaliNumber(idx + 1)}
                      </td>
                      <td className="p-2 text-center">
                        <div className="inline-block w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
                          {att.photoUrl ? (
                            <img src={att.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                              ডিফল্ট
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-amber-400 font-mono">
                        {att.regNo}
                      </td>
                      <td className="p-3 font-medium text-slate-200">
                        {att.name}
                      </td>
                      <td className="p-3 text-slate-300 max-w-[150px] truncate">
                        {att.school || '—'}
                      </td>
                      <td className="p-3 text-slate-400">
                        {att.district || '—'}
                      </td>
                      <td className="p-3 text-slate-300 font-semibold">
                        {att.guests || '১'}
                      </td>
                      <td className="p-3 text-slate-400 font-mono">
                        {att.phone || '—'}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{formatArchivedDateTime(att.archivedAt)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleRestoreAttendeeClick(att)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-500 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                            title="এই সদস্যকে সক্রিয় তালিকায় ফিরিয়ে আনুন (Restore)"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>রিস্টোর</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePermanentDeleteClick(att)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="ডাটাবেজ ও আর্কাইভ থেকে স্থায়ীভাবে মুছে ফেলুন (Permanently Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Change Place / Reorder Position Modal */}
      {placeModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">সদস্যের অবস্থান (ক্রম) পরিবর্তন</h3>
              </div>
              <button
                type="button"
                onClick={() => setPlaceModalData(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="text-slate-300">
                <span className="text-slate-400">সদস্যের নাম:</span> <strong className="text-white text-sm">{placeModalData.attendee.name}</strong>
              </div>
              {placeModalData.attendee.school && (
                <div className="text-slate-400">
                  <span>স্কুল/প্রতিষ্ঠান:</span> <span className="text-slate-300">{placeModalData.attendee.school}</span>
                </div>
              )}
              <div className="text-emerald-400 font-medium flex items-center gap-2 pt-1">
                <span>বর্তমান ক্রম: <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{toBengaliNumber(placeModalData.currentIndex + 1)}</span></span>
                <span>•</span>
                <span>বর্তমান আইডি: <span className="font-mono font-bold text-emerald-300">{placeModalData.attendee.regNo}</span></span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleChangePlace(placeModalData.currentIndex, 1);
                  setPlaceModalData(null);
                }}
                className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition"
              >
                ⏮ সবার শুরুতে (১)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChangePlace(placeModalData.currentIndex, savedAttendees.length);
                  setPlaceModalData(null);
                }}
                className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition"
              >
                ⏭ সবার শেষে ({toBengaliNumber(savedAttendees.length)})
              </button>
            </div>

            <form onSubmit={handleConfirmPlaceModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  নতুন অবস্থান লিখুন (১ থেকে {toBengaliNumber(savedAttendees.length)} এর মধ্যে):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={savedAttendees.length}
                    autoFocus
                    required
                    value={targetPlaceInput}
                    onChange={(e) => setTargetPlaceInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="যেমন: ১"
                  />
                  <span className="text-xs text-slate-400">/{toBengaliNumber(savedAttendees.length)}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300/90 leading-relaxed">
                💡 <strong>আইডি স্বয়ংক্রিয় সমন্বয়:</strong> সদস্যের অবস্থান পরিবর্তন করলে এই সদস্য এবং সংশ্লিষ্ট সকল সদস্যের নিবন্ধন নম্বর (আইডি) স্বয়ংক্রিয়ভাবে ক্রমানুসারে (০০০১, ০০০২...) আপডেট হয়ে যাবে।
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlaceModalData(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  অবস্থান পরিবর্তন ও আইডি আপডেট
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attendee Modal */}
      <EditAttendeeModal
        isOpen={!!editingAttendee}
        attendee={editingAttendee}
        onClose={() => setEditingAttendee(null)}
        onSave={async (updated) => {
          await onUpdateAttendee(updated);
        }}
      />

      {/* Print Single Attendee Modal */}
      <PrintAttendeeModal
        isOpen={!!printingAttendee}
        attendee={printingAttendee}
        config={config}
        onClose={() => setPrintingAttendee(null)}
        onPrint={handlePrintModalTrigger}
        isPreparingPrint={isPreparingPrint}
      />
    </div>
  );
};
