@echo off
REM Saved Searches Feature Deployment Script (Windows)
REM Story 4.4: Advanced Search and Filtering
REM
REM Usage: scripts\deploy-saved-searches.bat [environment]
REM Examples:
REM   scripts\deploy-saved-searches.bat development
REM   scripts\deploy-saved-searches.bat staging
REM   scripts\deploy-saved-searches.bat production

setlocal enabledelayedexpansion

REM Configuration
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=development

set MIGRATION_DIR=supabase\migrations
set MAIN_MIGRATION=20241113120000_saved_searches_feature.sql
set CRON_MIGRATION=20241113120001_saved_searches_pg_cron.sql

echo ========================================
echo Saved Searches Deployment Script
echo Environment: %ENVIRONMENT%
echo ========================================

REM Check prerequisites
:check_prerequisites
echo.
echo Checking prerequisites...

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Supabase CLI is not installed
    echo Install with: npm install -g supabase
    exit /b 1
)

REM Check if migration files exist
if not exist "%MIGRATION_DIR%\%MAIN_MIGRATION%" (
    echo Error: Main migration file not found: %MIGRATION_DIR%\%MAIN_MIGRATION%
    exit /b 1
)

if not exist "%MIGRATION_DIR%\%CRON_MIGRATION%" (
    echo Error: Cron migration file not found: %MIGRATION_DIR%\%CRON_MIGRATION%
    exit /b 1
)

echo Prerequisites check passed

REM Load environment variables
:load_environment
echo.
echo Loading environment variables...

set ENV_FILE=.env.%ENVIRONMENT%
if "%ENVIRONMENT%"=="development" set ENV_FILE=.env.local

if exist "%ENV_FILE%" (
    for /f "tokens=1,2 delims==" %%a in ('type "%ENV_FILE%" ^| findstr /v "^#"') do (
        set %%a=%%b
    )
    echo Environment variables loaded from %ENV_FILE%
) else (
    echo Warning: %ENV_FILE% not found
    echo Please ensure DATABASE_URL is set
)

REM Check for second parameter
if "%2"=="rollback" goto :rollback
if "%2"=="verify" goto :verify
if "%2"=="test" goto :test

REM Run main migration
:run_main_migration
echo.
echo Running main migration...
echo Creating tables: saved_searches, saved_search_alerts

if "%ENVIRONMENT%"=="production" (
    echo Production deployment detected!
    set /p confirm="Are you sure you want to run migrations on PRODUCTION? (yes/no): "
    if not "!confirm!"=="yes" (
        echo Deployment cancelled
        exit /b 0
    )
)

REM Run migration using Supabase CLI
call npx supabase db push --db-url "%DATABASE_URL%"
if %ERRORLEVEL% NEQ 0 (
    echo Failed to run main migration
    exit /b 1
)

echo Main migration completed

REM Setup background jobs
:setup_cron
echo.
echo Setting up background jobs...
echo.
echo NOTE: pg_cron must be enabled in Supabase Dashboard
echo Attempting to configure jobs...

REM Try to run cron migration
psql "%DATABASE_URL%" -f "%MIGRATION_DIR%\%CRON_MIGRATION%" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Background jobs could not be configured
    echo This is expected if pg_cron is not enabled
    echo Enable pg_cron in Supabase Dashboard and re-run this script
) else (
    echo Background jobs configured
)

REM Verify deployment
:verify
echo.
echo Verifying deployment...

REM Check if tables exist
echo Checking database tables...
psql "%DATABASE_URL%" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('saved_searches', 'saved_search_alerts');" >temp_verify.txt 2>nul

findstr /c:"saved_searches" temp_verify.txt >nul
if %ERRORLEVEL% EQU 0 (
    echo Database tables created successfully
) else (
    echo Warning: Some database tables may be missing
)

del temp_verify.txt 2>nul

REM Run tests
:test
if "%ENVIRONMENT%"=="development" (
    echo.
    echo Running unit tests...
    call pnpm test saved-search
)

REM Display summary
:summary
echo.
echo ========================================
echo Deployment Summary
echo ========================================
echo.
echo Deployed components:
echo   - Database tables (saved_searches, saved_search_alerts)
echo   - Database functions and views
echo   - Row-level security policies
echo   - Background jobs (if pg_cron enabled)
echo.
echo Next steps:
echo 1. Test the feature in the application
echo 2. Configure notification services (Twilio/SendGrid)
echo 3. Enable feature flag in production
echo 4. Monitor job execution:
echo    SELECT * FROM cron.job_run_details WHERE jobname LIKE '%%saved-search%%';
echo.
echo Deployment completed!
goto :end

REM Rollback function
:rollback
echo.
echo Rolling back deployment...
set /p confirm="Are you sure you want to rollback? This will delete all saved search data! (yes/no): "
if not "%confirm%"=="yes" (
    echo Rollback cancelled
    exit /b 0
)

echo Executing rollback...
echo -- Disable cron jobs > rollback.sql
echo UPDATE cron.job SET active = false WHERE jobname LIKE '%%saved-search%%'; >> rollback.sql
echo. >> rollback.sql
echo -- Drop tables and functions >> rollback.sql
echo DROP TABLE IF EXISTS public.saved_search_alerts CASCADE; >> rollback.sql
echo DROP TABLE IF EXISTS public.saved_searches CASCADE; >> rollback.sql
echo DROP VIEW IF EXISTS public.saved_search_matches CASCADE; >> rollback.sql
echo DROP FUNCTION IF EXISTS check_saved_search_matches CASCADE; >> rollback.sql
echo DROP FUNCTION IF EXISTS process_saved_search_notifications CASCADE; >> rollback.sql
echo DROP FUNCTION IF EXISTS get_saved_searches_with_stats CASCADE; >> rollback.sql

psql "%DATABASE_URL%" -f rollback.sql
del rollback.sql

echo Rollback completed
goto :end

:end
endlocal