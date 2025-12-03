#!/bin/bash

# =====================================================
# Migration Idempotency Test Script
# Purpose: Test that migrations can be run multiple times safely
# Usage: ./test-idempotency.sh [migration_file]
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:54322/postgres}"
MIGRATIONS_DIR="supabase/migrations"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "$1"
}

# Function to test a single migration
test_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    
    print_info "\n=========================================="
    print_info "Testing: $migration_name"
    print_info "==========================================\n"
    
    # Run migration first time
    print_info "Running migration (1st time)..."
    if psql "$DATABASE_URL" -f "$migration_file" > /dev/null 2>&1; then
        print_success "First run successful"
    else
        print_error "First run failed"
        return 1
    fi
    
    # Run migration second time (idempotency test)
    print_info "Running migration (2nd time - idempotency test)..."
    if psql "$DATABASE_URL" -f "$migration_file" > /dev/null 2>&1; then
        print_success "Second run successful - Migration is idempotent"
    else
        print_error "Second run failed - Migration is NOT idempotent"
        return 1
    fi
    
    # Run migration third time (extra safety check)
    print_info "Running migration (3rd time - extra safety check)..."
    if psql "$DATABASE_URL" -f "$migration_file" > /dev/null 2>&1; then
        print_success "Third run successful - Migration is fully idempotent"
    else
        print_error "Third run failed"
        return 1
    fi
    
    print_success "✓ $migration_name passed idempotency test"
    return 0
}

# Function to test rollback
test_rollback() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    local rollback_file="supabase/migrations/rollback/${migration_name}_rollback.sql"
    
    if [ ! -f "$rollback_file" ]; then
        print_warning "Rollback script not found: $rollback_file"
        return 0
    fi
    
    print_info "\nTesting rollback for: $migration_name"
    
    # Run rollback
    if psql "$DATABASE_URL" -f "$rollback_file" > /dev/null 2>&1; then
        print_success "Rollback successful"
    else
        print_error "Rollback failed"
        return 1
    fi
    
    # Re-run migration after rollback
    print_info "Re-running migration after rollback..."
    if psql "$DATABASE_URL" -f "$migration_file" > /dev/null 2>&1; then
        print_success "Migration re-applied successfully after rollback"
    else
        print_error "Migration failed after rollback"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    print_info "=========================================="
    print_info "Migration Idempotency Test Suite"
    print_info "=========================================="
    print_info "Database: $DATABASE_URL"
    print_info "==========================================\n"
    
    # Check if specific migration file provided
    if [ $# -eq 1 ]; then
        migration_file="$MIGRATIONS_DIR/$1"
        if [ ! -f "$migration_file" ]; then
            print_error "Migration file not found: $migration_file"
            exit 1
        fi
        
        test_migration "$migration_file"
        test_rollback "$migration_file"
        exit $?
    fi
    
    # Test all migrations
    failed_migrations=()
    passed_migrations=()
    
    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration_file" ]; then
            if test_migration "$migration_file"; then
                passed_migrations+=("$(basename "$migration_file")")
                test_rollback "$migration_file" || true
            else
                failed_migrations+=("$(basename "$migration_file")")
            fi
        fi
    done
    
    # Print summary
    print_info "\n=========================================="
    print_info "Test Summary"
    print_info "==========================================\n"
    print_success "Passed: ${#passed_migrations[@]} migrations"
    
    if [ ${#failed_migrations[@]} -gt 0 ]; then
        print_error "Failed: ${#failed_migrations[@]} migrations"
        print_info "\nFailed migrations:"
        for migration in "${failed_migrations[@]}"; do
            print_error "  - $migration"
        done
        exit 1
    else
        print_success "\n✓ All migrations are idempotent!"
        exit 0
    fi
}

# Run main function
main "$@"
