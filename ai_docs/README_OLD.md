# Servis Rutin

Web app untuk tracking service kendaraan (motor/mobil) - replikasi sederhana dari Simply Auto.

## Features

- Track service reminders berdasarkan km odometer atau waktu (hari/bulan/tahun)
- Manage multiple vehicles (motor/mobil)
- Visual progress bars untuk due dates
- Onboarding kendaraan baru
- Input dan display service items

## Tech Stack

- **Frontend**: React + TypeScript, Vite
- **Backend**: Hono (Web Framework)
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Runtime**: Cloudflare Workers

## Project Structure

```
├── client/               # React frontend source
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
├── src/                  # Hono backend
│   ├── index.ts         # API routes
│   └── db/
│       └── schema.ts    # Database schema
├── public/              # Built frontend assets (served by Workers)
├── migrations/          # Drizzle migrations
└── wrangler.jsonc       # Cloudflare Workers config
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm/yarn
- Wrangler CLI (`npm i -g wrangler`)

### Installation

Dependencies sudah terinstall. Jika perlu install ulang:

```bash
npm install
```

### Database Setup

Migrations sudah di-generate dan di-apply ke local database.

Untuk membuat production database:
```bash
npx wrangler d1 create servis-rutin-db
# Update database_id di wrangler.jsonc
npm run db:migrate:prod
```

### Development

#### Backend (Cloudflare Workers)

```bash
npm run dev
```

Server akan berjalan di `http://localhost:8787`

API endpoints:
- `GET /api/health` - Health check
- `GET /api/vehicles` - List vehicles (placeholder)
- `POST /api/vehicles` - Create vehicle (placeholder)
- `GET /api/vehicles/:id/services` - List service items (placeholder)
- `POST /api/vehicles/:id/services` - Create service item (placeholder)

#### Frontend Development

Untuk development frontend dengan hot reload:

```bash
npm run dev:frontend
```

Frontend dev server akan berjalan di `http://localhost:5173` dengan proxy ke backend di port 8787.

### Build & Deploy

Build frontend:
```bash
npm run build:frontend
```

Deploy ke Cloudflare Workers:
```bash
npm run deploy
```

## Database Schema

### Vehicles Table
- id, name, type (motor/mobil), brand, model, year, plateNumber, currentOdometer
- timestamps: createdAt, updatedAt

### Service Items Table
- id, vehicleId, partName
- lastServiceDate, lastServiceOdometer
- dueOdometerInterval, dueDaysInterval
- dueDate, dueOdometer
- status (pending, due_soon, overdue, completed)
- notes, timestamps

## Available Scripts

- `npm run dev` - Start Wrangler dev server (backend)
- `npm run dev:frontend` - Start Vite dev server (frontend)
- `npm run build:frontend` - Build React frontend to public/
- `npm run deploy` - Build & deploy to Cloudflare
- `npm run db:generate` - Generate migrations from schema
- `npm run db:migrate` - Apply migrations locally
- `npm run db:migrate:prod` - Apply migrations to production
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Development Phases

### ✅ Phase 1: Setup (Current)
- Project structure
- Git repository
- Frontend & backend skeleton
- Database schema
- Development environment

### 🔜 Phase 2: Onboarding & Core Features
- Vehicle onboarding form
- Service items CRUD
- Odometer/time-based reminders
- Due date calculations

### 🔜 Phase 3: UI/UX
- Service list with progress bars
- Visual indicators (green for due soon)
- Responsive design
- Dashboard overview

### 🔜 Phase 4: Production
- Full testing
- Error handling
- Production deployment
- Performance optimization

## License

Private project
