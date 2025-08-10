# Clothes Shipping E-commerce Platform

A complete e-commerce platform for selling clothes from China to EU, Brazil, and Namibia. Built with React Native mobile app, Node.js backend, and PostgreSQL database.

## 🚀 Features

- **Mobile App**: React Native iOS/Android app with Temu/Shein-like interface
- **Multi-language**: English, Portuguese, German, French, Spanish
- **Multi-currency**: EUR, BRL, NAD with live exchange rates
- **Payment Processing**: Stripe, PayPal, Google Pay integration
- **Shipping**: DHL integration with real-time tracking
- **Admin Panel**: React-based inventory and order management
- **Supplier Portal**: Onboarding and management system

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with UUID keys
- **Redis** for caching and sessions
- **Stripe** for payment processing
- **DHL API** for shipping and tracking
- **JWT** authentication with refresh tokens

### Mobile App
- **React Native 0.73.2**
- **Redux Toolkit** for state management
- **React Navigation** for routing
- **i18next** for internationalization
- **Stripe React Native** for payments
- **Push notifications** with Firebase

### Admin Panel
- **React** with modern hooks
- **Material-UI** components
- **Chart.js** for analytics
- **Real-time updates** with WebSocket

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
git clone <repository-url>
cd ClothesShipping
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run migrate
npm run seed
npm run dev
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb clothesapp

# Run migrations
psql clothesapp < database/schema.sql
```

### 4. Mobile App Setup
```bash
cd mobile
npm install
npx react-native run-android
# or
npx react-native run-ios
```

### 5. Admin Panel Setup
```bash
cd admin-panel
npm install
npm start
```

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
# Android
npx react-native run-android --device

# iOS (macOS only)
npx react-native run-ios --device
```

### Building for Production
```bash
# Android
cd android && ./gradlew assembleRelease

# iOS
npx react-native run-ios --configuration Release
```

## 🗄️ Database Schema

Key tables:
- `users` - Customer accounts with multi-language preferences
- `products` - Product catalog with variants and localization
- `orders` - Order management with payment and shipping status
- `suppliers` - Chinese supplier information and ratings
- `categories` - Multi-language product categories
- `shipping_zones` - Regional shipping rates and policies

## 🔐 Security Features

- **JWT Authentication** with httpOnly refresh tokens
- **Rate Limiting** (100 req/15min general, 5 req/15min auth)
- **Input Validation** with express-validator
- **SQL Injection Protection** with parameterized queries
- **XSS Prevention** with helmet.js
- **HTTPS Enforcement** in production
- **Password Hashing** with bcrypt (12 rounds)
- **PCI DSS Compliance** through Stripe

## 🚚 Shipping Integration

### DHL Features
- Shipment creation from China
- Real-time tracking
- Address validation
- Customs declaration
- Multiple service types (Express, Standard, Economy)
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

### Security
- **3D Secure** support
- **Webhook verification** for payment events
- **PCI DSS compliance** through Stripe
- **Fraud detection** built-in

## 🌍 Internationalization

### Languages
- English (default)
- Portuguese (Brazil)
- German (Germany)
- French (France)
- Spanish (Spain)

### Currencies
- EUR (European Union)
- BRL (Brazil)
- NAD (Namibia)

## 📊 Admin Features

- **Dashboard** with sales analytics
- **Product Management** with bulk operations
- **Order Processing** with status tracking
- **Inventory Management** with alerts
- **Supplier Management** with performance metrics
- **Customer Support** with chat integration
- **Financial Reports** with export options

## 🔧 Development Commands

### Backend
```bash
npm run dev          # Development server
npm run test         # Run tests
npm run lint         # ESLint
npm run migrate      # Database migrations
npm run seed         # Sample data
```

### Mobile App
```bash
npm start           # Metro bundler
npm run android     # Android development
npm run ios         # iOS development (macOS only)
npm test            # Run tests
npm run lint        # ESLint
```

## 🚀 Deployment

### Backend Deployment
1. Set NODE_ENV=production
2. Update database credentials
3. Configure Redis connection
4. Set up SSL certificates
5. Configure nginx reverse proxy
6. Start with PM2

### Mobile App Deployment
1. Update API endpoints
2. Configure app signing
3. Build release APK/IPA
4. Submit to app stores
5. Configure push notifications

## 🐛 Troubleshooting

### Common Issues
- **Database connection**: Check PostgreSQL service and credentials
- **API errors**: Verify environment variables and API keys
- **React Native build**: Clear cache with `npx react-native start --reset-cache`
- **iOS build**: Run `cd ios && pod install`

### Logging
- Backend logs: `logs/combined.log` and `logs/error.log`
- Mobile app: React Native debugger or Flipper
- Database: PostgreSQL logs

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

### Payment Endpoints
```
POST /api/payments/create-intent    # Create payment intent
POST /api/payments/confirm         # Confirm payment
GET  /api/payments/payment-methods # Saved payment methods
POST /api/payments/webhook         # Stripe webhook
```

### Shipping Endpoints
```
GET  /api/shipping/zones           # Shipping zones
POST /api/shipping/calculate       # Calculate shipping
GET  /api/shipping/track/:number   # Track shipment
POST /api/shipping/create-shipment # Create shipment (admin)
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

- Email: support@itsjn.com
- Documentation: [docs.itsjn.com](https://docs.itsjn.com)
- Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🗺️ Roadmap

- [ ] AI-powered product recommendations
- [ ] Social media integration
- [ ] Loyalty program
- [ ] Wholesale portal
- [ ] Advanced analytics
- [ ] Mobile web PWA
- [ ] Additional payment methods
- [ ] More shipping carriers