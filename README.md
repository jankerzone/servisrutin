# Servis Rutin - Vehicle Service Tracker 🚗🏍️

A web application for tracking vehicle service schedules and maintenance reminders, built with React, Hono, and Cloudflare D1.

## ✨ Features

- ✅ Track multiple vehicles (motorcycles and cars)
- ✅ Service reminders based on odometer (km) or time intervals
- ✅ Visual progress indicators with color-coded status (green/yellow/red)
- ✅ Intelligent alerts for services due soon (<500km or <7 days)
- ✅ Multi-vehicle switching with current odometer tracking
- ✅ Sort service items by name, date, or km
- ✅ Simple and intuitive Material-UI interface
- ✅ Real-time progress calculations
- ✅ Update current odometer with dialog

## 🚀 Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Material-UI
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
│       ├── components/
│       │   ├── AddServiceForm.tsx      # Service item input form
│       │   ├── ServiceView.tsx         # Main service view with sorting
│       │   ├── ServiceList.tsx         # Service cards with progress bars
│       │   └── VehicleSelector.tsx     # Vehicle dropdown and KM tracker
│       ├── store/
│       │   └── useKendaraanStore.ts    # Zustand global state
│       ├── App.tsx                     # Main application
│       └── main.tsx                    # Entry point
├── src/
│   ├── index.ts                        # API routes & endpoints
│   └── db/
│       └── schema.ts                   # Database schema (Drizzle)
├── migrations/                          # Drizzle migrations
│   ├── 0000_spooky_mysterio.sql       # Initial tables
│   └── 0001_rapid_vision.sql          # Add current_km field
├── ai_docs/                            # Phase documentation
│   ├── phase_1.md
│   ├── phase_2.md
│   ├── phase_3.md
│   └── phase_4_5.md
├── public/                             # Built frontend assets
├── DEPLOYMENT.md                       # Deployment guide
├── README.md                           # This file
└── wrangler.jsonc                      # Cloudflare Workers config
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

Or via SQL:
```bash
npx wrangler d1 execute servis-rutin-db --local \
  --command "INSERT INTO kendaraan (nama, tipe, plat, current_km) 
             VALUES ('Honda Beat', 'Motor', 'B 1234 XYZ', 15000)"
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

## 📖 Documentation

Detailed documentation for each development phase:

- [Phase 1: Project Setup](ai_docs/phase_1.md)
- [Phase 2: Tech Stack Setup](ai_docs/phase_2.md)
- [Phase 3: Service Input Form](ai_docs/phase_3.md)
- [Phase 4 & 5: List Display & Advanced Features](ai_docs/phase_4_5.md)
- [Deployment Guide](DEPLOYMENT.md)

## 🎯 Development Phases

- ✅ **Phase 1**: Project setup and infrastructure (Git, dependencies, config)
- ✅ **Phase 2**: Tech stack setup (MUI, Zustand, date-fns, ESLint, D1 schema)
- ✅ **Phase 3**: Service item input form with interval types
- ✅ **Phase 4**: Service list display with progress bars and sorting
- ✅ **Phase 5**: Multi-vehicle support, reminders, current km tracking
- 🚀 **Status**: Production Ready!

## 🎨 Key Features

### Service Item Management
- Add service items with name
- Choose interval type: KM, DAY, MONTH, YEAR, WHICHEVER_FIRST, NONE
- Set interval value (e.g., 5000 km, 12 months)
- Record last service date and km

### Visual Progress Tracking
- **Green bar (<50%)**: Service is fresh, no action needed
- **Yellow bar (50-80%)**: Service due soon, plan ahead
- **Red bar (>80%)**: Service overdue, take action!

### Smart Reminders
- Automatic alerts when service is within 500km or 7 days
- Snackbar notifications at top of screen
- Shows all due items in one message
- "OVERDUE" flag for past-due services

### Multi-Vehicle Support
- Dropdown selector to switch between vehicles
- Current odometer display per vehicle
- Quick update dialog for odometer readings
- Progress recalculated per vehicle

### Sorting & Organization
- Sort by: Name, Last Date, Last KM
- Clean card-based layout
- Responsive Material-UI design
- Loading states and empty states

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

Your app will be live at:
```
https://servis-rutin-backend.YOUR_SUBDOMAIN.workers.dev
```

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for:
- Custom domain setup
- Environment variables
- Monitoring & logs
- Troubleshooting
- Production checklist

## 🎨 Screenshots

The application features:
- ✅ Clean Material-UI design system
- ✅ Color-coded progress bars (green/yellow/red)
- ✅ Responsive card layout
- ✅ Real-time service alerts (Snackbar)
- ✅ Multi-vehicle dropdown selector
- ✅ Update odometer dialog

## 🙏 Credits & Technologies

Built with amazing open-source tools:

**Frontend:**
- React 19 + TypeScript
- Material-UI (MUI) v7
- Vite 7 (build tool)
- Zustand (state management)
- date-fns (date utilities)

**Backend:**
- Hono (web framework)
- Cloudflare Workers (serverless runtime)
- Cloudflare D1 (SQLite database)
- Drizzle ORM (type-safe queries)

**Development:**
- ESLint (code quality)
- TypeScript (strict mode)
- Vitest (testing)

## 📊 Performance

- **Build Time**: ~3s
- **Bundle Size**: 473 KB (gzipped: 145 KB)
- **API Response**: <100ms (D1 edge database)
- **Global Edge**: Cloudflare's network (250+ cities)

## 🔮 Future Enhancements

Ideas for future versions:

- [ ] User authentication (Cloudflare Access)
- [ ] Service history tracking (completion logs)
- [ ] Edit/delete service items
- [ ] Cost tracking per service
- [ ] Bulk import/export (CSV)
- [ ] Reports and analytics
- [ ] Push notifications (Web Push API)
- [ ] Mobile app (React Native)
- [ ] Multi-language support

## 📄 License

MIT License - feel free to use for your own projects!

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: October 21, 2024

Built with ❤️ using React, Hono, and Cloudflare
