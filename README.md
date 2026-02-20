# Servis Rutin - Vehicle Service Tracker 🚗🏍️

A web application for tracking vehicle service schedules and maintenance reminders, built with React, Hono, and Cloudflare D1.

## ✨ Features

- ✅ Track multiple vehicles (motorcycles and cars)
- ✅ Service reminders based on odometer (km) or time intervals
- ✅ Visual progress indicators with color-coded status (green/yellow/red)
- ✅ Intelligent alerts for services due soon (<500km or <7 days)
- ✅ Multi-vehicle switching with current odometer tracking
- ✅ Sort service items by name, date, or km
- ✅ Simple and intuitive interface
- ✅ Real-time progress calculations
- ✅ Update current odometer with dialog
- ✅ Secure User Authentication (Email/Password + Turnstile)

## 🚀 Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Radix UI + Tailwind CSS
- **Backend**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **State Management**: Zustand
- **Date Handling**: date-fns
- **Deployment**: Cloudflare Workers + D1

## 📁 Project Structure

```
servis-rutin/
├── client/
│   └── src/
│       ├── components/         # React components
│       ├── store/              # Zustand global state
│       ├── App.tsx             # Main application
│       └── main.tsx            # Entry point
├── src/
│   ├── index.ts                # API routes & endpoints
│   ├── auth.ts                 # Authentication logic
│   ├── lib/                    # Shared libraries (validation, errors, etc.)
│   └── db/
│       └── schema.ts           # Database schema (Drizzle)
├── migrations/                 # Drizzle migrations
├── public/                     # Built frontend assets
├── DEPLOYMENT.md               # Deployment guide
├── README.md                   # This file
└── wrangler.jsonc              # Cloudflare Workers config
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up local database:**
   ```bash
   npm run db:migrate
   ```

3. **Start development servers:**
   ```bash
   # Terminal 1: Backend API
   npm run dev
   # → http://localhost:8787

   # Terminal 2: Frontend with hot reload
   npm run dev:frontend
   # → http://localhost:5173
   ```

4. **Open application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8787/api/health

### Add Test Data (Optional)

Via Drizzle Studio (GUI):
```bash
npm run db:studio
```

## 📚 Available Scripts

### Development
```bash
npm run dev                # Backend API (port 8787)
npm run dev:frontend       # Frontend dev server (port 5173)
npm start                  # Alias for npm run dev
```

### Build & Test
```bash
npm run build:frontend     # Build React for production
npm run lint               # Run ESLint
npx tsc --noEmit          # TypeScript type check
npm test                   # Run tests (Vitest)
```

### Database
```bash
npm run db:generate        # Generate migrations from schema
npm run db:migrate         # Apply migrations locally
npm run db:migrate:prod    # Apply migrations to production
npm run db:studio          # Open Drizzle Studio GUI
```

### Deployment
```bash
npm run deploy            # Deploy to Cloudflare Workers
npx wrangler tail         # View production logs
npx wrangler d1 list      # List D1 databases
```

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete deployment guide.

## 🌐 API Endpoints

### Health Check
- `GET /api/health` - API health check

### Vehicles
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Create new vehicle
- `PUT /api/vehicles/:id/km` - Update current odometer

### Service Items
- `GET /api/service-items?kendaraanId=X&order=Y` - List service items
- `POST /api/service-items` - Create service item

## 🎯 Development Phases

- ✅ **Phase 1**: Project setup and infrastructure
- ✅ **Phase 2**: Tech stack setup
- ✅ **Phase 3**: Service item input form
- ✅ **Phase 4**: Service list display
- ✅ **Phase 5**: Multi-vehicle support & reminders
- ✅ **Phase 6**: Authentication & Security Hardening
- 🚀 **Status**: Production Ready!

## 🔧 Database Schema

### kendaraan (Vehicles)
```sql
id              INTEGER PRIMARY KEY
nama            TEXT NOT NULL
tipe            TEXT              -- "Motor" or "Mobil"
plat            TEXT
tahun           INTEGER
bulan_pajak     INTEGER
current_km      INTEGER DEFAULT 0
```

### service_items
```sql
id              INTEGER PRIMARY KEY
kendaraan_id    INTEGER REFERENCES kendaraan(id)
nama            TEXT NOT NULL
interval_type   TEXT              -- "KM", "DAY", "MONTH", "YEAR", "WHICHEVER_FIRST", "NONE"
interval_value  INTEGER
last_km         INTEGER
last_date       TEXT              -- "2024-10-21"
```

## 🚢 Deployment

### Quick Deploy to Cloudflare

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Apply migrations to production
npm run db:migrate:prod

# 3. Build and deploy
npm run build:frontend
npx wrangler deploy

# Done! 🎉
```

## 🎨 Screenshots

The application features:
- ✅ Clean modern design system (Radix UI + Tailwind)
- ✅ Color-coded progress bars (green/yellow/red)
- ✅ Responsive card layout
- ✅ Real-time service alerts (Sonner)
- ✅ Multi-vehicle dropdown selector
- ✅ Update odometer dialog

## 🙏 Credits & Technologies

Built with amazing open-source tools:

**Frontend:**
- React 19 + TypeScript
- Radix UI + Tailwind CSS
- Vite 7 (build tool)
- Zustand (state management)
- date-fns (date utilities)

**Backend:**
- Hono (web framework)
- Cloudflare Workers (serverless runtime)
- Cloudflare D1 (SQLite database)
- Drizzle ORM (type-safe queries)

**Security:**
- Web Crypto API (PBKDF2)
- Cloudflare Turnstile

**Development:**
- ESLint (code quality)
- TypeScript (strict mode)
- Vitest (testing)

## 📄 License

MIT License - feel free to use for your own projects!

---

**Status**: ✅ Production Ready  
**Version**: 1.1.0
**Last Updated**: October 2024

Built with ❤️ using React, Hono, and Cloudflare
