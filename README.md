# JNE Outlet - Complete E-commerce Platform

A comprehensive e-commerce platform for selling premium fashion from China to worldwide markets. Features mobile apps, web shopping, admin panel, and supplier portal with complete production deployment.

## 🌐 Live Platform
- **Main Website**: [jneoutlet.com](https://jneoutlet.com) - Company landing page
- **Shop**: [shop.jneoutlet.com](https://shop.jneoutlet.com) - Customer shopping experience
- **Admin**: [admin.jneoutlet.com](https://admin.jneoutlet.com) - Management dashboard
- **Suppliers**: [suppliers.jneoutlet.com](https://suppliers.jneoutlet.com) - Supplier portal
- **API**: [api.jneoutlet.com](https://api.jneoutlet.com) - REST API backend

## 🚀 Features

- **Mobile Apps**: React Native iOS/Android apps with Temu/Shein-like interface
- **Customer Website**: Full e-commerce web experience 
- **Multi-language**: English, Portuguese, German, French, Spanish
- **Multi-currency**: EUR, BRL, NAD with live exchange rates
- **Payment Processing**: Stripe integration with webhooks
- **Shipping**: DHL API integration with real-time tracking
- **Admin Panel**: Complete inventory and order management
- **Supplier Portal**: Supplier onboarding and management system

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with UUID keys
- **Redis** for caching and sessions
- **Stripe** for payment processing
- **DHL API** for shipping and tracking
- **JWT** authentication with refresh tokens

### Frontend Applications
- **Customer Website**: React with Redux Toolkit
- **Mobile Apps**: React Native 0.73.2 with Redux
- **Admin Panel**: React with Material-UI
- **Supplier Portal**: React with modern hooks

## 📋 Prerequisites

- Node.js 18+ LTS
- PostgreSQL 14+
- Redis 6+
- React Native development environment
- Stripe account
- DHL API credentials

## 🏃‍♂️ Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/joenij/clothes-shipping.git
cd clothes-shipping
```

### 2. Install All Dependencies
```bash
npm install
npm run install:all
```

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm run migrate
npm run seed
```

### 4. Start All Services
```bash
# From root directory - starts all applications
npm start
```

This will start:
- Backend API server (localhost:3001)
- Customer website (localhost:3000)
- Mobile app Metro bundler (localhost:8081)
- Admin panel (localhost:3002)

## ⚙️ Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clothesapp
DB_USER=clothesapp_user
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# DHL
DHL_API_KEY=your_dhl_key
DHL_API_SECRET=your_dhl_secret
DHL_ACCOUNT_NUMBER=your_account

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

## 📱 Mobile App Development

### Running on Device
```bash
cd mobile
npm run android --device  # Android
npm run ios --device      # iOS (macOS only)
```

### Building for Production
```bash
cd mobile
npm run android:release   # Android APK
npm run ios:release       # iOS IPA
```

## 🌍 Domain Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │ Customer Shop   │    │   Admin Panel   │    │   Backend API   │
│  (App Stores)   │────│shop.jneoutlet.com────│admin.jneoutlet.com───│api.jneoutlet.com│
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │                        │
                        ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                        │ Main Website    │    │Supplier Portal  │    │   PostgreSQL    │
                        │ jneoutlet.com   │    │suppliers.jneoutlet│   │    Database     │
                        └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Production Deployment

Complete deployment guide available in [DEPLOYMENT.md](DEPLOYMENT.md) including:
- Ubuntu/CentOS server setup
- Docker configuration
- Nginx configurations for all domains
- SSL certificates with Let's Encrypt
- PM2 process management
- Database migrations
- Security hardening

## 🔧 Development Commands

### Root Directory
```bash
npm start              # Start all applications
npm test               # Run all tests
npm run lint           # Lint all projects
npm run build          # Build for production
npm run docker:up      # Start with Docker
```

### Individual Applications
```bash
npm run start:backend     # API server only
npm run start:customer    # Customer website only
npm run start:mobile      # Mobile app only
npm run start:admin       # Admin panel only
```

## 🗄️ Database Schema

Key tables:
- `users` - Customer accounts with multi-language preferences
- `products` - Product catalog with variants and localization
- `orders` - Order management with payment and shipping status
- `suppliers` - Supplier information and ratings
- `categories` - Multi-language product categories
- `shipping_zones` - Regional shipping rates and policies

## 🔐 Security Features

- **JWT Authentication** with httpOnly refresh tokens
- **Rate Limiting** (100 req/15min general, 5 req/15min auth)
- **Input Validation** with express-validator
- **SQL Injection Protection** with parameterized queries
- **XSS Prevention** with helmet.js
- **HTTPS Enforcement** in production
- **PCI DSS Compliance** through Stripe

## 🚚 Shipping Integration

### DHL Features
- Shipment creation from China
- Real-time tracking
- Address validation
- Customs declaration
- Multiple service types
- Rate calculation

### Shipping Zones
- **EU**: 7-14 days, free shipping over €50
- **Brazil**: 14-28 days, free shipping over €100
- **Namibia**: 21-35 days, free shipping over €150

## 💳 Payment Integration

### Supported Methods
- **Credit/Debit Cards** (Visa, Mastercard, Amex)
- **Google Pay** (Android)
- **PayPal** (Web integration)
- **Saved Payment Methods** for returning customers

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
POST /api/auth/refresh     # Refresh token
POST /api/auth/logout      # Logout
GET  /api/auth/me         # Current user
```

### Product Endpoints
```
GET  /api/products         # Product list with filters
GET  /api/products/:id     # Product details
POST /api/products         # Create product (admin)
PUT  /api/products/:id     # Update product (admin)
```

### Order Endpoints
```
GET  /api/orders           # User orders
POST /api/orders           # Create order
GET  /api/orders/:id       # Order details
PUT  /api/orders/:id       # Update order status
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Email: support@jneoutlet.com
- Issues: [GitHub Issues](https://github.com/joenij/clothes-shipping/issues)

## 🗺️ Roadmap

- [ ] AI-powered product recommendations
- [ ] Social media integration
- [ ] Loyalty program
- [ ] Wholesale portal
- [ ] Advanced analytics
- [ ] PWA support
- [ ] Additional payment methods
- [ ] More shipping carriers
