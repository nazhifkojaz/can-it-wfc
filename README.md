# Can-It-WFC 🏢☕

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Django 5.1](https://img.shields.io/badge/django-5.1-green.svg)](https://www.djangoproject.com/)
[![React 19](https://img.shields.io/badge/react-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)](https://www.typescriptlang.org/)

A mobile-first platform for discovering and reviewing cafes based on their suitability for remote work (Work From Cafe).

## ✨ Features

- 🗺️ **Interactive Map** with nearby cafe search powered by Google Places API
- 📝 **Combined Visit + Review System** - Log visits with optional reviews in one flow
- ⭐ **5-Criteria WFC Rating** - WiFi, Power Outlets, Comfort, Noise Level, Overall Rating
- 🕐 **Visit Time Tracking** - Morning, Afternoon, or Evening visits
- ✏️ **Edit Within 7 Days** - Update visit details within a week
- ❤️ **Favorites** - Save your go-to cafes for quick access
- 📱 **Mobile-First** - Responsive design optimized for phones

## 🛠️ Tech Stack

### Backend
- **Framework**: Django 5.1.6 + Django REST Framework 3.15.2
- **Database**: PostgreSQL (Supabase or self-hosted)
- **Authentication**: JWT with automatic token refresh
- **APIs**: Google Places API for cafe discovery
- **Package Manager**: uv (modern Python package manager)

### Frontend
- **Framework**: React 19 + TypeScript 5.9
- **Build Tool**: Vite 6 (75-150x faster than Create React App)
- **State Management**: React Query v5 for data fetching
- **Routing**: React Router 7
- **Maps**: Leaflet + React Leaflet
- **Icons**: Lucide React
- **UI Components**: Headless UI

## 📋 Prerequisites

- **Python 3.11+** (backend uses `uv` package manager)
- **Node.js 18+** (frontend)
- **PostgreSQL** database
- **Google Places API key** ([Get one here](https://console.cloud.google.com/apis/credentials))

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/can-it-wfc.git
cd can-it-wfc
```

### 2. Backend Setup

```bash
cd backend

# Install uv package manager (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Create .env file from example
cp .env.example .env

# Edit .env and add your credentials:
# - SECRET_KEY (generate using: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
# - DATABASE_URL (PostgreSQL connection string)
# - GOOGLE_PLACES_API_KEY (from Google Cloud Console)

# Activate virtual environment
source .venv/bin/activate

# Run migrations
python manage.py migrate

# Create superuser for admin access
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

Backend will be running at: **http://localhost:8000**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env and set:
# VITE_API_URL=http://localhost:8000/api

# Start development server
npm start
```

Frontend will be running at: **http://localhost:3000**

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **API Documentation (Swagger)**: http://localhost:8000/api/docs/

## 🧪 Running Tests

### Backend Tests
```bash
cd backend
source .venv/bin/activate
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Building for Production

### Backend
```bash
cd backend
# Set DEBUG=False in .env
python manage.py collectstatic --noinput
```

### Frontend
```bash
cd frontend
npm run build
# Output in: frontend/dist/
```

## 🎯 User Flow

1. **Discover** - Search nearby cafes on interactive map (combines database + Google Places)
2. **Visit** - Log a visit when you're at the cafe (location verified within 1km)
3. **Review** - Optionally add a review with 5 key criteria
4. **Track** - See your visit history, spending patterns, and favorite cafes
5. **Edit** - Update visit details within 7 days if needed

## 🏗️ Architecture Highlights

### Backend Design Patterns
- **Combined Visit+Review Endpoint** - Atomic creation in single API call
- **Denormalized Statistics** - Fast queries (total_visits, average_rating cached)
- **Geolocation Without PostGIS** - Haversine calculations for portability
- **Auto-Registration** - Unregistered cafes from Google Places auto-register on visit
- **Simplified Review Form** - 5 key criteria (WiFi, Power, Comfort, Noise, Overall)

### Frontend Design Patterns
- **Custom Hooks** - All data fetching abstracted (`useCafes`, `useVisits`, etc.)
- **Centralized Config** - All constants in `config/constants.ts`
- **Reusable Components** - Modals, sheets, loading states standardized
- **Optimistic Updates** - React Query for instant UI feedback
- **Mobile-First** - Bottom navigation, touch-optimized

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Places API** for comprehensive cafe data
- **OpenStreetMap** for map tiles
- **React Query** for excellent data fetching patterns
- **Vite** for blazing fast development experience
- **Claude Code** for pair programming assistance and speeding (a lot of) things up.
- All contributors and testers who helped improve the platform

---

**Made with ☕ by remote workers, for remote workers**
