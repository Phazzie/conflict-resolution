#!/bin/bash

# Production Build Validation Script
# Tests the production build for deployment readiness

set -e

echo "🚀 MixitFixit Production Build Validation"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
PASSED=0
FAILED=0
WARNINGS=0

log_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    log_fail "Dependencies not installed. Run 'npm install' first."
    exit 1
fi

# Check for required environment files
log_info "Checking environment configuration..."
if [ -f ".env.example" ]; then
    log_pass "Environment template exists"
else
    log_fail "Missing .env.example file"
fi

if [ -f ".env.local" ]; then
    log_pass "Development environment configured"
else
    log_warn "Missing .env.local - using defaults"
fi

# Run TypeScript compilation check
log_info "Checking TypeScript compilation..."
if npm run build > build.log 2>&1; then
    log_pass "TypeScript compilation successful"
    
    # Check bundle size
    if [ -d "dist" ]; then
        BUNDLE_SIZE=$(du -sh dist | cut -f1)
        log_info "Bundle size: $BUNDLE_SIZE"
        
        # Check if main JS bundle exists and size
        MAIN_JS=$(find dist -name "*.js" -type f -exec du -k {} + | sort -n | tail -1 | cut -f2)
        if [ -n "$MAIN_JS" ]; then
            MAIN_SIZE=$(du -k "$MAIN_JS" | cut -f1)
            if [ "$MAIN_SIZE" -gt 2048 ]; then
                log_warn "Main bundle is large: ${MAIN_SIZE}KB (>2MB)"
            else
                log_pass "Bundle size within limits: ${MAIN_SIZE}KB"
            fi
        fi
    fi
else
    log_fail "TypeScript compilation failed - check build.log"
    cat build.log
fi

# Run linting
log_info "Running linting checks..."
if npm run lint > lint.log 2>&1; then
    log_pass "Linting passed"
else
    log_warn "Linting issues found - check lint.log"
fi

# Run tests with coverage
log_info "Running test suite with coverage..."
if npm run test:coverage > test.log 2>&1; then
    log_pass "Test suite passed"
    
    # Check coverage
    if grep -q "All files" test.log; then
        COVERAGE=$(grep "All files" test.log | awk '{print $10}' | sed 's/%//')
        if [ -n "$COVERAGE" ] && [ "$COVERAGE" -ge 85 ]; then
            log_pass "Test coverage: ${COVERAGE}% (≥85%)"
        else
            log_warn "Test coverage: ${COVERAGE}% (<85%)"
        fi
    fi
else
    log_fail "Test suite failed - check test.log"
fi

# Check for security vulnerabilities (if available)
log_info "Checking for security vulnerabilities..."
if command -v npm audit &> /dev/null; then
    if npm audit --audit-level moderate > audit.log 2>&1; then
        log_pass "No security vulnerabilities found"
    else
        VULNS=$(grep "vulnerabilities" audit.log | head -1)
        if [[ "$VULNS" =~ "0 vulnerabilities" ]]; then
            log_pass "No security vulnerabilities found"
        else
            log_warn "Security vulnerabilities found: $VULNS"
        fi
    fi
fi

# Check critical files exist
log_info "Checking critical files..."

CRITICAL_FILES=(
    "dist/index.html"
    "dist/assets"
    "src/config/env.ts"
    "src/utils/errorPrevention.ts"
    "src/utils/security.ts"
    "src/utils/performanceMonitor.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -e "$file" ]; then
        log_pass "Critical file exists: $file"
    else
        log_fail "Missing critical file: $file"
    fi
done

# Check for development-only code in production build
log_info "Checking for development code in production build..."
if [ -d "dist" ]; then
    if grep -r "console.log\|debugger" dist/ > /dev/null 2>&1; then
        log_warn "Development debugging code found in production build"
    else
        log_pass "No development debugging code in production build"
    fi
fi

# Performance check - analyze bundle
log_info "Analyzing bundle composition..."
if [ -d "dist" ]; then
    # Count different file types
    JS_COUNT=$(find dist -name "*.js" | wc -l)
    CSS_COUNT=$(find dist -name "*.css" | wc -l)
    
    log_info "Bundle contains: ${JS_COUNT} JS files, ${CSS_COUNT} CSS files"
    
    if [ "$JS_COUNT" -gt 20 ]; then
        log_warn "High number of JS chunks ($JS_COUNT) - consider optimizing"
    else
        log_pass "Reasonable number of JS chunks ($JS_COUNT)"
    fi
fi

# Check environment variables in build
log_info "Checking environment variable handling..."
if [ -d "dist" ]; then
    if grep -r "VITE_.*undefined" dist/ > /dev/null 2>&1; then
        log_warn "Undefined environment variables found in build"
    else
        log_pass "Environment variables properly handled"
    fi
fi

# Summary
echo ""
echo "=========================================="
echo -e "${BLUE}📊 Validation Summary${NC}"
echo "=========================================="
echo -e "Passed:   ${GREEN}$PASSED${NC}"
echo -e "Failed:   ${RED}$FAILED${NC}" 
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 Production build is READY for deployment!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Production build has warnings but is deployable${NC}"
        echo "Consider addressing warnings before deploying to production"
        exit 0
    fi
else
    echo -e "${RED}❌ Production build has CRITICAL ISSUES and is NOT ready for deployment${NC}"
    echo "Fix the failed checks before attempting deployment"
    exit 1
fi