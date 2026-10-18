# EvidenceSystem Frontend

Vite React TypeScript frontend for EvidenceSystem.

## Install

```bash
cd EvidenceSystem/frontend
cp .env.example .env
npm install
```

## Environment

```txt
VITE_API_BASE_URL=http://localhost:5000/api
```

Do not commit a real `.env` file.

## Run

```bash
npm run dev
```

## Build check

```bash
npm run build
```

## Implemented pages

- `/login`
- `/register`
- `/account`
- `/dashboard`
- `/cases`
- `/cases/:id`
- `/evidence`
- `/evidence/:id`
- `/upload`
- `/archived`
- `/timeline`
- `/reports`
- `/analysis`

## Auth behavior

Protected pages redirect unauthenticated users to `/login`. The token is stored in `localStorage` under `authToken` and attached to API requests using `Authorization: Bearer <token>`.
