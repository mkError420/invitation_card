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
  fontChoice?: 'kalpurush' | 'solaiman' | 'kalpurush_solaiman' | 'solaiman_kalpurush';
}

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  headerArcTitle: "এসএসসি ৮৮ ব্যাচের বন্ধুদের মিলনমেলা",
  mainTitle: "বাহের ডাক",
  slogan1: "স্মৃতির আবেশে......বন্ধুত্বের উচ্ছ্বাসে.....",
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
  fontChoice: 'solaiman_kalpurush',
};

export const INITIAL_ATTENDEES: Attendee[] = [
  {
    id: "att-blank",
    regNo: "০০০১",
    name: "",
    school: "রংপুর জেলা স্কুল",
    district: "রংপুর",
    guests: "১",
    phone: "",
    photoUrl: "",
  },
];
