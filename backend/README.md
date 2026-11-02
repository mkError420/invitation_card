# 🐘 PHP Backend & Database for Invitation Card Management System

A robust, lightweight RESTful PHP backend and database system for the Reunion Invitation Card Generator.

---

## 🚀 Features

- **Dual Database Support**:
  - **SQLite (Default)**: Zero configuration out of the box. Automatically creates and manages `backend/database/database.sqlite`.
  - **MySQL / MariaDB**: Fully supported via PDO with connection pooling and `.env` configuration. Includes complete `schema.sql`.
- **Auto-Initialization & Migrations**: Automatically generates required database tables and seeds initial attendees and event configuration on first startup.
- **RESTful JSON API**:
  - `GET /api/status.php` — Backend health check and database statistics.
  - `GET /api/attendees.php` — List all attendees (supports `?search=keyword`).
  - `GET /api/attendees.php?id={id}` — Fetch single attendee.
  - `POST /api/attendees.php` — Create new attendee.
  - `PUT /api/attendees.php?id={id}` — Update attendee details.
  - `DELETE /api/attendees.php?id={id}` — Delete attendee.
  - `POST /api/attendees.php?action=batch` — Batch CSV import (replace or append).
  - `POST /api/attendees.php?action=reset` — Reset to default attendees.
  - `GET /api/config.php` — Retrieve event branding and invitation config.
  - `POST /api/config.php` — Update event configuration.
  - `POST /api/upload.php` — Upload attendee portrait photos (multipart or Base64 data URL).
- **CORS & Proxy Ready**: Built-in support for Cross-Origin requests and integrated with Vite reverse proxy.
- **Automated Test Suite**: CLI test script verifying all database queries and model operations.

---

## 📁 Directory Structure

```text
backend/
├── config/
│   └── database.php        # PDO Database connection & CORS handler
├── database/
│   ├── database.sqlite     # Auto-generated SQLite database (default)
│   ├── schema.sql          # MySQL database schema & seed SQL
│   └── init.php            # Migration & seed runner CLI/web script
├── models/
│   ├── Attendee.php        # Attendee CRUD model & batch operations
│   └── EventConfig.php     # Event configuration model
├── api/
│   ├── index.php           # API directory & overview
│   ├── status.php          # Health check & system diagnostics
│   ├── attendees.php       # Attendees CRUD endpoints
│   ├── config.php          # Event configuration endpoint
│   └── upload.php          # Photo upload endpoint
├── uploads/                # Directory for uploaded attendee portraits
├── tests/
│   └── test_api.php        # PHP unit/integration test suite
├── .env.example            # Environment configuration template
├── router.php              # PHP development server router
└── README.md               # Documentation
```

---

## 🛠️ Quick Start

### 1. Start the PHP Backend Server

Run the development server on port 8000:

```bash
# Using npm
npm run backend

# Or directly using PHP CLI
php -S 0.0.0.0:8000 backend/router.php
```

The backend will automatically create `backend/database/database.sqlite` and seed default data.

### 2. Verify Database & Status

Open your browser or run in terminal:

```bash
# Test backend health and database connectivity
curl http://localhost:8000/api/status.php

# Or run the built-in CLI tests
npm run test:backend
# or
php backend/tests/test_api.php
```

---

## 🗄️ Database Options

### Option A: SQLite (Default - No Setup Required)
SQLite is pre-configured and runs automatically. Database file is stored at `backend/database/database.sqlite`.

### Option B: MySQL (XAMPP / WAMP / Remote)
1. Copy `.env.example` to `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Edit `backend/.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=invitation_db
   DB_USERNAME=root
   DB_PASSWORD=your_password
   ```
3. Import `backend/database/schema.sql` into your MySQL server via phpMyAdmin or MySQL CLI:
   ```bash
   mysql -u root -p < backend/database/schema.sql
   ```
   Or run the initializer:
   ```bash
   php backend/database/init.php
   ```

---

## 📡 API Reference & Examples

### Health Check
```http
GET /api/status.php
```
**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "driver": "sqlite",
  "phpVersion": "8.4.22",
  "attendeesCount": 4,
  "eventTitle": "বাহের ডাক",
  "timestamp": "2026-11-02T11:00:00+06:00"
}
```

### Get All Attendees
```http
GET /api/attendees.php
GET /api/attendees.php?search=নাজমুল
```

### Create Attendee
```http
POST /api/attendees.php
Content-Type: application/json

{
  "regNo": "১০৩৭",
  "name": "কাজী মোস্তাফিজুর রহমান",
  "school": "রংপুর জিলা স্কুল",
  "district": "রংপুর",
  "guests": "২",
  "phone": "০১৭XXXXXXXX",
  "photoUrl": ""
}
```

### Update Attendee
```http
PUT /api/attendees.php?id=att-1
Content-Type: application/json

{
  "name": "মো: নাজমুল আহসান (আপডেটেড)",
  "guests": "৩"
}
```

### Delete Attendee
```http
DELETE /api/attendees.php?id=att-1
```

### Batch Import / CSV Sync
```http
POST /api/attendees.php?action=batch
Content-Type: application/json

{
  "mode": "append",
  "attendees": [
    {
      "regNo": "১০৩৮",
      "name": "মাহবুবুল আলম",
      "school": "কাউনিয়া উচ্চ বিদ্যালয়",
      "district": "কাউনিয়া, রংপুর",
      "guests": "১",
      "phone": "০১৮XXXXXXXX"
    }
  ]
}
```

### Upload Attendee Photo
```http
POST /api/upload.php
Content-Type: multipart/form-data (photo: file)
```
Or with Base64:
```http
POST /api/upload.php
Content-Type: application/json

{
  "image": "data:image/png;base64,iVBORw0KGgo...",
  "attendeeId": "att-1"
}
```

