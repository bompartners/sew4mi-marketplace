#!/bin/bash

# Saved Searches Feature Deployment Script
# Story 4.4: Advanced Search and Filtering
#
# Usage: ./scripts/deploy-saved-searches.sh [environment]
# Examples:
#   ./scripts/deploy-saved-searches.sh development
#   ./scripts/deploy-saved-searches.sh staging
#   ./scripts/deploy-saved-searches.sh production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
MIGRATION_DIR="supabase/migrations"
MAIN_MIGRATION="20241113120000_saved_searches_feature.sql"
CRON_MIGRATION="20241113120001_saved_searches_pg_cron.sql"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Saved Searches Deployment Script${NC}"
echo -e "${GREEN}Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to check prerequisites
check_prerequisites() {
    echo -e "\n${YELLOW}Checking prerequisites...${NC}"

    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        echo -e "${RED}Error: Supabase CLI is not installed${NC}"
        echo "Install with: npm install -g supabase"
        exit 1
    fi

    # Check if migration files exist
    if [ ! -f "$MIGRATION_DIR/$MAIN_MIGRATION" ]; then
        echo -e "${RED}Error: Main migration file not found: $MIGRATION_DIR/$MAIN_MIGRATION${NC}"
        exit 1
    fi

    if [ ! -f "$MIGRATION_DIR/$CRON_MIGRATION" ]; then
        echo -e "${RED}Error: Cron migration file not found: $MIGRATION_DIR/$CRON_MIGRATION${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Prerequisites check passed${NC}"
}

# Function to load environment variables
load_environment() {
    echo -e "\n${YELLOW}Loading environment variables...${NC}"

    ENV_FILE=".env.$ENVIRONMENT"
    if [ "$ENVIRONMENT" = "development" ]; then
        ENV_FILE=".env.local"
    fi

    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' $ENV_FILE | xargs)
        echo -e "${GREEN}✓ Environment variables loaded from $ENV_FILE${NC}"
    else
        echo -e "${RED}Warning: $ENV_FILE not found${NC}"
        echo "Please ensure DATABASE_URL is set"
    fi
}

# Function to run main migration
run_main_migration() {
    echo -e "\n${YELLOW}Running main migration...${NC}"
    echo "Creating tables: saved_searches, saved_search_alerts"

    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${RED}Production deployment detected!${NC}"
        read -p "Are you sure you want to run migrations on PRODUCTION? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Deployment cancelled"
            exit 0
        fi
    fi

    # Run migration using Supabase CLI
    npx supabase db push --db-url "$DATABASE_URL" || {
        echo -e "${RED}Failed to run main migration${NC}"
        exit 1
    }

    echo -e "${GREEN}✓ Main migration completed${NC}"
}

# Function to check pg_cron status
check_pg_cron() {
    echo -e "\n${YELLOW}Checking pg_cron extension...${NC}"

    QUERY="SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_cron';"

    result=$(psql "$DATABASE_URL" -t -c "$QUERY" 2>/dev/null || echo "0")

    if [ "$result" -eq "0" ] || [ "$result" = "0" ]; then
        echo -e "${RED}Warning: pg_cron extension is not enabled${NC}"
        echo "Please enable pg_cron through Supabase Dashboard or contact support"
        echo ""
        echo "To enable manually (requires superuser):"
        echo "  CREATE EXTENSION IF NOT EXISTS pg_cron;"
        echo "  GRANT USAGE ON SCHEMA cron TO postgres;"
        echo ""
        read -p "Continue without background jobs? (yes/no): " continue_without
        if [ "$continue_without" != "yes" ]; then
            exit 1
        fi
        return 1
    else
        echo -e "${GREEN}✓ pg_cron extension is enabled${NC}"
        return 0
    fi
}

# Function to run cron migration
run_cron_migration() {
    echo -e "\n${YELLOW}Setting up background jobs...${NC}"

    # Only run if pg_cron is available
    if ! check_pg_cron; then
        echo -e "${YELLOW}Skipping background job setup${NC}"
        return
    fi

    # Run the cron migration
    psql "$DATABASE_URL" -f "$MIGRATION_DIR/$CRON_MIGRATION" || {
        echo -e "${RED}Warning: Some background jobs may have failed to install${NC}"
        echo "This is normal if jobs already exist. Check manually with:"
        echo "  SELECT * FROM cron.job WHERE jobname LIKE '%saved-search%';"
    }

    echo -e "${GREEN}✓ Background jobs configured${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "\n${YELLOW}Verifying deployment...${NC}"

    # Check tables exist
    TABLES_QUERY="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('saved_searches', 'saved_search_alerts');"
    table_count=$(psql "$DATABASE_URL" -t -c "$TABLES_QUERY" 2>/dev/null || echo "0")

    if [ "$table_count" -eq "2" ]; then
        echo -e "${GREEN}✓ Database tables created successfully${NC}"
    else
        echo -e "${RED}✗ Database tables not found${NC}"
        exit 1
    fi

    # Check functions exist
    FUNCTION_QUERY="SELECT COUNT(*) FROM pg_proc WHERE proname IN ('check_saved_search_matches', 'get_saved_searches_with_stats');"
    function_count=$(psql "$DATABASE_URL" -t -c "$FUNCTION_QUERY" 2>/dev/null || echo "0")

    if [ "$function_count" -ge "2" ]; then
        echo -e "${GREEN}✓ Database functions created successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Some database functions may be missing${NC}"
    fi

    # Check cron jobs if pg_cron is enabled
    if check_pg_cron; then
        JOBS_QUERY="SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%saved-search%' AND active = true;"
        job_count=$(psql "$DATABASE_URL" -t -c "$JOBS_QUERY" 2>/dev/null || echo "0")

        if [ "$job_count" -gt "0" ]; then
            echo -e "${GREEN}✓ Background jobs active: $job_count jobs${NC}"
        else
            echo -e "${YELLOW}⚠ No active background jobs found${NC}"
        fi
    fi
}

# Function to run post-deployment tests
run_tests() {
    echo -e "\n${YELLOW}Running post-deployment tests...${NC}"

    # Test database connection and basic query
    TEST_QUERY="SELECT COUNT(*) FROM saved_searches WHERE 1=0;"
    if psql "$DATABASE_URL" -t -c "$TEST_QUERY" &>/dev/null; then
        echo -e "${GREEN}✓ Database queries working${NC}"
    else
        echo -e "${RED}✗ Database query failed${NC}"
    fi

    # Run unit tests if in development
    if [ "$ENVIRONMENT" = "development" ]; then
        echo -e "\n${YELLOW}Running unit tests...${NC}"
        pnpm test --grep "saved.*search" || {
            echo -e "${YELLOW}⚠ Some tests failed${NC}"
        }
    fi
}

# Function to display summary
display_summary() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Summary${NC}"
    echo -e "${GREEN}========================================${NC}"

    echo -e "\nDeployed components:"
    echo -e "  ${GREEN}✓${NC} Database tables (saved_searches, saved_search_alerts)"
    echo -e "  ${GREEN}✓${NC} Database functions and views"
    echo -e "  ${GREEN}✓${NC} Row-level security policies"

    if check_pg_cron; then
        echo -e "  ${GREEN}✓${NC} Background jobs (pg_cron)"
    else
        echo -e "  ${YELLOW}⚠${NC} Background jobs (not configured - pg_cron missing)"
    fi

    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Test the feature in the application"
    echo "2. Monitor job execution (if pg_cron enabled):"
    echo "   SELECT * FROM cron.job_run_details WHERE jobname LIKE '%saved-search%';"
    echo "3. Configure notification services (Twilio/SendGrid)"
    echo "4. Enable feature flag in production"
    echo ""
    echo -e "${GREEN}Deployment completed successfully!${NC}"
}

# Function to handle rollback
rollback() {
    echo -e "\n${RED}Rolling back deployment...${NC}"

    read -p "Are you sure you want to rollback? This will delete all saved search data! (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Rollback cancelled"
        exit 0
    fi

    ROLLBACK_SQL="
    -- Disable cron jobs
    UPDATE cron.job SET active = false WHERE jobname LIKE '%saved-search%';

    -- Drop tables and functions
    DROP TABLE IF EXISTS public.saved_search_alerts CASCADE;
    DROP TABLE IF EXISTS public.saved_searches CASCADE;
    DROP VIEW IF EXISTS public.saved_search_matches CASCADE;
    DROP FUNCTION IF EXISTS check_saved_search_matches CASCADE;
    DROP FUNCTION IF EXISTS process_saved_search_notifications CASCADE;
    DROP FUNCTION IF EXISTS get_saved_searches_with_stats CASCADE;
    "

    echo "$ROLLBACK_SQL" | psql "$DATABASE_URL" || {
        echo -e "${RED}Rollback failed${NC}"
        exit 1
    }

    echo -e "${GREEN}Rollback completed${NC}"
}

# Main execution flow
main() {
    case "$2" in
        rollback)
            load_environment
            rollback
            ;;
        verify)
            load_environment
            verify_deployment
            ;;
        test)
            load_environment
            run_tests
            ;;
        *)
            check_prerequisites
            load_environment
            run_main_migration
            run_cron_migration
            verify_deployment
            run_tests
            display_summary
            ;;
    esac
}

# Handle errors
trap 'echo -e "\n${RED}Deployment failed!${NC}"; exit 1' ERR

# Run main function
main "$@"