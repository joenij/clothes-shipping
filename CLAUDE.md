# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Production Status

**🎉 FULLY DEPLOYED PRODUCTION SYSTEM - JNE Outlet E-Commerce Platform**

### Live Production URLs:
- **🛒 Shop Frontend**: https://shop.jneoutlet.com - Complete e-commerce platform with product browsing and cart
- **👨‍💼 Admin Panel**: https://admin.jneoutlet.com - Enterprise dashboard with analytics and management  
- **🔌 REST API**: https://api.jneoutlet.com - Full backend API with authentication and all endpoints
- **🏭 Supplier Portal**: https://api.jneoutlet.com/api/supplier-portal - Advanced supplier management system

### Production Features:
- ✅ **SSL Security**: Let's Encrypt certificates with automatic renewal
- ✅ **Enterprise Frontend**: Material Design with security headers and responsive layout
- ✅ **Complete API**: Products, orders, payments, authentication, supplier management
- ✅ **Database**: PostgreSQL with comprehensive e-commerce schema including product images/variants
- ✅ **Product Details**: Full product pages with image galleries, variants (sizes/colors), specifications
- ✅ **Shopping Cart**: Persistent cart with add/remove/quantity management
- ✅ **Multi-language**: EN/DE/PT support throughout platform
- ✅ **Docker Deployment**: Production environment on Hetzner Cloud VPS
- ✅ **Payment Integration**: Stripe-ready payment processing

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

### Shop Frontend (Static HTML/JS)
- **Production**: Deployed at https://shop.jneoutlet.com
- **Features**: Product browsing, detailed product pages, shopping cart, responsive design
- **File**: `enhanced-shop-frontend.html` contains the complete single-page application

## Architecture Overview

### Production Deployment Architecture
This is a fully deployed production e-commerce platform with the following architecture:

#### **Infrastructure**
- **Cloud Provider**: Hetzner Cloud VPS (91.99.27.249)
- **SSL/TLS**: Let's Encrypt certificates with auto-renewal
- **Web Server**: nginx with HTTP/2 and security headers
- **Container Platform**: Docker with docker-compose orchestration
- **Database**: PostgreSQL 15 with full ACID compliance
- **Caching**: Redis for sessions and performance

#### **Frontend Applications**
1. **Shop Frontend** (https://shop.jneoutlet.com)
   - Single-page application with product browsing
   - Detailed product pages with image galleries
   - Shopping cart with persistent storage
   - Responsive Material Design interface
   - Product search and category filtering

2. **Admin Dashboard** (https://admin.jneoutlet.com)  
   - Enterprise dashboard with analytics
   - Product and order management
   - Real-time charts and reporting
   - Secure authentication with JWT tokens

3. **Supplier Portal** (API-based)
   - Advanced inventory management
   - Sales analytics and reporting  
   - Automated restock recommendations
   - Multi-supplier support

#### **Backend Services**
- **Main API** (https://api.jneoutlet.com)
  - Express.js REST API with comprehensive endpoints
  - JWT authentication with refresh tokens
  - Rate limiting and security middleware
  - Full CRUD operations for products, orders, users
  - Payment processing integration (Stripe)
  - Multi-language content support

### Monorepo Structure
This is a monorepo with six main applications:
- **backend/** - Node.js/Express API server (Production deployed)
- **mobile/** - React Native mobile app
- **customer-website/** - React web application for customers
- **admin-panel/** - React web application for administration (Production deployed)
- **supplier-portal/** - React web application for suppliers (API deployed)
- **enhanced-shop-frontend.html** - Complete shop frontend (Production deployed)

### Backend Architecture
- **Express.js** REST API with comprehensive security middleware
- **PostgreSQL** database with UUID primary keys and full e-commerce schema
- **Redis** for caching and sessions
- **JWT authentication** with refresh tokens and httpOnly cookies
- **Route-based architecture**: `/routes` contains API endpoints organized by feature
- **Service layer**: `/services` contains business logic (AuthService, DHLService, CurrencyService)
- **Middleware**: Security, authentication, error handling, and rate limiting
- **Comprehensive logging** with Winston

### Enhanced Shop Frontend Features
- **Product Browsing**: Grid view with categories and search
- **Product Detail Pages**: 
  - High-resolution image galleries with thumbnails
  - Complete product specifications from database
  - Size and color variant selection
  - Quantity selectors and stock information
  - Related products suggestions
  - Breadcrumb navigation
- **Shopping Cart**: 
  - Persistent cart with localStorage
  - Add/remove/update quantities
  - Real-time total calculations
  - Slide-out cart sidebar
- **Navigation**: 
  - Multi-page SPA with JavaScript routing
  - Category filtering and search
  - Responsive mobile-friendly design

### Mobile App Architecture
- **React Native 0.73.2** with modern navigation patterns
- **Redux Toolkit** for state management with slices (auth, cart)
- **Multi-language support** with i18next (EN, PT, DE, FR, ES)
- **Payment integration** with Stripe React Native
- **Navigation**: React Navigation with stack and tab navigators

### Database Schema
Key relationships and enhanced features:
- **Products table**: Multi-language names/descriptions, full specifications
- **Product Images table**: Multiple images per product with display order
- **Product Variants table**: Size/color/storage variants with pricing
- **Users table**: Role-based access (customer, admin, supplier)  
- **Orders system**: Comprehensive status tracking and payment integration
- **Multi-currency support** (EUR, BRL, NAD) with live exchange rates
- **Shipping zones**: EU, Brazil, and Namibia support

### Key Integrations
- **Stripe** for payment processing with webhook support
- **DHL API** for shipping and tracking
- **Multi-currency** support (EUR, BRL, NAD) with live exchange rates
- **Email system** with SMTP configuration
- **Let's Encrypt** for automated SSL certificate management

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
- `docker-compose.production.yml` for production deployment
- Includes PostgreSQL, Redis, Mailhog, and nginx
- Database schema automatically loaded on container startup

### Testing Strategy
- Backend uses Jest with supertest for API testing
- Mobile app uses Jest with React Native testing library
- Frontend uses manual testing with browser dev tools
- Run `npm test` from root to test all projects

### Security Features
- **Rate limiting** (100 req/15min general, 5 req/15min auth)
- **Helmet.js** for security headers
- **Input validation** with Joi and express-validator
- **CORS configuration** for development and production
- **Password hashing** with bcryptjs
- **SQL injection protection** with parameterized queries
- **Content Security Policy** headers on all frontends
- **HTTPS-only** with HTTP Strict Transport Security

## Production Deployment

### Current Deployment Status
The system is **fully deployed and operational** on Hetzner Cloud:
- VPS IP: 91.99.27.249
- All domains configured with Let's Encrypt SSL
- Docker containers running with health checks
- Database populated with sample products and images

### Deployment Commands
- `scripts/deploy-to-vps.sh` - Full production deployment script
- `docker-compose -f docker-compose.production.yml up -d` - Start production services
- SSL certificates auto-renew via Let's Encrypt

### Production Monitoring
- Docker health checks for all services
- nginx access and error logs
- PostgreSQL slow query logging
- Application logs via Winston

## Common Development Tasks

### Adding New Products
1. Use admin panel at https://admin.jneoutlet.com
2. Or insert directly into PostgreSQL products table
3. Add product images to `product_images` table
4. Add variants to `product_variants` table if needed

### API Endpoint Development
1. Create route file in `backend/src/routes/`
2. Add route to `backend/src/app.js`
3. Implement business logic in `backend/src/services/` if needed
4. Add validation middleware
5. Update frontend API clients if needed

### Database Changes
1. Create migration file in `database/migrations/`
2. Update main schema in `database/schema.sql`
3. Run migration on production: `docker exec jneoutlet_postgres psql -U jneuser -d jneoutlet -f migration.sql`
4. Update seed data if necessary

### Frontend Updates
1. **Shop Frontend**: Edit `enhanced-shop-frontend.html` and deploy to VPS
2. **Admin Panel**: Update React components in `admin-panel/src/`
3. **Mobile App**: Standard React Native development workflow

### Multi-language Support
- Backend: All text content stored in JSONB fields with language keys
- Frontend: JavaScript object lookups for UI text
- Database: Product names/descriptions in EN/DE/PT
- API responses include all language variants

### Payment Testing
- Use Stripe test cards for payment testing
- Webhook endpoint: `/api/payments/webhook`
- Test in both mobile app and admin panel

### Troubleshooting
- **Shop not loading**: Check nginx status with `docker logs jneoutlet_nginx`
- **API errors**: Check backend logs with `docker logs jneoutlet_backend`
- **Database issues**: Connect via `docker exec -it jneoutlet_postgres psql -U jneuser -d jneoutlet`
- **SSL problems**: Verify Let's Encrypt certificates with `docker exec jneoutlet_nginx ls -la /etc/letsencrypt/live/`
- **Clear caches**: Restart all containers with `docker restart jneoutlet_backend jneoutlet_nginx`

## Production URLs and Access

### Public URLs (All with SSL)
- **Shop**: https://shop.jneoutlet.com
- **Admin**: https://admin.jneoutlet.com  
- **API**: https://api.jneoutlet.com
- **Supplier Portal**: https://api.jneoutlet.com/api/supplier-portal

### API Endpoints
- `GET /api/products` - List products with pagination
- `GET /api/products/:id` - Get single product with images/variants
- `POST /api/auth/login` - User authentication
- `GET /api/order-management/admin/analytics` - Admin analytics
- `POST /api/supplier-portal/products` - Supplier product management

### Database Access
- **Host**: 91.99.27.249:5432 (localhost only)
- **Database**: jneoutlet
- **User**: jneuser
- **Connection**: `docker exec -it jneoutlet_postgres psql -U jneuser -d jneoutlet`

The system is production-ready and fully functional with enterprise-grade security, performance, and user experience.