# YourFellow Forecast & Capacity Planning Tool

Een dedicated webapplicatie voor forecast- en capaciteitsplanning voor YourFellow, een digital marketing bureau.

## Features

- **Dashboard** - Overzicht met KPI's voor sales en capaciteit
- **Capaciteitsoverzicht** - Inzicht in beschikbare en geplande capaciteit per medewerker
- **Forecast Editor** - Budget per klant verdelen over medewerkers en taken per maand
- **Medewerkersbeheer** - CRUD operaties op medewerkers, contracten en verlof
- **Klantenbeheer** - CRUD operaties op klanten en budgetten
- **Sales Dashboard** - Tracking van omzetdoelstellingen
- **Risico Dashboard** - Klantconcentratie en vertrekrisico analyse
- **Alerting** - Proactieve waarschuwingen bij overbezetting of onverdeeld budget

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript
- **UI**: Tailwind CSS, Radix UI primitives
- **Backend**: Next.js API Routes
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma
- **Auth**: NextAuth.js

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd forecast
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
npm run db:push
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials

- **Admin**: admin@yourfellow.nl / admin123
- **Planner**: planner@yourfellow.nl / planner123
- **Consultant**: consultant@yourfellow.nl / consultant123

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (login)
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   ├── layout/           # Layout components (sidebar, header)
│   ├── providers/        # Context providers
│   └── ui/               # UI components (shadcn-like)
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── capacity.ts       # Capacity calculation utilities
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # General utilities
└── types/                # TypeScript type definitions
```

## Business Rules

### Uurtarief Berekening
- Intern uurtarief: €125
- Conversie: `interne_uren = klant_budget / 125`

### Capaciteitsberekening
- Werkdagen = Weekdagen in maand - Feestdagen
- Max capaciteit (uren) = (Contracturen / 5) x Werkdagen - Verlofuren
- Bezettingsgraad = (Geplande uren / Max capaciteit) x 100%

### Alert Thresholds
- < 70%: OK (groen)
- 70% - 80%: Waarschuwing (oranje)
- > 80%: Alert (rood)
- > 100%: Kritiek (donkerrood)

### Budget Types
- SUBSCRIPTION: Doorlopend abonnement (100%)
- PROJECT: Eenmalig project (100%)
- PROSPECT: Potentiële klant (gewogen naar kans-%)
- TOOLING: Niet in netto omzet
- NACALCULATIE: Achteraf gefactureerd (100%)
- INHUUR: Niet in netto omzet

## User Roles

| Rol | Beschrijving |
|-----|--------------|
| Admin | Volledige toegang, systeembeheer |
| Planner | Forecast en capaciteit beheren |
| Consultant | Alleen lezen, eigen planning zien |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed database with demo data
npm run db:reset     # Reset and reseed database
```

## API Endpoints

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Deactivate employee

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client details
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Archive client

### Forecast
- `GET /api/forecast` - Get forecast for month
- `POST /api/forecast/entries` - Create forecast entry
- `PUT /api/forecast/entries/:id` - Update entry
- `DELETE /api/forecast/entries/:id` - Delete entry

### Capacity
- `GET /api/capacity` - Get capacity overview

### Dashboard
- `GET /api/dashboard` - Get KPIs
- `GET /api/dashboard/alerts` - Get alerts

## License

Private - YourFellow
