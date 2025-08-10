# Deployment Guide - Clothes Shipping E-commerce Platform

This guide provides comprehensive instructions for deploying the Clothes Shipping platform to production servers.

## 🚀 Production Deployment Overview

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │ Customer Shop   │    │   Admin Panel   │    │   Backend API   │
│  (App Stores)   │────│ shop.itsjn.com  │────│ admin.itsjn.com │────│ api.itsjn.com   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │                        │
                        ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                        │ Main Website    │    │Supplier Portal  │    │   PostgreSQL    │
                        │   itsjn.com     │    │suppliers.itsjn  │    │    Database     │
                        └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                                              │
                                               ┌─────────────────┐    ┌─────────────────┐
                                               │     Redis       │    │   File Storage  │
                                               │     Cache       │    │   /uploads      │
                                               └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ LTS or CentOS 8+
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 50GB+ SSD storage
- **Network**: Static IP address with ports 80, 443, 22 open

### Required Software
- **Node.js**: 18+ LTS
- **PostgreSQL**: 14+
- **Redis**: 6+
- **Nginx**: 1.18+
- **PM2**: Process manager
- **Certbot**: SSL certificates

## 🔧 Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential software-properties-common

# Create application user
sudo useradd -m -s /bin/bash clothesapp
sudo usermod -aG sudo clothesapp

# Switch to application user
sudo su - clothesapp
```

### 2. Install Node.js

```bash
# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Verify installation
node --version
npm --version
```

### 3. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE clothesapp;
CREATE USER clothesapp_user WITH ENCRYPTED PASSWORD 'SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE clothesapp TO clothesapp_user;
ALTER USER clothesapp_user CREATEDB;
\q
EOF
```

### 4. Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
```

### 5. Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Test Nginx
curl http://localhost
```

## 🌐 Domain Setup

### DNS Configuration
Configure your DNS records:
```
itsjn.com             A    YOUR_SERVER_IP
www.itsjn.com         A    YOUR_SERVER_IP
shop.itsjn.com        A    YOUR_SERVER_IP
api.itsjn.com         A    YOUR_SERVER_IP
admin.itsjn.com       A    YOUR_SERVER_IP
suppliers.itsjn.com   A    YOUR_SERVER_IP
```

### SSL Certificates

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificates
sudo certbot --nginx -d itsjn.com -d www.itsjn.com -d shop.itsjn.com -d api.itsjn.com -d admin.itsjn.com -d suppliers.itsjn.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 📂 Application Deployment

### 1. Clone Repository

```bash
# Clone to application directory
cd /home/clothesapp
git clone https://github.com/your-username/clothes-shipping.git
cd clothes-shipping

# Set permissions
sudo chown -R clothesapp:clothesapp /home/clothesapp/clothes-shipping
```

### 2. Backend Deployment

```bash
cd backend

# Install dependencies
npm ci --production

# Create production environment file
cp .env.example .env

# Edit production environment variables
nano .env
```

#### Production Environment Variables

```env
# Production settings
NODE_ENV=production
PORT=3001

# Database (use secure password)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clothesapp
DB_USER=clothesapp_user
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD

# JWT Secrets (generate secure keys)
JWT_SECRET=your-256-bit-production-jwt-secret
JWT_REFRESH_SECRET=your-256-bit-production-refresh-secret

# Stripe (production keys)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET

# DHL (production)
DHL_API_KEY=YOUR_DHL_LIVE_API_KEY
DHL_API_SECRET=YOUR_DHL_LIVE_API_SECRET
DHL_ACCOUNT_NUMBER=YOUR_DHL_ACCOUNT_NUMBER
DHL_BASE_URL=https://api.dhl.com

# Email (production SMTP)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@itsjn.com
SMTP_PASSWORD=YOUR_EMAIL_PASSWORD
SMTP_SECURE=true

# Redis
REDIS_URL=redis://localhost:6379

# Security
ENCRYPTION_SECRET=your-256-bit-encryption-secret
ENCRYPTION_SALT=your-encryption-salt
HMAC_SECRET=your-hmac-secret

# URLs
FRONTEND_URL=https://admin.itsjn.com
ADMIN_URL=https://admin.itsjn.com
MOBILE_APP_URL=https://app.itsjn.com

# API Keys
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

# File uploads
UPLOAD_DIR=/home/clothesapp/uploads
MAX_FILE_SIZE=10MB

# CORS
CORS_ORIGIN=https://admin.itsjn.com,https://app.itsjn.com
```

```bash
# Run database migrations
npm run migrate

# Start with PM2
pm2 start src/app.js --name "clothes-api" --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### 3. Main Website Deployment (Landing Page)

```bash
# Create main website directory
sudo mkdir -p /var/www/itsjn.com

# Copy landing page files
sudo cp -r landing-page/* /var/www/itsjn.com/
sudo chown -R www-data:www-data /var/www/itsjn.com
```

### 4. Customer Shop Deployment

```bash
cd customer-website

# Install dependencies
npm ci

# Create production build environment
echo "REACT_APP_API_URL=https://api.itsjn.com/api" > .env.production
echo "REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY" >> .env.production

# Build for production
npm run build

# Copy build files to web root
sudo mkdir -p /var/www/shop.itsjn.com
sudo cp -r build/* /var/www/shop.itsjn.com/
sudo chown -R www-data:www-data /var/www/shop.itsjn.com
```

### 5. Admin Panel Deployment

```bash
cd ../admin-panel

# Install dependencies
npm ci

# Create production build environment
echo "REACT_APP_API_URL=https://api.itsjn.com/api" > .env.production
echo "REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY" >> .env.production

# Build for production
npm run build

# Copy build files to web root
sudo mkdir -p /var/www/admin.itsjn.com
sudo cp -r build/* /var/www/admin.itsjn.com/
sudo chown -R www-data:www-data /var/www/admin.itsjn.com
```

### 6. Supplier Portal Deployment

```bash
cd ../supplier-portal

# Install dependencies
npm ci

# Create production build environment
echo "REACT_APP_API_URL=https://api.itsjn.com/api" > .env.production

# Build for production
npm run build

# Copy build files to web root
sudo mkdir -p /var/www/suppliers.itsjn.com
sudo cp -r build/* /var/www/suppliers.itsjn.com/
sudo chown -R www-data:www-data /var/www/suppliers.itsjn.com
```

### 7. Nginx Configuration

Create Nginx configuration files:

#### API Configuration
```bash
sudo nano /etc/nginx/sites-available/api.itsjn.com
```

```nginx
server {
    listen 80;
    server_name api.itsjn.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.itsjn.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.itsjn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.itsjn.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy to Node.js API
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /uploads {
        alias /home/clothesapp/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Admin Panel Configuration
```bash
sudo nano /etc/nginx/sites-available/admin.itsjn.com
```

```nginx
server {
    listen 80;
    server_name admin.itsjn.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.itsjn.com;

    root /var/www/admin.itsjn.com;
    index index.html index.htm;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/admin.itsjn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.itsjn.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

#### Customer Shop Configuration
```bash
sudo nano /etc/nginx/sites-available/shop.itsjn.com
```

```nginx
server {
    listen 80;
    server_name shop.itsjn.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shop.itsjn.com;

    root /var/www/shop.itsjn.com;
    index index.html index.htm;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/shop.itsjn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shop.itsjn.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker caching
    location /service-worker.js {
        add_header Cache-Control "no-cache";
        expires off;
    }

    # Sitemap and robots
    location ~* \.(xml|txt)$ {
        expires 1d;
        add_header Cache-Control "public";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Additional compression for modern browsers
    location ~* \.(js|css)$ {
        gzip_static on;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Main Website Configuration (Landing Page)
```bash
sudo nano /etc/nginx/sites-available/itsjn.com
```

```nginx
server {
    listen 80;
    server_name itsjn.com www.itsjn.com;
    return 301 https://itsjn.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.itsjn.com;
    return 301 https://itsjn.com$request_uri;
    
    ssl_certificate /etc/letsencrypt/live/itsjn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/itsjn.com/privkey.pem;
}

server {
    listen 443 ssl http2;
    server_name itsjn.com;

    root /var/www/itsjn.com;
    index index.html index.htm;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/itsjn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/itsjn.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Redirect shop traffic to shop subdomain
    location /shop {
        return 301 https://shop.itsjn.com$request_uri;
    }
    
    # Redirect old shop paths
    location ~ ^/(products|cart|checkout|categories) {
        return 301 https://shop.itsjn.com$request_uri;
    }

    # Main website content
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

#### Supplier Portal Configuration
```bash
sudo nano /etc/nginx/sites-available/suppliers.itsjn.com
```

```nginx
server {
    listen 80;
    server_name suppliers.itsjn.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name suppliers.itsjn.com;

    root /var/www/suppliers.itsjn.com;
    index index.html index.htm;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/suppliers.itsjn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/suppliers.itsjn.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### 8. Enable Sites and Restart Services

```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/api.itsjn.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/itsjn.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/shop.itsjn.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.itsjn.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/suppliers.itsjn.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Restart PM2
pm2 restart all
```

## 📱 Mobile App Deployment

### Android Play Store

1. **Prepare Release Build:**
```bash
cd mobile

# Install dependencies
npm install

# Update API endpoint for production
# Edit src/services/apiClient.js to use https://api.itsjn.com/api

# Generate release APK
cd android
./gradlew assembleRelease

# Signed APK will be in android/app/build/outputs/apk/release/
```

2. **Google Play Console:**
- Create app in Google Play Console
- Upload signed APK
- Fill in app details, screenshots, descriptions
- Set pricing and distribution
- Submit for review

### iOS App Store

1. **Prepare Release Build:**
```bash
cd mobile

# Update iOS bundle identifier and provisioning profiles
cd ios
pod install

# Archive in Xcode:
# - Open ios/ClothesShippingApp.xcworkspace
# - Select "Generic iOS Device"
# - Product > Archive
# - Upload to App Store Connect
```

2. **App Store Connect:**
- Create app in App Store Connect
- Upload build via Xcode or Application Loader
- Fill in app metadata, screenshots
- Submit for App Store review

## 🔒 Security Hardening

### Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### SSL Security
```bash
# Generate stronger DH parameters
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048

# Add to Nginx SSL configuration
echo "ssl_dhparam /etc/ssl/certs/dhparam.pem;" | sudo tee -a /etc/nginx/snippets/ssl-params.conf
```

### Database Security
```bash
# Secure PostgreSQL installation
sudo -u postgres psql << EOF
-- Remove default postgres user remote access
UPDATE pg_hba.conf SET method='md5' WHERE type='host';

-- Set strong passwords
ALTER USER postgres PASSWORD 'VERY_SECURE_POSTGRES_PASSWORD';
\q
EOF

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 📊 Monitoring & Maintenance

### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs clothes-api

# Restart app
pm2 restart clothes-api
```

### Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/clothesapp

/home/clothesapp/clothes-shipping/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 clothesapp clothesapp
    postrotate
        pm2 restart clothes-api > /dev/null 2>&1 || true
    endscript
}
```

### Database Backup
```bash
# Create backup script
nano /home/clothesapp/backup-db.sh

#!/bin/bash
BACKUP_DIR="/home/clothesapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump clothesapp > "$BACKUP_DIR/clothesapp_$DATE.sql"

# Remove backups older than 30 days
find $BACKUP_DIR -name "clothesapp_*.sql" -mtime +30 -delete

# Make script executable
chmod +x /home/clothesapp/backup-db.sh

# Add to crontab (run daily at 2 AM)
echo "0 2 * * * /home/clothesapp/backup-db.sh" | crontab -
```

## 🔄 Updates & Maintenance

### Application Updates
```bash
# Create update script
nano /home/clothesapp/update-app.sh

#!/bin/bash
cd /home/clothesapp/clothes-shipping

# Pull latest changes
git pull origin main

# Backend updates
cd backend
npm ci --production
npm run migrate
pm2 restart clothes-api

# Admin panel updates
cd ../admin-panel
npm ci
npm run build
sudo cp -r build/* /var/www/admin.itsjn.com/
sudo chown -R www-data:www-data /var/www/admin.itsjn.com

echo "Update completed successfully"

# Make script executable
chmod +x /home/clothesapp/update-app.sh
```

### Monitoring Script
```bash
# Create monitoring script
nano /home/clothesapp/monitor.sh

#!/bin/bash
# Check if API is responding
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "API is down, restarting..."
    pm2 restart clothes-api
    echo "API restarted at $(date)" >> /home/clothesapp/restart.log
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "Disk usage is above 90%: ${DISK_USAGE}%"
fi

# Make script executable and add to crontab
chmod +x /home/clothesapp/monitor.sh
echo "*/5 * * * * /home/clothesapp/monitor.sh" | crontab -
```

## 🆘 Troubleshooting

### Common Issues

**API not responding:**
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs clothes-api

# Restart API
pm2 restart clothes-api
```

**Database connection issues:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**SSL certificate issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

**High memory usage:**
```bash
# Check memory usage
free -h

# Check PM2 processes
pm2 status

# Restart if needed
pm2 restart all
```

## 📞 Support

- **Documentation**: Check project README and source code comments
- **Logs**: Review application logs in `/home/clothesapp/clothes-shipping/backend/logs/`
- **Monitoring**: Use `pm2 monit` for real-time monitoring
- **Database**: Use `psql` for database troubleshooting

## 🔐 Security Checklist

- [ ] SSL certificates installed and auto-renewal configured
- [ ] Firewall configured (UFW)
- [ ] Strong passwords for all accounts
- [ ] Database access restricted
- [ ] Regular backups scheduled
- [ ] Log rotation configured
- [ ] Security headers in Nginx
- [ ] Rate limiting enabled
- [ ] Environment variables secured
- [ ] Regular security updates scheduled

## 📈 Performance Optimization

- [ ] Gzip compression enabled
- [ ] Static file caching configured
- [ ] Database indexes optimized
- [ ] Redis caching implemented
- [ ] PM2 cluster mode for scaling
- [ ] CDN for static assets (optional)
- [ ] Database connection pooling
- [ ] API response caching

Your Clothes Shipping platform is now ready for production! 🚀