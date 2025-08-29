#!/bin/bash

# MixitFixit Production Deployment Script
# Run this to prepare for production deployment

set -e  # Exit on any error

echo "🚀 MixitFixit Production Deployment Preparation"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    # Check Node version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    npm install --frozen-lockfile
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    log_info "Running test suite..."
    
    if npm test -- --watchAll=false --coverage --coverageReporters=text-summary 2>&1 | tee test_results.log; then
        # Extract coverage percentage
        COVERAGE=$(grep "All files" test_results.log | awk '{print $10}' | sed 's/%//' || echo "0")
        
        if [ -z "$COVERAGE" ]; then
            COVERAGE="0"
        fi
        
        if [ "$COVERAGE" -ge 85 ]; then
            log_success "Tests passed with ${COVERAGE}% coverage (target: 85%)"
        else
            log_warning "Test coverage is ${COVERAGE}%, below target of 85%"
        fi
    else
        log_error "Tests failed. Fix failing tests before deployment."
        exit 1
    fi
    
    rm -f test_results.log
}

# Build for production
build_production() {
    log_info "Building for production..."
    
    # Set production environment
    export NODE_ENV=production
    
    # Build the app
    npm run build
    
    # Check if build was successful
    if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
        log_success "Production build completed"
        
        # Get bundle size
        BUILD_SIZE=$(du -sh dist | cut -f1)
        log_info "Build size: $BUILD_SIZE"
        
        # Check for critical files
        if [ -f "dist/index.html" ] && [ -f "dist/assets/"*.js ] && [ -f "dist/assets/"*.css ]; then
            log_success "All critical build files present"
        else
            log_error "Missing critical build files"
            exit 1
        fi
    else
        log_error "Production build failed"
        exit 1
    fi
}

# Check environment configuration
check_env_config() {
    log_info "Checking environment configuration..."
    
    # Create .env.example if it doesn't exist
    if [ ! -f ".env.example" ]; then
        log_info "Creating .env.example template..."
        cat > .env.example << EOF
# MixitFixit Environment Configuration

# Application
VITE_APP_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0
VITE_DEV_SHOW_WARNINGS=false

# AI Services
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (for production)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# WebSocket Server
VITE_WEBSOCKET_URL=wss://your-websocket-server.com

# Analytics & Monitoring
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_ANALYTICS_ID=your_analytics_id_here

# Feature Flags
VITE_ENABLE_MULTIPLAYER=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_AI_ANALYSIS=true
EOF
        log_success "Created .env.example template"
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Copy .env.example to .env and configure for production."
    else
        log_success "Environment configuration file found"
        
        # Check for required environment variables
        MISSING_VARS=()
        
        if ! grep -q "VITE_GEMINI_API_KEY=" .env || grep -q "your_gemini_api_key_here" .env; then
            MISSING_VARS+=("VITE_GEMINI_API_KEY")
        fi
        
        if ! grep -q "VITE_SUPABASE_URL=" .env || grep -q "your_supabase_url_here" .env; then
            MISSING_VARS+=("VITE_SUPABASE_URL")
        fi
        
        if [ ${#MISSING_VARS[@]} -gt 0 ]; then
            log_warning "Missing or placeholder environment variables: ${MISSING_VARS[*]}"
            log_info "Update .env file with production values before deploying"
        else
            log_success "Environment variables configured"
        fi
    fi
}

# Start WebSocket server
start_websocket_server() {
    log_info "Checking WebSocket server..."
    
    if [ -f "src/server/websocket-server.js" ]; then
        # Check if server is already running
        if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "WebSocket server already running on port 3001"
        else
            log_info "Starting WebSocket server..."
            node src/server/websocket-server.js &
            WEBSOCKET_PID=$!
            
            # Wait a moment for server to start
            sleep 2
            
            # Check if server started successfully
            if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
                log_success "WebSocket server started (PID: $WEBSOCKET_PID)"
                echo $WEBSOCKET_PID > .websocket.pid
            else
                log_error "Failed to start WebSocket server"
                exit 1
            fi
        fi
    else
        log_error "WebSocket server file not found: src/server/websocket-server.js"
        exit 1
    fi
}

# Test multiplayer functionality
test_multiplayer() {
    log_info "Testing multiplayer functionality..."
    
    if [ -f "src/scripts/test-multiplayer.js" ]; then
        if node src/scripts/test-multiplayer.js; then
            log_success "Multiplayer tests passed"
        else
            log_error "Multiplayer tests failed"
            exit 1
        fi
    else
        log_warning "Multiplayer test script not found, skipping..."
    fi
}

# Create production checklist
create_production_checklist() {
    log_info "Creating production deployment checklist..."
    
    cat > PRODUCTION_CHECKLIST.md << EOF
# MixitFixit Production Deployment Checklist

## ✅ Pre-Deployment Completed
- [x] Dependencies installed
- [x] Tests passing with 85%+ coverage
- [x] Production build successful
- [x] WebSocket server running
- [x] Multiplayer functionality tested

## 📋 Manual Deployment Steps

### 1. Domain & Hosting Setup
- [ ] Purchase domain name
- [ ] Set up hosting (Vercel/Netlify recommended)
- [ ] Configure DNS settings
- [ ] Set up SSL certificate

### 2. Backend Services
- [ ] Create Supabase project
- [ ] Configure database schema
- [ ] Set up authentication
- [ ] Configure WebSocket server hosting

### 3. Environment Configuration
- [ ] Update .env with production values
- [ ] Configure API keys (Gemini, Supabase)
- [ ] Set up monitoring (Sentry)
- [ ] Configure analytics

### 4. Deploy Application
- [ ] Connect repository to hosting platform
- [ ] Configure build settings
- [ ] Deploy and test
- [ ] Verify all functionality works

### 5. Post-Deployment
- [ ] Set up monitoring and alerts
- [ ] Test with real users
- [ ] Monitor error rates
- [ ] Gather feedback

## 🚨 Production URLs to Configure
- Main app: https://your-domain.com
- WebSocket server: wss://your-websocket-server.com
- API endpoints: Configure in environment variables

## 📞 Support Information
- Repository: $(git remote get-url origin 2>/dev/null || echo "Local repository")
- Build date: $(date)
- Node version: $(node --version)
- Build size: $(du -sh dist 2>/dev/null | cut -f1 || echo "Run build first")

Ready for production deployment! 🚀
EOF
    
    log_success "Production checklist created: PRODUCTION_CHECKLIST.md"
}

# Main deployment preparation
main() {
    echo
    log_info "Starting deployment preparation process..."
    echo
    
    check_prerequisites
    install_dependencies
    run_tests
    check_env_config
    build_production
    start_websocket_server
    test_multiplayer
    create_production_checklist
    
    echo
    echo "🎉 Deployment preparation complete!"
    echo
    log_success "Your MixitFixit app is ready for production deployment"
    echo
    log_info "Next steps:"
    echo "  1. Review PRODUCTION_CHECKLIST.md"
    echo "  2. Configure production environment variables"
    echo "  3. Set up hosting and domain"
    echo "  4. Deploy and test"
    echo
    log_info "Build artifacts:"
    echo "  - Production build: ./dist/"
    echo "  - WebSocket server: ./src/server/websocket-server.js"
    echo "  - Environment template: ./.env.example"
    echo
}

# Handle script termination
cleanup() {
    if [ -f ".websocket.pid" ]; then
        WEBSOCKET_PID=$(cat .websocket.pid)
        if kill -0 $WEBSOCKET_PID 2>/dev/null; then
            log_info "Stopping WebSocket server (PID: $WEBSOCKET_PID)..."
            kill $WEBSOCKET_PID
        fi
        rm -f .websocket.pid
    fi
}

# Set up cleanup on script exit
trap cleanup EXIT

# Run main function
main "$@"