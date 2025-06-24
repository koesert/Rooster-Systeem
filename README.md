# 🍽️ Rooster-Systeem

Een moderne web-applicatie voor het beheren van werkroosters en medewerkers in restaurants, gebouwd met ASP.NET Core en Next.js.

## 📋 Overzicht

Het Rooster-Systeem is een volledig functionele webapplicatie die restaurantmanagers helpt bij het beheren van hun personeel en werkroosters. Het systeem biedt rolgebaseerde toegang met verschillende functionaliteiten voor managers, shiftleiders en medewerkers.

### ✨ Hoofdfuncties

- **👥 Medewerkerbeheer**: Volledig CRUD-systeem voor medewerkers
- **🔐 Authenticatie & Autorisatie**: JWT-gebaseerde beveiliging met rolgebaseerde toegang
- **📅 Roostersysteem**: Shift planning en beheer (in ontwikkeling)
- **📊 Dashboard**: Overzichtelijke interface met belangrijke informatie
- **🎨 Moderne UI**: Responsive design met glasmorphism effecten
- **📱 Mobile-First**: Geoptimaliseerd voor alle apparaten

### 👥 Gebruikersrollen

- **🎯 Manager**: Volledige toegang tot alle functionaliteiten
- **🚀 Shiftleider**: Beperkte beheerfunctionaliteiten
- **👤 Medewerker**: Toegang tot eigen profiel en roosters

## 🛠️ Technologie Stack

### Backend
- **Framework**: ASP.NET Core 8.0
- **Database**: SQLite met Entity Framework Core
- **Authenticatie**: JWT Bearer Tokens
- **Password Hashing**: BCrypt.Net
- **API**: RESTful API met Swagger documentatie

### Frontend
- **Framework**: Next.js 15.3 met React 19
- **Styling**: Tailwind CSS 4.0
- **Icons**: Lucide React
- **TypeScript**: Volledig type-safe
- **State Management**: React Context API

## 🚀 Installatie & Setup

### Vereisten
- .NET 8.0 SDK
- Node.js 18+ en npm/yarn
- Git

### Backend Setup

1. **Clone de repository**
   ```bash
   git clone <repository-url>
   cd Rooster-Systeem
   ```

2. **Navigeer naar backend directory**
   ```bash
   cd backend
   ```

3. **Installeer dependencies**
   ```bash
   dotnet restore
   ```

4. **Database setup**
   ```bash
   dotnet ef database update
   ```

5. **Start de backend server**
   ```bash
   dotnet run
   ```

   De backend API is nu beschikbaar op `https://localhost:7001` of `http://localhost:5000`

### Frontend Setup

1. **Open nieuwe terminal en navigeer naar frontend**
   ```bash
   cd frontend
   ```

2. **Installeer dependencies**
   ```bash
   npm install
   ```

3. **Start de development server**
   ```bash
   npm run dev
   ```

   De frontend is nu beschikbaar op `http://localhost:3000`

## 🔧 Configuratie

### Database
- **Standaard**: SQLite database in `backend/Data/restaurant_roster.db`
- **Connection String**: Configureerbaar in `appsettings.json`

### JWT Settings
- **Development**: Automatisch geconfigureerd
- **Production**: Configureer secure keys in appsettings

### Default Admin Account
- **Username**: `admin`
- **Password**: `Admin123!`
- **Role**: Manager

## 📁 Project Structuur

```
Rooster-Systeem/
├── backend/                    # ASP.NET Core API
│   ├── Controllers/           # API Controllers
│   ├── Models/               # Data Models
│   ├── DTOs/                 # Data Transfer Objects
│   ├── Services/             # Business Logic
│   ├── Data/                 # Database Context & Migrations
│   ├── Authorization/        # JWT & Role-based auth
│   └── Converters/           # JSON Converters
├── frontend/                  # Next.js React App
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── components/       # Reusable Components
│   │   ├── contexts/         # React Context Providers
│   │   ├── hooks/           # Custom Hooks
│   │   ├── lib/             # API Client
│   │   ├── types/           # TypeScript Types
│   │   └── utils/           # Utility Functions
│   └── public/              # Static Assets
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/login` - Inloggen
- `POST /api/auth/logout` - Uitloggen
- `POST /api/auth/refresh` - Token vernieuwen

### Employees
- `GET /api/employee` - Alle medewerkers (Manager only)
- `GET /api/employee/{id}` - Specifieke medewerker
- `GET /api/employee/profile` - Eigen profiel
- `POST /api/employee` - Nieuwe medewerker (Manager only)
- `PUT /api/employee/{id}` - Update medewerker
- `PUT /api/employee/profile` - Update eigen profiel
- `DELETE /api/employee/{id}` - Verwijder medewerker (Manager only)

### Shifts (In ontwikkeling)
- `GET /api/shift` - Alle shifts
- `POST /api/shift` - Nieuwe shift
- `PUT /api/shift/{id}` - Update shift
- `DELETE /api/shift/{id}` - Verwijder shift

## 🎨 UI/UX Features

- **🌟 Glassmorphism Design**: Moderne glaseffecten en backdrop blur
- **🎯 Responsive Layout**: Werkt perfect op desktop, tablet en mobile
- **🔄 Loading States**: Smooth loading animaties
- **✅ Form Validation**: Real-time validatie met duidelijke foutmeldingen
- **🌈 Color Scheme**: Warme kleuren geïnspireerd door restaurant atmosfeer
- **🚫 Autocomplete Prevention**: Geavanceerde technieken tegen browser autocomplete

## 📅 Datum Formaat

Het systeem gebruikt consistent **DD-MM-YYYY** formaat voor alle datums:
- **Frontend Display**: Alle datums getoond in DD-MM-YYYY
- **Backend API**: JSON responses in DD-MM-YYYY formaat
- **Database**: DateTime objects met automatische conversie

## 🔒 Beveiliging

- **JWT Authentication**: Secure token-based authenticatie
- **Role-based Authorization**: Granulaire toegangscontrole
- **Password Hashing**: BCrypt met salt
- **Input Validation**: Comprehensive server-side validatie
- **CORS Configuration**: Proper cross-origin setup
- **Autocomplete Prevention**: Geavanceerde browser autocomplete preventie

---

<div align="center">
  <p>Gemaakt met ❤️ voor de restaurant industrie</p>
  <p><strong>Rooster-Systeem</strong> - Moderne workforce management</p>
</div>