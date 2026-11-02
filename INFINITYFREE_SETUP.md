# 🌐 InfinityFree MySQL & Backend Setup Guide

Your MySQL Database details have been configured into the project:
- **Host**: `sql101.infinityfree.com`
- **Database**: `if0_42784359_myscmanagement`
- **Username**: `if0_42784359`
- **Password**: `4naAUPQvgRj3`
- **Port**: `3306`

---

## ⚠️ Important Note About InfinityFree Free Hosting

> **InfinityFree blocks external/remote MySQL connections from outside their servers** (e.g. from your home PC, Navicat, or external tools) for security and anti-DDoS protection.
>
> 🔹 **Locally on your computer**: The backend automatically uses **SQLite fallback** so you can develop and test cards offline without any error.  
> 🔹 **On InfinityFree hosting**: When you upload this backend to InfinityFree (`htdocs`), the PHP server runs on the same internal network and connects directly to `sql101.infinityfree.com`!

---

## 🚀 How to Set Up on InfinityFree

### Step 1: Import Database Tables via phpMyAdmin

1. Log in to your [InfinityFree Control Panel](https://app.infinityfree.com/).
2. Click on **MySQL Databases** or **phpMyAdmin**.
3. Next to `if0_42784359_myscmanagement`, click **phpMyAdmin** (or Connect).
4. Once inside phpMyAdmin, click on the database name **`if0_42784359_myscmanagement`** in the left sidebar.
5. Click on the **Import** tab at the top.
6. Choose the file: [`backend/database/schema.sql`](file:///C:/New%20folder/somaborton/Invitation/backend/database/schema.sql) from this project.
7. Click **Import** (or **Go**) at the bottom.
8. That's it! Both `attendees` and `event_config` tables will be created and pre-filled with the Bengali reunion data.

---

### Step 2: Upload Files to InfinityFree

1. Connect to your InfinityFree account via FTP (FileZilla) or the online **File Manager**.
2. Open the **`htdocs`** folder.
3. Upload the contents of your `backend/` folder (or your built project).
4. Ensure `backend/.env` is uploaded with your database credentials.

---

### Step 3: Test Database Connection on InfinityFree

Once uploaded, visit the status URL in your browser:
```
http://your-domain.infinityfreeapp.com/api/status.php
```
You will receive:
```json
{
  "success": true,
  "status": "healthy",
  "driver": "mysql",
  "attendeesCount": 4,
  "eventTitle": "বাহের ডাক"
}
```

---

## 🧪 Testing Locally

To run locally with SQLite while keeping InfinityFree ready:
```bash
npm run backend
```
And to test database scripts:
```bash
npm run test:backend
```

