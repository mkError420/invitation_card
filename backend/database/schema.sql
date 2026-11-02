-- MySQL Database Schema for Invitation Card Management System
-- Database: if0_42784359_myscmanagement (InfinityFree MySQL)
-- Character Set: utf8mb4 / utf8mb4_unicode_ci

-- 1. Attendees Table
CREATE TABLE IF NOT EXISTS `attendees` (
    `id` VARCHAR(50) NOT NULL,
    `reg_no` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `school` VARCHAR(255) DEFAULT '',
    `district` VARCHAR(150) DEFAULT '',
    `guests` VARCHAR(50) DEFAULT '১',
    `phone` VARCHAR(50) DEFAULT '',
    `photo_url` LONGTEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_reg_no` (`reg_no`),
    INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Event Configuration Table
CREATE TABLE IF NOT EXISTS `event_config` (
    `id` INT NOT NULL DEFAULT 1,
    `header_arc_title` VARCHAR(255) NOT NULL,
    `main_title` VARCHAR(255) NOT NULL,
    `slogan1` VARCHAR(255) DEFAULT '',
    `slogan2` VARCHAR(255) DEFAULT '',
    `label_reg` VARCHAR(100) DEFAULT 'নিবন্ধন নং',
    `label_name` VARCHAR(100) DEFAULT '',
    `label_school` VARCHAR(100) DEFAULT '',
    `label_district` VARCHAR(100) DEFAULT '',
    `label_guests` VARCHAR(100) DEFAULT 'অতিথিঃ ',
    `label_phone` VARCHAR(100) DEFAULT '',
    `event_date` VARCHAR(100) DEFAULT '১৮ ডিসেম্বর, ২০২৬',
    `venue` VARCHAR(255) DEFAULT 'আনান সিটি পার্ক, রংপুর',
    `use_custom_banner` TINYINT(1) DEFAULT 0,
    `show_lanyard_slot` TINYINT(1) DEFAULT 1,
    `show_cut_marks` TINYINT(1) DEFAULT 1,
    `photo_scale` INT DEFAULT 98,
    `photo_offset_y` INT DEFAULT 0,
    `font_choice` VARCHAR(50) DEFAULT 'kalpurush',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Default Attendees (Insert Ignore or Update on duplicate)
INSERT INTO `attendees` (`id`, `reg_no`, `name`, `school`, `district`, `guests`, `phone`, `photo_url`)
VALUES
('att-1', '০০০১', 'মো: নাজমুল আহসান', 'রংপুর জেলা স্কুল', 'রংপুর সদর, রংপুর', '২', '০১৭XXXXXXXX', ''),
('att-2', '০০০২', 'প্রকৌ. তৌহিদুল ইসলাম', 'রংপুর জিলা স্কুল', 'মিঠাপুকুর, রংপুর', '১', '০১৮১২৩৪৫৬৭৮', ''),
('att-3', '০০০৩', 'ড. মাহমুদুল হাসান', 'রংপুর সরকারি কলেজ', 'পীরগঞ্জ, রংপুর', '৩', '০১৯৮৭৬৫৪৩২১', ''),
('att-4', '০০০৪', 'আব্দুর রহিম সরকার', 'কাউনিয়া পাইলট উচ্চ বিদ্যালয়', 'কাউনিয়া, রংপুর', '২', '০১৬১১২২৩৩৪৪', '')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Seed Default Event Config
INSERT INTO `event_config` (
    `id`, `header_arc_title`, `main_title`, `slogan1`, `slogan2`,
    `label_reg`, `label_name`, `label_school`, `label_district`, `label_guests`, `label_phone`,
    `event_date`, `venue`, `use_custom_banner`, `show_lanyard_slot`, `show_cut_marks`, `photo_scale`, `photo_offset_y`
) VALUES (
    1,
    'এসএসসি ৮৮ ব্যাচের বন্ধুদের মিলনমেলা',
    'বাহের ডাক',
    'স্মৃতির আলো......বন্ধুত্বের উচ্ছ্বাসে.....',
    'আমরা আবার এক সাথে',
    'নিবন্ধন নং',
    '',
    '',
    '',
    'অতিথিঃ ',
    '',
    '১৮ ডিসেম্বর, ২০২৬',
    'আনান সিটি পার্ক, রংপুর',
    0,
    1,
    1,
    98,
    0
)
ON DUPLICATE KEY UPDATE `main_title`=VALUES(`main_title`);
