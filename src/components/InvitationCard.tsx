import React, { useRef } from 'react';
import { Camera, User as UserIcon } from 'lucide-react';
import { Attendee, EventConfig, DEFAULT_EVENT_CONFIG } from '../types';

interface InvitationCardProps {
  attendee: Attendee;
  config: EventConfig;
  cardId?: string;
  isPrintMode?: boolean;
  onPhotoUpload?: (attendeeId: string, photoUrl: string) => void;
}

export const InvitationCard: React.FC<InvitationCardProps> = ({
  attendee,
  config,
  cardId,
  isPrintMode = false,
  onPhotoUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoUpload) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onPhotoUpload(attendee.id, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Check if date or venue has been customized from original
  const isCustomFooter =
    config.date !== DEFAULT_EVENT_CONFIG.date ||
    config.venue !== DEFAULT_EVENT_CONFIG.venue;

  return (
    <div
      id={cardId}
      className={`relative w-full aspect-[1038/1515] overflow-hidden select-none font-bangla @container [container-type:inline-size] ${
        isPrintMode ? 'rounded-[14px]' : 'rounded-[20px] shadow-2xl'
      }`}
      style={{
        backgroundColor: '#e6f3eb',
      }}
    >
      {/* Latest Updated Template Asset Provided by User */}
      <img
        src="/assets/aistudio/current_template.jpeg"
        alt="Invitation Card Template"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        crossOrigin="anonymous"
        loading="eager"
      />

      {/* Lanyard Hole Guide in Print Mode if enabled */}
      {config.showLanyardSlot && isPrintMode && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            top: '2.5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '18%',
            height: '2.8%',
            borderRadius: '9999px',
            border: '1.5px dashed rgba(0, 80, 40, 0.45)',
          }}
          title="ফিতা পরানোর স্লট পাঞ্চ গাইড"
        />
      )}

      {/* Attendee Profile Photo Area (Circle in Upper Left) */}
      {(() => {
        const photoScale = (config.photoScale || 98) / 100;
        // In 1038x1515 template, circle diameter is 316px (30.44% of card width)
        const photoWidthPercent = 30.44 * photoScale;
        // Circle center: X = 18.30%, Y = 31.95%
        const photoLeftPercent = 18.30 - photoWidthPercent / 2;
        // Height in % of card height = width% * (1038 / 1515)
        const photoHeightPercent = photoWidthPercent * (1038 / 1515);
        const photoTopPercent = 31.95 - photoHeightPercent / 2 + (config.photoOffsetY || 0);

        return (
          <div
            className="absolute z-20 group"
            style={{
              left: `${photoLeftPercent}%`,
              top: `${photoTopPercent}%`,
              width: `${photoWidthPercent}%`,
              aspectRatio: '1 / 1',
            }}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden shadow-xs flex items-center justify-center bg-white border border-white/80">
              {attendee.photoUrl ? (
                <img
                  src={attendee.photoUrl}
                  alt={attendee.name}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  loading="eager"
                />
              ) : (
                // Default placeholder avatar if no custom photo uploaded yet
                <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50 text-emerald-800">
                  <UserIcon className="w-[50%] h-[50%] text-emerald-700/60" />
                </div>
              )}

              {/* Hover to upload photo in preview mode */}
              {!isPrintMode && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white p-1"
                  title="ছবি পরিবর্তন করুন"
                >
                  <Camera className="w-5 h-5 mb-1 text-emerald-300" />
                  <span className="text-[10px] font-bangla font-semibold text-center leading-tight">
                    ছবি পরিবর্তন
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        );
      })()}

      {/* Registration Number (Huge Bengali Digits inside the box) */}
      <div
        className="absolute z-20 flex items-center justify-center"
        style={{
          left: '42.5%',
          top: '37.16%',
          width: '45.0%',
          height: '7.79%',
        }}
      >
        <span
          className="font-anek font-bold text-[#09522e] tracking-wider text-center text-[22px] sm:text-[32px] [font-size:clamp(20px,6.2cqi,46px)]"
          style={{
            lineHeight: 1,
            textShadow: '0 1px 1px rgba(255,255,255,0.7)',
          }}
        >
          {attendee.regNo}
        </span>
      </div>

      {/* 5 Information Fields Text placed precisely into the blank boxes */}
      {/* 1. Name */}
      <FieldTextRow
        top="46.20%"
        height="6.47%"
        label={config.labelName}
        value={attendee.name}
      />

      {/* 2. School */}
      <FieldTextRow
        top="54.06%"
        height="6.73%"
        label={config.labelSchool}
        value={attendee.school}
      />

      {/* 3. District / Location */}
      <FieldTextRow
        top="62.18%"
        height="6.67%"
        label={config.labelDistrict}
        value={attendee.district}
      />

      {/* 4. Guests */}
      <FieldTextRow
        top="70.03%"
        height="6.60%"
        label={config.labelGuests}
        value={attendee.guests}
      />

      {/* 5. Mobile */}
      <FieldTextRow
        top="77.82%"
        height="6.67%"
        label={config.labelPhone}
        value={attendee.phone}
      />

      {/* Custom Footer Overlay (only if user customized Date or Venue from default) */}
      {isCustomFooter && (
        <div
          className="absolute z-20 flex items-center justify-between px-3 bg-[#eef7f2] rounded-full shadow-sm"
          style={{
            left: '3.6%',
            top: '85.8%',
            width: '92.8%',
            height: '7.2%',
            border: '2.6px solid #0d633d',
          }}
        >
          {/* Date */}
          <div className="flex items-center min-w-0 pr-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0d633d] text-white flex items-center justify-center shrink-0 mr-1.5">
              <span className="text-[11px]">📅</span>
            </div>
            <span
              className="font-bold text-[#09522e] truncate text-[10px] sm:text-[13px] [font-size:clamp(9px,2.2cqi,15px)]"
            >
              {config.date}
            </span>
          </div>

          {/* Divider */}
          <div className="w-[2px] h-[60%] bg-[#0d633d] mx-1 shrink-0" />

          {/* Venue */}
          <div className="flex items-center min-w-0 pl-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0d633d] text-white flex items-center justify-center shrink-0 mr-1.5">
              <span className="text-[11px]">📍</span>
            </div>
            <span
              className="font-bold text-[#09522e] truncate text-[10px] sm:text-[13px] [font-size:clamp(9px,2.2cqi,15px)]"
            >
              {config.venue}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface FieldTextRowProps {
  top: string;
  height: string;
  label: string;
  value: string;
}

const FieldTextRow: React.FC<FieldTextRowProps> = ({ top, height, label, value }) => {
  return (
    <div
      className="absolute z-20 flex items-center px-2 min-w-0"
      style={{
        left: '32.5%',
        width: '54.5%',
        top,
        height,
      }}
    >
      <span
        className="font-bangla font-bold text-[#0a2016] truncate block w-full leading-tight text-[11px] sm:text-[14px] [font-size:clamp(10px,2.6cqi,18px)]"
      >
        {label && label.trim() !== '' ? (
          <span className="text-[#063b20] mr-1">{label}</span>
        ) : null}
        <span className="text-[#0a1826]">{value}</span>
      </span>
    </div>
  );
};
