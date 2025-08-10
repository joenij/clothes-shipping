# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Directory Commands
- `npm run setup:dev` / `npm run setup:dev:win` - Automated development environment setup
- `npm start` - Start all services (backend, mobile, admin) concurrently
- `npm test` - Run all tests across projects
- `npm run lint` - Lint all projects
- `npm run build` - Build backend and admin panel
- `npm run docker:up` - Start all services with Docker Compose
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database completely

### Backend (Node.js/Express)
- `npm run dev` - Start development server with nodemon
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` / `npm run lint:fix` - ESLint checking/fixing
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data

### Mobile App (React Native)
- `npm start` - Start Metro bundler
- `npm run android` - Run Android app
- `npm run ios` - Run iOS app (macOS only)
- `npm test` - Run Jest tests
- `npm run lint` - ESLint checking
- `npx react-native run-android --device` - Run on Android device
- `npx react-native start --reset-cache` - Clear Metro cache

### Customer Website (React/Create React App)
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run Jest tests
- `npm run lint` / `npm run lint:fix` - ESLint checking/fixing
- `npm run type-check` - TypeScript type checking

### Admin Panel (React/Vite)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` / `npm run lint:fix` - ESLint checking/fixing
- `npm run type-check` - TypeScript type checking

## Architecture Overview

### Monorepo Structure
This is a monorepo with five main applications:
- **backend/** - Node.js/Express API server
- **mobile/** - React Native mobile app
- **customer-website/** - React web application for customer shopping
- **admin-panel/** - React web application for administration
- **supplier-portal/** - React web application for suppliers

### Backend Architecture
- **Express.js** REST API with comprehensive security middleware
- **PostgreSQL** database with UUID primary keys
- **Redis** for caching and sessions
- **JWT authentication** with refresh tokens and httpOnly cookies
- **Route-based architecture**: `/routes` contains API endpoints organized by feature
- **Service layer**: `/services` contains business logic (AuthService, DHLService, CurrencyService)
- **Middleware**: Security, authentication, error handling, and rate limiting
- **Comprehensive logging** with Winston

### Mobile App Architecture
- **React Native 0.73.2** with modern navigation patterns
- **Redux Toolkit** for state management with slices (auth, cart)
- **Multi-language support** with i18next (EN, PT, DE, FR, ES)
- **Payment integration** with Stripe React Native
- **Navigation**: React Navigation with stack and tab navigators

### Database Schema
Key relationships and patterns:
- Users table with role-based access (customer, admin, supplier)
- Multi-language and multi-currency support built-in
- Address management with multiple addresses per user
- Order system with comprehensive status tracking
- Product catalog with variants and supplier relationships
- Shipping zones for EU, Brazil, and Namibia

### Key Integrations
- **Stripe** for payment processing with webhook support
- **DHL API** for shipping and tracking
- **Multi-currency** support (EUR, BRL, NAD) with live exchange rates
- **Email system** with SMTP configuration (Mailhog for development)

## Development Environment

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 14+
- Redis 6+ (optional, can use Docker)
- React Native development environment for mobile

### Environment Files
- Backend requires `.env` file with database, JWT, Stripe, and DHL credentials
- Mobile app API URLs configured in `src/services/apiClient.js`
- Use `scripts/setup-dev.sh` or `scripts/setup-dev.bat` for automated setup

### Docker Development
- `docker-compose.yml` provides complete development environment
- Includes PostgreSQL, Redis, Mailhog, and optional nginx
- Database schema automatically loaded on container startup

### Testing Strategy
- Backend uses Jest with supertest for API testing
- Mobile app uses Jest with React Native testing library
- Run `npm test` from root to test all projects

### Security Features
- Rate limiting (100 req/15min general, 5 req/15min auth)
- Helmet.js for security headers
- Input validation with Joi and express-validator
- CORS configuration for development and production
- Password hashing with bcryptjs
- SQL injection protection with parameterized queries

## Common Development Tasks

### Adding New API Endpoints
1. Create route file in `backend/src/routes/`
2. Add route to `backend/src/app.js`
3. Implement business logic in `backend/src/services/` if needed
4. Add validation middleware
5. Update mobile app API client if needed

### Database Changes
1. Create migration file in `database/migrations/`
2. Update main schema in `database/schema.sql`
3. Run `npm run db:migrate` to apply changes
4. Update seed data if necessary

### Mobile App Development
- Use `__DEV__` flag for development-specific code
- For device testing, update API URL to use machine IP instead of localhost
- iOS requires running `cd ios && pod install` after dependency changes
- Android requires ANDROID_HOME environment variable

### Multi-language Support
- Backend: Add translations to appropriate service files
- Mobile: Add keys to translation files in `src/i18n/`
- Supported languages: English, Portuguese, German, French, Spanish

### Payment Testing
- Use Stripe test cards for payment testing
- Webhook endpoint: `/api/payments/webhook`
- Test in both mobile app and admin panel

### Troubleshooting
- Clear Metro cache with `npx react-native start --reset-cache`
- Reset database with `npm run db:reset`
- Check logs in `backend/logs/` directory
- View Docker logs with `docker-compose logs -f [service-name]`