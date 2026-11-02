# 🚀 cPanel / InfinityFree Live Deployment Guide

This guide explains how to deploy both the **React Frontend**, **PHP Backend**, and **MySQL Database** to your live cPanel (or InfinityFree).

A ready-to-upload package has been generated for you:
📦 **`cpanel_deploy.zip`** (located in the project root: `C:\New folder\somaborton\Invitation\cpanel_deploy.zip`)

---

## 📋 Overview of What Gets Uploaded

Inside `cpanel_deploy.zip`:
- `index.html` + `assets/` (Vite-built React Frontend)
- `api/` (PHP REST API endpoints)
- `config/` (PDO Database connection with MySQL credentials)
- `models/` (Data models for Attendees & Event Configuration)
- `uploads/` (Folder for attendee portrait uploads)
- `.htaccess` (Apache configuration for React SPA + PHP API)
- `.env` (Your configured MySQL credentials)
- `schema.sql` (Database structure & seed data)

---

## 🗄️ Step 1: Set Up MySQL Database in cPanel / phpMyAdmin

1. Log in to your **cPanel** (or InfinityFree Control Panel).
2. Open **phpMyAdmin** (or go to MySQL Databases -> click phpMyAdmin next to `if0_42784359_myscmanagement`).
3. Click on your database name **`if0_42784359_myscmanagement`** in the left sidebar.
4. Click on the **Import** tab at the top.
5. Click **Choose File** and select [`backend/database/schema.sql`](file:///C:/New%20folder/somaborton/Invitation/backend/database/schema.sql).
6. Click **Import** (or **Go**).
7. ✅ Your `attendees` and `event_config` tables are now created and pre-filled with the 4 default reunion attendees and event data.

---

## 📂 Step 2: Upload Files to cPanel File Manager

1. In your cPanel, click on **File Manager**.
2. Navigate to your web root folder:
   - For standard cPanel: open **`public_html`**
   - For InfinityFree: open **`htdocs`**
3. *(Optional)* If there are default placeholder files like `index2.html` or `default.php`, delete them.
4. Click the **Upload** button in the top toolbar.
5. Drag and drop **`cpanel_deploy.zip`** into the upload window.
6. Once the upload reaches 100% (green), return to File Manager.
7. Right-click **`cpanel_deploy.zip`** and select **Extract** (extract directly into `public_html` or `htdocs`).
8. After extraction, ensure the files (`index.html`, `api`, `config`, `assets`, `.htaccess`, `.env`, etc.) are directly inside `public_html` (or `htdocs`).
9. You can now delete the `cpanel_deploy.zip` file to save disk space.

---

## 🔒 Step 3: Permissions for Uploads Folder

In File Manager:
1. Locate the **`uploads`** folder.
2. Right-click on it and select **Change Permissions**.
3. Set permissions to **`755`** (or `777` if required by your host) so that PHP can save uploaded attendee photos.

---

## 🌐 Step 4: Verify Live System

Open your browser and visit:

1. **Test Backend & Database:**
   ```
   https://your-domain.com/api/status.php
   ```
   You should see:
   ```json
   {
     "success": true,
     "status": "healthy",
     "driver": "mysql",
     "attendeesCount": 4,
     "eventTitle": "বাহের ডাক"
   }
   ```

2. **Test Frontend:**
   Visit your website homepage:
   ```
   https://your-domain.com/
   ```
   You will see the Reunion Invitation Card Generator with **🟢 PHP MYSQL কানেক্টেড** badge in the header!

---

## 🔄 Making Future Updates

Whenever you make changes to the React code or PHP backend:
1. Run:
   ```bash
   npm run package:cpanel
   ```
2. Upload and extract the new `cpanel_deploy.zip` into your cPanel `public_html` (or `htdocs`).

