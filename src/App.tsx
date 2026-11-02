import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid,
  Users,
  Copy,
  Loader2,
} from 'lucide-react';
import { Attendee, EventConfig, DEFAULT_EVENT_CONFIG, INITIAL_ATTENDEES } from './types';
import { api, BackendStatus } from './services/api';
import { InvitationCard } from './components/InvitationCard';
import { PrintA4Sheet } from './components/PrintA4Sheet';
import { DynamicEditor } from './components/DynamicEditor';
import { AttendeeTable } from './components/AttendeeTable';
import { CsvUploaderModal } from './components/CsvUploaderModal';
import { exportA4PagesToPdf, exportSingleCardImage } from './utils/pdfExport';
import { preloadTemplateImage } from './utils/cardCanvasRenderer';
import { toBengaliNumber, getNextRegNo, formatRegNo } from './utils/bengaliNumerals';

export default function App() {
  const [attendees, setAttendees] = useState<Attendee[]>(() => {
    try {
      const saved = localStorage.getItem('somaborton_attendees_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ATTENDEES;
  });

  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('somaborton_attendees_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
          return parsed[0].id;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ATTENDEES[0].id;
  });

  const [config, setConfig] = useState<EventConfig>(DEFAULT_EVENT_CONFIG);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({ online: false });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync attendees changes to localStorage
  useEffect(() => {
    if (attendees && attendees.length > 0) {
      try {
        localStorage.setItem('somaborton_attendees_v1', JSON.stringify(attendees));
      } catch (err) {
        console.warn('LocalStorage save attendees failed:', err);
      }
    }
  }, [attendees]);

  // Active view tab: 'single' | 'a4print' | 'table'
  const [activeView, setActiveView] = useState<'single' | 'a4print' | 'table'>('single');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // PDF Export Progress State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [singlePrintTarget, setSinglePrintTarget] = useState<{ attendee: Attendee; mode: 'single' | 'sheet4' } | null>(null);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number; stage: string } | null>(null);

  // Clean up single print target after printing finishes
  useEffect(() => {
    const handleAfterPrint = () => {
      setSinglePrintTarget(null);
      setIsPreparingPrint(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Preload template image immediately on startup & initialize database sync
  useEffect(() => {
    preloadTemplateImage().catch((err) => {
      console.warn('Preload template image failed:', err);
    });

    let isMounted = true;
    const syncBackend = async () => {
      try {
        const status = await api.checkStatus();
        if (!isMounted) return;
        setBackendStatus(status);
        if (status.online) {
          setIsSyncing(true);
          const [remoteAttendees, remoteConfig] = await Promise.all([
            api.getAttendees(),
            api.getConfig(),
          ]);
          if (isMounted) {
            if (remoteAttendees && remoteAttendees.length > 0) {
              setAttendees(remoteAttendees);
              setSelectedAttendeeId(remoteAttendees[0].id);
            } else if (remoteAttendees && remoteAttendees.length === 0) {
              const blankAttendee: Attendee = {
                id: `att-${Date.now()}`,
                regNo: '০০০১',
                name: '',
                school: 'রংপুর জেলা স্কুল',
                district: 'রংপুর',
                guests: '১',
                phone: '',
                photoUrl: '',
              };
              setAttendees([blankAttendee]);
              setSelectedAttendeeId(blankAttendee.id);
            }
            if (remoteConfig && remoteConfig.mainTitle) {
              setConfig(remoteConfig);
            }
          }
        }
      } catch (err) {
        console.warn('Backend connection/sync note:', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    syncBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // A4 Preview Scale
  const [a4Scale, setA4Scale] = useState<number>(0.75);

  // Currently selected attendee object
  const currentAttendee: Attendee =
    attendees.find((a) => a.id === selectedAttendeeId) || attendees[0] || INITIAL_ATTENDEES[0];
  const currentIndex = attendees.length > 0
    ? Math.max(0, attendees.findIndex((a) => a.id === currentAttendee.id))
    : 0;

  // Divide attendees into chunks of 4 for A4 pages (filter out empty in-progress card)
  const validSavedAttendees = attendees.filter((a) => a.name.trim() !== '');
  const printAttendeesList = validSavedAttendees.length > 0 ? validSavedAttendees : attendees;
  const a4Pages: Attendee[][] = [];
  for (let i = 0; i < printAttendeesList.length; i += 4) {
    a4Pages.push(printAttendeesList.slice(i, i + 4));
  }
  if (a4Pages.length === 0) {
    a4Pages.push([currentAttendee]);
  }

  // Save attendee from card editor to database & clear form for next entry
  const handleSaveCardAttendee = async (attendeeToSave: Attendee) => {
    let finalPhoto = attendeeToSave.photoUrl || '';
    if (backendStatus.online && finalPhoto.startsWith('data:image')) {
      try {
        const uploadedUrl = await api.uploadPhoto(finalPhoto, attendeeToSave.id);
        if (uploadedUrl) finalPhoto = uploadedUrl;
      } catch (err) {
        console.warn('Backend photo upload note:', err);
      }
    }

    const attendeeId = attendeeToSave.id || `att-${Date.now()}`;
    const finalized: Attendee = { ...attendeeToSave, id: attendeeId, photoUrl: finalPhoto };

    // 1. Add or update in state
    setAttendees((prev) => {
      const exists = prev.some((a) => a.id === attendeeId);
      if (exists) {
        return prev.map((a) => (a.id === attendeeId ? finalized : a));
      } else {
        return [...prev, finalized];
      }
    });

    // 2. Persist to database
    if (backendStatus.online) {
      try {
        await api.updateAttendee(finalized);
      } catch {
        try {
          await api.createAttendee(finalized);
        } catch (e) {
          console.warn('Backend save attendee error:', e);
        }
      }
    }

    // 3. Clear form by generating a new blank attendee for next entry
    const nextReg = getNextRegNo([...attendees, finalized]);
    const blankAttendee: Attendee = {
      id: `att-${Date.now() + 1}`,
      regNo: nextReg,
      name: '',
      school: finalized.school || 'রংপুর জেলা স্কুল',
      district: finalized.district || 'রংপুর',
      guests: '১',
      phone: '',
      photoUrl: '',
    };

    setAttendees((prev) => {
      const cleanList = prev.filter((a) => a.name.trim() !== '' || a.id === attendeeId);
      const exists = cleanList.some((a) => a.id === attendeeId);
      const updated = exists
        ? cleanList.map((a) => (a.id === attendeeId ? finalized : a))
        : [...cleanList, finalized];
      return [...updated, blankAttendee];
    });
    setSelectedAttendeeId(blankAttendee.id);
  };

  const handleClearCardForm = () => {
    const nextReg = getNextRegNo(attendees);
    const blankAttendee: Attendee = {
      id: `att-${Date.now() + 1}`,
      regNo: nextReg,
      name: '',
      school: currentAttendee.school || 'রংপুর জেলা স্কুল',
      district: currentAttendee.district || 'রংপুর',
      guests: '১',
      phone: '',
      photoUrl: '',
    };
    setAttendees((prev) => {
      const cleanList = prev.filter((a) => a.name.trim() !== '');
      return [...cleanList, blankAttendee];
    });
    setSelectedAttendeeId(blankAttendee.id);
  };

  // Handlers
  const handleUpdateAttendee = async (updated: Attendee): Promise<boolean> => {
    // 1. Update React state immediately
    setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

    // 2. Persist to localStorage immediately
    try {
      const currentList = attendees.map((a) => (a.id === updated.id ? updated : a));
      localStorage.setItem('somaborton_attendees_v1', JSON.stringify(currentList));
    } catch (e) {
      console.warn('LocalStorage save attendees failed:', e);
    }

    // 3. Persist to backend database (SQLite / MySQL)
    if (backendStatus.online) {
      let attendeeToSave = updated;
      if (updated.photoUrl && updated.photoUrl.startsWith('data:image')) {
        try {
          const serverUrl = await api.uploadPhoto(updated.photoUrl, updated.id);
          if (serverUrl) {
            attendeeToSave = { ...updated, photoUrl: serverUrl };
            setAttendees((prev) => prev.map((a) => (a.id === updated.id ? attendeeToSave : a)));
            const updatedWithPhoto = attendees.map((a) => (a.id === updated.id ? attendeeToSave : a));
            localStorage.setItem('somaborton_attendees_v1', JSON.stringify(updatedWithPhoto));
          }
        } catch (err) {
          console.warn('Backend image upload failed:', err);
        }
      }

      try {
        await api.updateAttendee(attendeeToSave);
      } catch (err) {
        console.warn('Backend update attendee failed:', err);
        throw err;
      }
    }
    return true;
  };

  const handleAddAttendee = async (newAtt: Omit<Attendee, 'id'>) => {
    const tempId = `att-${Date.now()}`;
    const autoReg = newAtt.regNo ? formatRegNo(newAtt.regNo) : getNextRegNo(attendees);
    const created: Attendee = {
      ...newAtt,
      regNo: autoReg,
      id: tempId,
    };
    setAttendees((prev) => [...prev, created]);
    setSelectedAttendeeId(created.id);

    if (backendStatus.online) {
      try {
        const saved = await api.createAttendee(newAtt);
        setAttendees((prev) => prev.map((a) => (a.id === tempId ? saved : a)));
        setSelectedAttendeeId(saved.id);
      } catch (err) {
        console.warn('Backend add attendee failed:', err);
      }
    }
  };

  const handleDeleteAttendee = async (id: string) => {
    const target = attendees.find((a) => a.id === id);
    const targetName = target?.name ? `"${target.name}"` : 'এই সদস্যকে';
    if (!window.confirm(`${targetName} তালিকা এবং ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলতে চান?`)) {
      return;
    }

    // 1. Immediately remove from frontend state and localStorage
    const filtered = attendees.filter((a) => a.id !== id);
    let nextAttendees: Attendee[];
    if (filtered.length === 0) {
      const blankAttendee: Attendee = {
        id: `att-${Date.now()}`,
        regNo: '০০০১',
        name: '',
        school: 'রংপুর জেলা স্কুল',
        district: 'রংপুর',
        guests: '১',
        phone: '',
        photoUrl: '',
      };
      nextAttendees = [blankAttendee];
      setAttendees(nextAttendees);
      setSelectedAttendeeId(blankAttendee.id);
    } else {
      nextAttendees = filtered;
      setAttendees(nextAttendees);
      if (selectedAttendeeId === id) {
        setSelectedAttendeeId(filtered[0].id);
      }
    }

    try {
      localStorage.setItem('somaborton_attendees_v1', JSON.stringify(nextAttendees));
    } catch (e) {
      console.warn('LocalStorage save attendees failed:', e);
    }

    // 2. Permanently delete from backend database (SQLite / MySQL)
    try {
      const deleted = await api.deleteAttendee(id);
      if (!deleted && target?.regNo) {
        await api.deleteAttendee(target.regNo);
      }
    } catch (err) {
      console.warn('Backend delete attendee failed:', err);
      if (target?.regNo) {
        try {
          await api.deleteAttendee(target.regNo);
        } catch (e2) {
          console.warn('Backend delete by regNo failed:', e2);
        }
      }
    }
  };

  const handlePhotoUpload = async (attendeeId: string, photoUrl: string) => {
    setAttendees((prev) =>
      prev.map((a) => (a.id === attendeeId ? { ...a, photoUrl } : a))
    );

    if (backendStatus.online && photoUrl && photoUrl.startsWith('data:image')) {
      try {
        const serverUrl = await api.uploadPhoto(photoUrl, attendeeId);
        setAttendees((prev) =>
          prev.map((a) => (a.id === attendeeId ? { ...a, photoUrl: serverUrl } : a))
        );
      } catch (err) {
        console.warn('Backend image upload failed:', err);
      }
    } else if (backendStatus.online) {
      const targetAttendee = attendees.find((a) => a.id === attendeeId) || currentAttendee;
      api.updateAttendee({ ...targetAttendee, id: attendeeId, photoUrl }).catch((err) => {
        console.warn('Backend photoUrl update failed:', err);
      });
    }
  };

  const handleCsvImport = async (newAttendees: Attendee[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setAttendees(newAttendees);
      if (newAttendees.length > 0) {
        setSelectedAttendeeId(newAttendees[0].id);
      }
    } else {
      setAttendees((prev) => [...prev, ...newAttendees]);
    }
    setActiveView('table');

    if (backendStatus.online) {
      try {
        const synced = await api.batchImport(newAttendees, mode);
        setAttendees(synced);
        if (synced.length > 0) {
          setSelectedAttendeeId(synced[0].id);
        }
      } catch (err) {
        console.warn('Backend batch import failed:', err);
      }
    }
  };

  const handleLoadSampleData = async () => {
    const sampleAttendees: Attendee[] = [
      {
        id: 'samp-1',
        regNo: '১০৩৩',
        name: 'মো: নাজমুল আহসান',
        school: 'রংপুর জেলা স্কুল',
        district: 'রংপুর সদর, রংপুর',
        guests: '২',
        phone: '০১৭XXXXXXXX',
        photoUrl: '',
      },
      {
        id: 'samp-2',
        regNo: '১০৩৪',
        name: 'কাজী গোলাম মোস্তফা',
        school: 'কারমাইকেল কলেজিয়েট স্কুল',
        district: 'ধাপ, রংপুর',
        guests: '১',
        phone: '০১৭১১১১১১১১',
        photoUrl: '',
      },
      {
        id: 'samp-3',
        regNo: '১০৩৫',
        name: 'মোস্তাফিজুর রহমান',
        school: 'রংপুর জিলা স্কুল',
        district: 'পীরগঞ্জ, রংপুর',
        guests: '৩',
        phone: '০১৭২২২২২২২২',
        photoUrl: '',
      },
      {
        id: 'samp-4',
        regNo: '১০৩৬',
        name: 'শেখ শফিউল আলম',
        school: 'ক্যান্টনমেন্ট পাবলিক স্কুল',
        district: 'রংপুর ক্যান্টনমেন্ট',
        guests: '২',
        phone: '০১৭৩৩৩৩৩৩৩৩',
        photoUrl: '',
      },
      {
        id: 'samp-5',
        regNo: '১০৩৭',
        name: 'আহমেদ জামিল রশীদ',
        school: 'রংপুর সরকারি টেকনিক্যাল স্কুল',
        district: 'মর্ডান মোড়, রংপুর',
        guests: '১',
        phone: '০১৭৪৪৪৪৪৪৪৪',
        photoUrl: '',
      },
      {
        id: 'samp-6',
        regNo: '১০৩৮',
        name: 'বদরুল হুদা মিঠু',
        school: 'রংপুর জেলা স্কুল',
        district: 'জাহাজ কোম্পানি মোড়, রংপুর',
        guests: '৪',
        phone: '০১৭৫৫৫৫৫৫৫৫',
        photoUrl: '',
      },
      {
        id: 'samp-7',
        regNo: '১০৩৯',
        name: 'ফারুক আহমেদ চৌধুরী',
        school: 'রংপুর জিলা স্কুল',
        district: 'বেগম রোকেয়া এলাকা',
        guests: '২',
        phone: '০১৭৬৬৬৬৬৬৬৬',
        photoUrl: '',
      },
      {
        id: 'samp-8',
        regNo: '১০৪০',
        name: 'তারেক মাহমুদ',
        school: 'রংপুর মডেল স্কুল',
        district: 'সাতমাথা, রংপুর',
        guests: '১',
        phone: '০১৭৭৭৭৭৭৭৭৭',
        photoUrl: '',
      },
    ];
    setAttendees(sampleAttendees);
    setSelectedAttendeeId(sampleAttendees[0].id);

    if (backendStatus.online) {
      try {
        const synced = await api.batchImport(sampleAttendees, 'replace');
        setAttendees(synced);
        if (synced.length > 0) {
          setSelectedAttendeeId(synced[0].id);
        }
      } catch (err) {
        console.warn('Backend load sample data failed:', err);
      }
    }
  };

  const handleUpdateConfig = (newConfig: EventConfig) => {
    setConfig(newConfig);
    if (backendStatus.online) {
      api.updateConfig(newConfig).catch((err) => {
        console.warn('Backend update config failed:', err);
      });
    }
  };

  const handleDuplicateSingleAttendeeForA4 = () => {
    // Fill a whole A4 sheet with 4 copies of this same person
    const duplicated: Attendee[] = [
      { ...currentAttendee, id: `dup-${Date.now()}-1` },
      { ...currentAttendee, id: `dup-${Date.now()}-2` },
      { ...currentAttendee, id: `dup-${Date.now()}-3` },
      { ...currentAttendee, id: `dup-${Date.now()}-4` },
    ];
    setAttendees(duplicated);
    setActiveView('a4print');
  };

  // Direct PDF Download handler
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setPdfProgress({
      current: 1,
      total: a4Pages.length,
      stage: 'কার্ড ও ফন্ট প্রস্তুত হচ্ছে...',
    });
    try {
      await exportA4PagesToPdf(
        a4Pages,
        config,
        (progress) => {
          setPdfProgress(progress);
        },
        `মিলনমেলা_কার্ড_${attendees.length}_জন.pdf`
      );
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
      setPdfProgress(null);
    }
  };

  // Browser Direct Bulk Print Trigger
  const handleBrowserPrint = async () => {
    setSinglePrintTarget(null);
    setIsPreparingPrint(true);
    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      // Give React a tick to render full a4Pages in .print-only
      await new Promise((resolve) => setTimeout(resolve, 80));

      const printImages = Array.from(
        document.querySelectorAll('.print-only img')
      ) as HTMLImageElement[];
      await Promise.all(
        printImages.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return img.decode().catch(() => {});
        })
      );
    } catch (err) {
      console.warn('Print preload warning:', err);
    } finally {
      setIsPreparingPrint(false);
      setTimeout(() => {
        window.print();
      }, 120);
    }
  };

  // Browser Single Attendee Print Trigger
  const handlePrintSingleAttendee = async (attendee: Attendee, mode: 'single' | 'sheet4' = 'single') => {
    setIsPreparingPrint(true);
    setSinglePrintTarget({ attendee, mode });

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      // Give React a tick to update .print-only container with singlePrintTarget
      await new Promise((resolve) => setTimeout(resolve, 80));

      const printImages = Array.from(
        document.querySelectorAll('.print-only img')
      ) as HTMLImageElement[];
      await Promise.all(
        printImages.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return img.decode().catch(() => {});
        })
      );
    } catch (err) {
      console.warn('Single print preload warning:', err);
    } finally {
      setIsPreparingPrint(false);
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setSinglePrintTarget(null);
        }, 1200);
      }, 150);
    }
  };

  // Single Card PNG Download
  const handleDownloadSinglePng = async () => {
    setIsExportingPng(true);
    try {
      await exportSingleCardImage(
        currentAttendee,
        config,
        `card_${currentAttendee.regNo}_${currentAttendee.name}.png`
      );
    } catch (err) {
      console.error('PNG export error:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-bangla">
      {/* Top Navigation Bar */}
      <header className="no-print sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
                        <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {config.mainTitle} - ইনভাইটেশন কার্ড জেনারেটর
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold rounded-full border border-emerald-500/30">
                  A4 ৪-ইন-১ প্রিন্ট
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                হুবহু ডিজাইন • বাল্ক CSV জেনারেশন • প্রতি A4 পেজে ৪টি কার্ড
              </p>
            </div>
          </div>

          {/* Action Buttons & DB Status */}
          <div className="flex items-center space-x-2">
            {/* Database / Backend Status Indicator */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                backendStatus.online
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
              }`}
              title={
                backendStatus.online
                  ? `PHP ব্যাকএন্ড সক্রিয় (${backendStatus.driver?.toUpperCase() || 'SQLite'} ডাটাবেজ) - ${attendees.length} জন সদস্য সংরক্ষিত`
                  : 'PHP ব্যাকএন্ড অফলাইন (লোকাল মোড চলছে)'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>
                {backendStatus.online
                  ? `PHP ${backendStatus.driver?.toUpperCase() || 'DB'}`
                  : 'লোকাল মোড'}
              </span>
              {isSyncing && <Loader2 className="w-3 h-3 animate-spin text-emerald-400 ml-1" />}
            </div>

            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm"
              title="CSV ফাইল আপলোড করে এক সাথে সকল কার্ড তৈরি করুন"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV আপলোড</span>
            </button>

            <button
              onClick={handleBrowserPrint}
              disabled={isPreparingPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold rounded-xl transition border border-slate-700 disabled:opacity-50"
              title="ব্রাউজার থেকে সরাসরি প্রিন্ট বা Save as PDF করুন"
            >
              {isPreparingPrint ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <Printer className="w-4 h-4 text-emerald-400" />
              )}
              <span className="hidden md:inline">
                {isPreparingPrint ? 'প্রস্তুত হচ্ছে...' : 'প্রিন্ট'}
              </span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-md shadow-emerald-950/50 disabled:opacity-50"
              title="সরাসরি সকল পেজের PDF ডাউনলোড করুন"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>সরাসরি PDF</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-slate-800/80 bg-slate-900/60 text-xs">
          <button
            onClick={() => setActiveView('single')}
            className={`py-2.5 px-4 font-semibold flex items-center gap-2 border-b-2 transition ${
              activeView === 'single'
                ? 'border-emerald-500 text-emerald-400 bg-slate-850/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>একক কার্ড প্রিভিউ ও এডিটর</span>
          </button>

          <button
            onClick={() => setActiveView('a4print')}
            className={`py-2.5 px-4 font-semibold flex items-center gap-2 border-b-2 transition ${
              activeView === 'a4print'
                ? 'border-emerald-500 text-emerald-400 bg-slate-850/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>A4 প্রিন্ট পেজ ভিউ ({a4Pages.length} পেজ, ৪টি/পেজ)</span>
          </button>

          <button
            onClick={() => setActiveView('table')}
            className={`py-2.5 px-4 font-semibold flex items-center gap-2 border-b-2 transition ${
              activeView === 'table'
                ? 'border-emerald-500 text-emerald-400 bg-slate-850/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>সদস্য ডাটাবেজ ({validSavedAttendees.length} জন)</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: SINGLE CARD PREVIEW & DYNAMIC EDITOR */}
        {activeView === 'single' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Card Preview Column (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              {/* Attendee Switcher / Pagination Bar */}
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-2.5 mb-3 flex items-center justify-between shadow-sm">
                <button
                  onClick={() => {
                    if (attendees.length === 0) return;
                    const prevIdx = (currentIndex - 1 + attendees.length) % attendees.length;
                    if (attendees[prevIdx]) {
                      setSelectedAttendeeId(attendees[prevIdx].id);
                    }
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
                  title="পূর্ববর্তী সদস্য"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <span className="text-xs font-bold text-white block">
                    সদস্য {attendees.length > 0 ? currentIndex + 1 : 0} / {attendees.length}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {currentAttendee.name} ({currentAttendee.regNo})
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (attendees.length === 0) return;
                    const nextIdx = (currentIndex + 1) % attendees.length;
                    if (attendees[nextIdx]) {
                      setSelectedAttendeeId(attendees[nextIdx].id);
                    }
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
                  title="পরবর্তী সদস্য"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Live Preview Card */}
              <div className="w-full max-w-md mx-auto">
                <InvitationCard
                  cardId="single-preview-card"
                  attendee={currentAttendee}
                  config={config}
                  onPhotoUpload={handlePhotoUpload}
                />
              </div>

              {/* Single Card Quick Action Buttons */}
              <div className="w-full max-w-md mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={handleDownloadSinglePng}
                  disabled={isExportingPng}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition shadow-sm disabled:opacity-50"
                >
                  {isExportingPng ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{isExportingPng ? 'ডাউনলোড হচ্ছে...' : 'সিঙ্গেল PNG ডাউনলোড'}</span>
                </button>

                <button
                  onClick={handleDuplicateSingleAttendeeForA4}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-xl text-xs font-semibold text-emerald-300 transition shadow-sm"
                  title="এই ১ জনের তথ্য দিয়ে একটি পুরো A4 পেজ (৪টি কপি) তৈরি করুন"
                >
                  <Copy className="w-4 h-4 text-emerald-400" />
                  <span>A4 পেজে ৪টি ডুপ্লিকেট</span>
                </button>
              </div>
            </div>

            {/* Right: Dynamic Editor Panel (7 cols) */}
            <div className="lg:col-span-7">
              <DynamicEditor
                selectedAttendee={currentAttendee}
                config={config}
                onUpdateAttendee={handleUpdateAttendee}
                onUpdateConfig={handleUpdateConfig}
                onSaveAttendee={handleSaveCardAttendee}
                onClearForm={handleClearCardForm}
                onViewTable={() => setActiveView('table')}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: A4 PRINT SHEET PREVIEW (4 CARDS PER PAGE) */}
        {activeView === 'a4print' && (
          <div className="flex flex-col items-center space-y-6">
            {/* Top Toolbar for A4 Preview */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    A4 সাইজ পেজ লেআউট (প্রতি পাতায় ৪টি আইডি কার্ড)
                  </h3>
                  <p className="text-xs text-slate-400">
                    মোট {validSavedAttendees.length} জন সদস্যের জন্য {a4Pages.length} টি A4 পাতা তৈরি হয়েছে
                  </p>
                </div>
              </div>

              {/* Scale Zoom Controls & Export Actions */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400">জুম:</span>
                  <button
                    onClick={() => setA4Scale(Math.max(0.4, a4Scale - 0.1))}
                    className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 hover:text-white"
                  >
                    -
                  </button>
                  <span className="font-mono font-semibold text-slate-200">
                    {Math.round(a4Scale * 100)}%
                  </span>
                  <button
                    onClick={() => setA4Scale(Math.min(1.0, a4Scale + 0.1))}
                    className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 hover:text-white"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleBrowserPrint}
                  disabled={isPreparingPrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition border border-slate-700 disabled:opacity-50"
                >
                  {isPreparingPrint ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Printer className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{isPreparingPrint ? 'প্রস্তুত হচ্ছে...' : 'প্রিন্ট করুন'}</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-emerald-950/60 disabled:opacity-50"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>সরাসরি PDF ডাউনলোড</span>
                </button>
              </div>
            </div>

            {/* A4 Sheets Render Container (scaled for screen preview) */}
            <div
              className="w-full flex flex-col items-center space-y-12 py-4 overflow-x-auto"
              style={{
                transform: `scale(${a4Scale})`,
                transformOrigin: 'top center',
                marginBottom: `${(1 - a4Scale) * -297 * a4Pages.length}mm`,
              }}
            >
              {a4Pages.map((pageAttendees, pageIndex) => (
                <PrintA4Sheet
                  key={`page-${pageIndex}`}
                  sheetId={`a4-page-render-${pageIndex}`}
                  pageIndex={pageIndex}
                  totalPages={a4Pages.length}
                  attendees={pageAttendees}
                  config={config}
                />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: ATTENDEE DATABASE TABLE */}
        {activeView === 'table' && (
          <div className="space-y-6">
            <AttendeeTable
              attendees={attendees}
              selectedAttendeeId={selectedAttendeeId}
              config={config}
              onSelectAttendee={(id) => {
                setSelectedAttendeeId(id);
                setActiveView('single');
              }}
              onAddAttendee={handleAddAttendee}
              onUpdateAttendee={handleUpdateAttendee}
              onDeleteAttendee={handleDeleteAttendee}
              onPhotoUpload={handlePhotoUpload}
              onBulkPrint={handleBrowserPrint}
              onPrintAttendee={handlePrintSingleAttendee}
              isPreparingPrint={isPreparingPrint}
            />
          </div>
        )}
      </main>

      {/* PRINT-ONLY SECTION (Rendered ONLY when window.print() is called) */}
      <div className="print-only">
        {singlePrintTarget ? (
          <PrintA4Sheet
            key="print-single-target"
            sheetId="print-single-target-page"
            pageIndex={0}
            totalPages={1}
            attendees={
              singlePrintTarget.mode === 'sheet4'
                ? [
                    singlePrintTarget.attendee,
                    singlePrintTarget.attendee,
                    singlePrintTarget.attendee,
                    singlePrintTarget.attendee,
                  ]
                : [singlePrintTarget.attendee]
            }
            config={config}
          />
        ) : (
          a4Pages.map((pageAttendees, pageIndex) => (
            <PrintA4Sheet
              key={`print-real-${pageIndex}`}
              sheetId={`print-real-page-${pageIndex}`}
              pageIndex={pageIndex}
              totalPages={a4Pages.length}
              attendees={pageAttendees}
              config={config}
            />
          ))
        )}
      </div>

      {/* CSV Uploader Modal */}
      <CsvUploaderModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={handleCsvImport}
      />

      {/* PDF Export Progress Modal */}
      {isExportingPdf && pdfProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-bangla">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">পিডিএফ জেনারেট হচ্ছে</h4>
              <p className="text-xs text-slate-400 mt-1">{pdfProgress.stage}</p>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{
                  width: `${pdfProgress.total > 0 ? Math.min(100, Math.max(0, (pdfProgress.current / pdfProgress.total) * 100)) : 0}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              অনুগ্রহ করে অপেক্ষা করুন, হাই-রেজোলিউশন PDF প্রস্তুত হচ্ছে...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
