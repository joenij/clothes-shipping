#!/bin/bash

# Clothes Shipping Development Setup Script
set -e

echo "🚀 Setting up Clothes Shipping Development Environment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running on Windows (Git Bash, WSL, etc.)
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    print_warning "Detected Windows environment"
    IS_WINDOWS=true
else
    IS_WINDOWS=false
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_step "Checking prerequisites..."

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE_MAJOR=18
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]; then
        print_success "Node.js $NODE_VERSION (✓)"
    else
        print_error "Node.js version $REQUIRED_NODE_MAJOR+ required. Found: $NODE_VERSION"
        echo "Please install Node.js LTS from https://nodejs.org/"
        exit 1
    fi
else
    print_error "Node.js not found"
    echo "Please install Node.js LTS from https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION (✓)"
else
    print_error "npm not found"
    exit 1
fi

# Check PostgreSQL
if command_exists psql; then
    POSTGRES_VERSION=$(psql --version | awk '{print $3}')
    print_success "PostgreSQL $POSTGRES_VERSION (✓)"
else
    print_warning "PostgreSQL not found in PATH"
    echo "Please ensure PostgreSQL is installed and accessible"
    echo "Download from: https://www.postgresql.org/download/"
fi

# Check Redis (optional for development)
if command_exists redis-server; then
    print_success "Redis found (✓)"
elif command_exists redis-cli; then
    print_success "Redis CLI found (✓)"
else
    print_warning "Redis not found - using Docker container instead"
fi

# Check Docker (optional)
if command_exists docker; then
    print_success "Docker found (✓)"
else
    print_warning "Docker not found - manual database setup required"
fi

# Check React Native CLI
if command_exists react-native; then
    RN_VERSION=$(react-native --version | grep "react-native-cli" | awk '{print $2}' || echo "found")
    print_success "React Native CLI $RN_VERSION (✓)"
else
    print_warning "React Native CLI not found"
    echo "Install with: npm install -g react-native-cli"
fi

# Setup backend
print_step "Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    print_step "Creating .env file from template..."
    cp .env.example .env
    print_success "Created .env file - Please edit with your credentials"
else
    print_warning ".env file already exists"
fi

print_step "Installing backend dependencies..."
npm install
print_success "Backend dependencies installed"

# Create logs directory
mkdir -p logs
print_success "Created logs directory"

cd ..

# Setup mobile app
print_step "Setting up mobile app..."
cd mobile

print_step "Installing mobile app dependencies..."
npm install
print_success "Mobile app dependencies installed"

# iOS specific setup (only on macOS)
if [[ "$OSTYPE" == "darwin"* ]] && [ -d "ios" ]; then
    print_step "Setting up iOS dependencies..."
    if command_exists pod; then
        cd ios && pod install && cd ..
        print_success "iOS CocoaPods installed"
    else
        print_warning "CocoaPods not found - iOS setup skipped"
        echo "Install with: sudo gem install cocoapods"
    fi
fi

cd ..

# Setup admin panel
if [ -d "admin-panel" ]; then
    print_step "Setting up admin panel..."
    cd admin-panel
    
    print_step "Installing admin panel dependencies..."
    npm install
    print_success "Admin panel dependencies installed"
    
    cd ..
fi

# Database setup
print_step "Setting up database..."

if command_exists docker && docker info > /dev/null 2>&1; then
    print_step "Starting PostgreSQL and Redis with Docker..."
    docker-compose up -d postgres redis
    
    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL to start..."
    sleep 10
    
    # Check if database is accessible
    if docker-compose exec postgres pg_isready -U clothesapp_user > /dev/null 2>&1; then
        print_success "Database is ready"
    else
        print_warning "Database may not be fully ready yet"
    fi
else
    print_warning "Docker not available - please set up PostgreSQL manually"
    echo "1. Create database: createdb clothesapp"
    echo "2. Create user: createuser clothesapp_user"
    echo "3. Run schema: psql clothesapp < database/schema.sql"
fi

# Create sample environment file with secure defaults
print_step "Creating development configuration..."

# Generate random JWT secrets if not exists
if [ ! -f "backend/.env" ] || ! grep -q "JWT_SECRET=your-super-secure" "backend/.env"; then
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n' 2>/dev/null || date +%s | sha256sum | base64 | head -c 64)
    JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n' 2>/dev/null || date +%s | sha256sum | base64 | head -c 64)
    
    print_step "Generated secure JWT secrets"
fi

# Final instructions
print_step "Development setup complete! 🎉"
echo
echo -e "${GREEN}Next steps:${NC}"
echo "1. Edit backend/.env with your API credentials:"
echo "   - Stripe keys (get from https://stripe.com)"
echo "   - DHL API keys (get from DHL developer portal)"
echo "   - Email SMTP settings"
echo
echo "2. Start the development servers:"
echo "   Backend:    cd backend && npm run dev"
echo "   Mobile:     cd mobile && npm start"
echo "   Admin:      cd admin-panel && npm start"
echo
echo "3. Mobile app development:"
echo "   Android:    npx react-native run-android"
echo "   iOS:        npx react-native run-ios (macOS only)"
echo
echo -e "${BLUE}Useful URLs:${NC}"
echo "   Backend API:     http://localhost:3001"
echo "   Admin Panel:     http://localhost:3002"
echo "   API Health:      http://localhost:3001/health"
echo "   Mailhog (email): http://localhost:8025"
echo
echo -e "${YELLOW}Important:${NC}"
echo "   - Update .env files with real API credentials before testing payments"
echo "   - Use test/sandbox API keys for development"
echo "   - Database is accessible at localhost:5432"
echo "   - Redis is accessible at localhost:6379"
echo
print_success "Happy coding! 🚀"