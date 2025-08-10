@echo off
REM Clothes Shipping Development Setup Script for Windows
setlocal EnableDelayedExpansion

echo 🚀 Setting up Clothes Shipping Development Environment

REM Color codes (limited support in cmd)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%📋 Checking prerequisites...%NC%

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ Node.js not found%NC%
    echo Please install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
echo %GREEN%✅ Node.js !NODE_VERSION! found%NC%

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ npm not found%NC%
    pause
    exit /b 1
)

for /f %%i in ('npm --version') do set NPM_VERSION=%%i
echo %GREEN%✅ npm !NPM_VERSION! found%NC%

REM Check PostgreSQL
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️ PostgreSQL not found in PATH%NC%
    echo Please ensure PostgreSQL is installed and accessible
    echo Download from: https://www.postgresql.org/download/
) else (
    echo %GREEN%✅ PostgreSQL found%NC%
)

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️ Docker not found - manual database setup required%NC%
) else (
    echo %GREEN%✅ Docker found%NC%
)

REM Setup backend
echo %BLUE%📋 Setting up backend...%NC%
cd backend

if not exist ".env" (
    echo %BLUE%📋 Creating .env file from template...%NC%
    copy .env.example .env
    echo %GREEN%✅ Created .env file - Please edit with your credentials%NC%
) else (
    echo %YELLOW%⚠️ .env file already exists%NC%
)

echo %BLUE%📋 Installing backend dependencies...%NC%
call npm install
if %errorlevel% neq 0 (
    echo %RED%❌ Failed to install backend dependencies%NC%
    pause
    exit /b 1
)
echo %GREEN%✅ Backend dependencies installed%NC%

REM Create logs directory
if not exist "logs" mkdir logs
echo %GREEN%✅ Created logs directory%NC%

cd ..

REM Setup mobile app
echo %BLUE%📋 Setting up mobile app...%NC%
cd mobile

echo %BLUE%📋 Installing mobile app dependencies...%NC%
call npm install
if %errorlevel% neq 0 (
    echo %RED%❌ Failed to install mobile dependencies%NC%
    pause
    exit /b 1
)
echo %GREEN%✅ Mobile app dependencies installed%NC%

cd ..

REM Setup admin panel
if exist "admin-panel" (
    echo %BLUE%📋 Setting up admin panel...%NC%
    cd admin-panel
    
    echo %BLUE%📋 Installing admin panel dependencies...%NC%
    call npm install
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install admin dependencies%NC%
        pause
        exit /b 1
    )
    echo %GREEN%✅ Admin panel dependencies installed%NC%
    
    cd ..
)

REM Database setup with Docker
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo %BLUE%📋 Starting PostgreSQL and Redis with Docker...%NC%
    docker-compose up -d postgres redis
    
    echo Waiting for PostgreSQL to start...
    timeout /t 10 /nobreak >nul
    
    echo %GREEN%✅ Database containers started%NC%
) else (
    echo %YELLOW%⚠️ Docker not available - please set up PostgreSQL manually%NC%
    echo 1. Create database: createdb clothesapp
    echo 2. Create user: createuser clothesapp_user
    echo 3. Run schema: psql clothesapp ^< database\schema.sql
)

REM Final instructions
echo.
echo %GREEN%Development setup complete! 🎉%NC%
echo.
echo %GREEN%Next steps:%NC%
echo 1. Edit backend\.env with your API credentials:
echo    - Stripe keys (get from https://stripe.com)
echo    - DHL API keys (get from DHL developer portal)
echo    - Email SMTP settings
echo.
echo 2. Start the development servers:
echo    Backend:    cd backend ^&^& npm run dev
echo    Mobile:     cd mobile ^&^& npm start
echo    Admin:      cd admin-panel ^&^& npm start
echo.
echo 3. Mobile app development:
echo    Android:    npx react-native run-android
echo    iOS:        Not supported on Windows
echo.
echo %BLUE%Useful URLs:%NC%
echo    Backend API:     http://localhost:3001
echo    Admin Panel:     http://localhost:3002
echo    API Health:      http://localhost:3001/health
echo    Mailhog (email): http://localhost:8025
echo.
echo %YELLOW%Important:%NC%
echo    - Update .env files with real API credentials before testing payments
echo    - Use test/sandbox API keys for development
echo    - Database is accessible at localhost:5432
echo    - Redis is accessible at localhost:6379
echo.
echo %GREEN%Happy coding! 🚀%NC%
pause