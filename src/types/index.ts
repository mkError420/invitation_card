export interface Attendee {
  id: string;
  regNo: string;
  name: string;
  school: string;
  district: string;
  guests: string;
  phone: string;
  photoUrl?: string;
}

export interface EventConfig {
  headerArcTitle: string;
  mainTitle: string;
  slogan1: string;
  slogan2: string;
  labelReg: string;
  labelName: string;
  labelSchool: string;
  labelDistrict: string;
  labelGuests: string;
  labelPhone: string;
  date: string;
  venue: string;
  useCustomBanner: boolean;
  showLanyardSlot: boolean;
  showCutMarks: boolean;
  photoScale: number; // percentage, e.g. 88 (makes photo smaller so it never overlaps text)
  photoOffsetY: number; // vertical adjustment in percentage
}

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  headerArcTitle: "এসএসসি ৮৮ ব্যাচের বন্ধুদের মিলনমেলা",
  mainTitle: "বাহের ডাক",
  slogan1: "স্মৃতির আলো......বন্ধুত্বের উচ্ছ্বাসে.....",
  slogan2: "আমরা আবার এক সাথে",
  labelReg: "নিবন্ধন নং",
  labelName: "",
  labelSchool: "",
  labelDistrict: "",
  labelGuests: "অতিথিঃ ",
  labelPhone: "",
  date: "১৮ ডিসেম্বর, ২০২৬",
  venue: "আনান সিটি পার্ক, রংপুর",
  useCustomBanner: false,
  showLanyardSlot: true,
  showCutMarks: true,
  photoScale: 98,
  photoOffsetY: 0,
};

export const INITIAL_ATTENDEES: Attendee[] = [
  {
    id: "att-1",
    regNo: "১০৩৩",
    name: "মো: নাজমুল আহসান",
    school: "রংপুর জেলা স্কুল",
    district: "রংপুর সদর, রংপুর",
    guests: "২",
    phone: "০১৭XXXXXXXX",
    photoUrl: "", // uses default reference image face or fallback
  },
  {
    id: "att-2",
    regNo: "১০৩৪",
    name: "প্রকৌ. তৌহিদুল ইসলাম",
    school: "রংপুর জিলা স্কুল",
    district: "মিঠাপুকুর, রংপুর",
    guests: "১",
    phone: "০১৮১২৩৪৫৬৭৮",
    photoUrl: "",
  },
  {
    id: "att-3",
    regNo: "১০৩৫",
    name: "ড. মাহমুদুল হাসান",
    school: "রংপুর সরকারি কলেজ",
    district: "পীরগঞ্জ, রংপুর",
    guests: "৩",
    phone: "০১৯৮৭৬৫৪৩২১",
    photoUrl: "",
  },
  {
    id: "att-4",
    regNo: "১০৩৬",
    name: "আব্দুর রহিম সরকার",
    school: "কাউনিয়া পাইলট উচ্চ বিদ্যালয়",
    district: "কাউনিয়া, রংপুর",
    guests: "২",
    phone: "০১৬১১২২৩৩৪৪",
    photoUrl: "",
  },
];
