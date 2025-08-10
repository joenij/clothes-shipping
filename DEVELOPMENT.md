# Development Guide

This guide will help you set up and run the Clothes Shipping e-commerce platform locally.

## 🚀 Quick Start

### Automated Setup (Recommended)

**Windows:**
```bash
scripts\setup-dev.bat
```

**macOS/Linux:**
```bash
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

### Manual Setup

If the automated setup doesn't work, follow these manual steps:

## 📋 Prerequisites

### Required Software
- **Node.js 18+ LTS** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

### Optional (Recommended)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **Redis** - [Download](https://redis.io/download)
- **Postman** - [Download](https://www.postman.com/downloads/) (for API testing)

### React Native Development (Mobile App)
- **Android Studio** - [Setup Guide](https://reactnative.dev/docs/environment-setup)
- **Xcode** (macOS only) - Available on Mac App Store

## 🏗️ Project Structure

```
ClothesShipping/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utility functions
│   ├── logs/               # Application logs
│   └── uploads/            # File uploads
├── mobile/                 # React Native app
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── screens/        # App screens
│   │   ├── services/       # API clients
│   │   ├── store/          # Redux store
│   │   └── navigation/     # Navigation setup
├── admin-panel/            # React admin interface
├── database/               # SQL schemas and migrations
├── deployment/             # Production deployment files
├── docs/                   # Documentation
└── scripts/                # Setup and utility scripts
```

## ⚙️ Environment Setup

### 1. Database Setup

**Using Docker (Recommended):**
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to start
sleep 10

# Run database migrations
npm run db:migrate
```

**Manual PostgreSQL Setup:**
```bash
# Create database
createdb clothesapp

# Create user
createuser clothesapp_user

# Set password
psql -c "ALTER USER clothesapp_user WITH PASSWORD 'your_password';"

# Grant permissions
psql -c "GRANT ALL PRIVILEGES ON DATABASE clothesapp TO clothesapp_user;"

# Run schema
psql clothesapp < database/schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or your preferred editor

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# iOS setup (macOS only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# In another terminal:
# For Android
npx react-native run-android

# For iOS (macOS only)
npx react-native run-ios
```

### 4. Admin Panel Setup

```bash
cd admin-panel

# Install dependencies
npm install

# Start development server
npm start
```

## 🔧 Environment Variables

### Backend (.env)
```env
# Development settings
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clothesapp
DB_USER=clothesapp_user
DB_PASSWORD=your_password

# JWT (generate secure keys for production)
JWT_SECRET=your-256-bit-secret-key
JWT_REFRESH_SECRET=your-256-bit-refresh-secret

# Stripe (test keys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# DHL (sandbox)
DHL_API_KEY=your_dhl_api_key
DHL_API_SECRET=your_dhl_api_secret
DHL_ACCOUNT_NUMBER=your_dhl_account_number
DHL_BASE_URL=https://api-sandbox.dhl.com

# Email (for testing)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASSWORD=test

# Redis
REDIS_URL=redis://localhost:6379
```

### Mobile App
Update `mobile/src/services/apiClient.js`:
```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001/api'  // Your local IP for device testing
  : 'https://api.itsjn.com/api';
```

For device testing, use your machine's IP instead of localhost:
```javascript
const API_BASE_URL = 'http://192.168.1.100:3001/api';  // Replace with your IP
```

## 🚀 Development Workflow

### Starting All Services

**Option 1: Individual terminals**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Mobile Metro
cd mobile && npm start

# Terminal 3: Admin Panel
cd admin-panel && npm start

# Terminal 4: Mobile App (Android)
cd mobile && npx react-native run-android
```

**Option 2: Using concurrently**
```bash
# Start backend, mobile, and admin together
npm start
```

### Database Operations

```bash
# Reset database
npm run db:reset

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# View database logs
docker-compose logs postgres
```

### Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Mobile tests only
npm run test:mobile

# Watch mode
cd backend && npm run test:watch
```

### Linting

```bash
# Lint all projects
npm run lint

# Auto-fix issues
cd backend && npm run lint:fix
cd mobile && npm run lint:fix
```

## 📱 Mobile Development

### Android Development

1. **Start Android Emulator:**
   - Open Android Studio
   - Start AVD Manager
   - Launch an emulator

2. **Run on Device:**
   ```bash
   # Enable USB debugging on your device
   # Connect via USB
   npx react-native run-android --device
   ```

3. **Debug Menu:**
   - Shake device or press `Cmd+M` (Mac) / `Ctrl+M` (Windows)
   - Enable "Hot Reloading" and "Live Reload"

### iOS Development (macOS only)

1. **Run in Simulator:**
   ```bash
   npx react-native run-ios
   ```

2. **Specific Simulator:**
   ```bash
   npx react-native run-ios --simulator="iPhone 14 Pro"
   ```

3. **Run on Device:**
   - Open `mobile/ios/ClothesShippingApp.xcworkspace` in Xcode
   - Select your device
   - Build and run

### React Native Debugging

1. **Chrome DevTools:**
   - Open debug menu
   - Select "Debug JS Remotely"
   - Open Chrome DevTools

2. **Flipper (Recommended):**
   - Download Flipper
   - Install React Native plugin
   - View network requests, Redux state, etc.

## 🔍 API Testing

### Postman Collection

Import the Postman collection from `docs/api-collection.json`:

1. Open Postman
2. File > Import
3. Select the collection file
4. Set environment variables

### Manual Testing

```bash
# Health check
curl http://localhost:3001/health

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Get products
curl http://localhost:3001/api/products
```

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check PostgreSQL is running: `pg_isready`
- Verify `.env` file exists and has correct values
- Check port 3001 isn't in use: `lsof -i :3001`

**Mobile app build fails:**
- Clear Metro cache: `npx react-native start --reset-cache`
- Clean build: `cd mobile && npx react-native clean`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Database connection error:**
- Verify PostgreSQL service is running
- Check database credentials in `.env`
- Ensure database exists: `psql -l | grep clothesapp`

**iOS build issues (macOS):**
- Clean Xcode build folder: `Cmd+Shift+K`
- Update CocoaPods: `cd ios && pod install`
- Reset iOS Simulator: Device > Erase All Content and Settings

**Android build issues:**
- Clean Gradle cache: `cd android && ./gradlew clean`
- Check ANDROID_HOME environment variable
- Ensure Android SDK and build tools are installed

### Performance Tips

**Development:**
- Use `npm run dev` for auto-reload
- Enable React DevTools
- Use Redux DevTools for state debugging

**Mobile:**
- Use development builds for faster iteration
- Enable Fast Refresh in React Native
- Use `console.tron.log()` with Reactotron for debugging

### Log Files

**Backend logs:**
- Development: Console output
- Production: `backend/logs/combined.log`
- Errors: `backend/logs/error.log`

**Docker logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
```

## 📊 Monitoring

### Development Monitoring

- **Backend**: Console logs and `logs/` directory
- **Database**: pgAdmin or `psql` command line
- **Redis**: Redis CLI or Redis Desktop Manager
- **Email**: Mailhog at http://localhost:8025

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Database connection
docker-compose exec postgres pg_isready

# Redis connection
docker-compose exec redis redis-cli ping
```

## 🎯 Next Steps

Once your development environment is running:

1. **Configure API credentials** in `.env` files
2. **Test payment integration** with Stripe test cards
3. **Set up DHL sandbox** for shipping testing
4. **Create sample data** using the admin panel
5. **Test mobile app** on real devices
6. **Set up push notifications** with Firebase
7. **Configure CI/CD** for automated testing

## 🆘 Getting Help

- **Issues**: Create a GitHub issue
- **Documentation**: Check `docs/` folder
- **API Reference**: Visit http://localhost:3001/docs (when running)
- **Community**: Join our Discord server

Happy coding! 🚀