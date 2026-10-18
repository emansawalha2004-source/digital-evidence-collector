# EvidenceSystem Backend

Node.js Express API for authentication, cases, evidence, timeline, reports, and analysis.

## Install

```bash
cd EvidenceSystem/backend
cp .env.example .env
npm install
```

## Environment

Use `.env.example` as the template. Required values:

```txt
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/evidence_system
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
STORAGE_UPLOADS_DIR=storage/uploads
STORAGE_REPORTS_DIR=storage/reports
NODE_ENV=development
OTP_DELIVERY=email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

Do not commit a real `.env` file.

## Seed

```bash
npm run seed
```

Seed creates admin, investigator, viewer, auditor accounts, sample case, evidence, audit logs, and one analysis result.

## Run

```bash
npm run dev
```

API base URL:

```txt
http://localhost:5000/api
```

## Test accounts

- admin@evidence.local / Admin@123456
- investigator@evidence.local / Investigator@123456
- viewer@evidence.local / Viewer@123456
- auditor@evidence.local / Auditor@123456

## Main modules

- Auth: `/api/auth/*`
- Cases: `/api/cases/*`
- Evidence: `/api/evidence/*`
- Timeline: `/api/timeline/*`
- Dashboard: `/api/dashboard`
- Reports: `/api/reports/*`
- Analysis: `/api/analysis/*`


## Email OTP

OTP is sent by email when `OTP_DELIVERY=email`. Put the real Gmail app password in `backend/.env` only. Do not place the real password in `.env.example` or commit it.

For Gmail, `SMTP_PASS` must be an App Password, not the normal account password.
