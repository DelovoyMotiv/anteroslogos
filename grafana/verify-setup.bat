@echo off
REM Grafana Setup Verification Script (Windows)
REM 
REM This script verifies that Grafana and Prometheus are properly configured
REM and that metrics are flowing correctly.

setlocal enabledelayedexpansion

REM Configuration
if "%PROMETHEUS_URL%"=="" set PROMETHEUS_URL=http://localhost:9090
if "%GRAFANA_URL%"=="" set GRAFANA_URL=http://localhost:3001
if "%API_URL%"=="" set API_URL=http://localhost:3000

echo ==========================================
echo Grafana Setup Verification
echo ==========================================
echo.

echo 1. Service Availability
echo ------------------------

REM Check Prometheus
echo Checking Prometheus...
curl -s -f -o nul "%PROMETHEUS_URL%/-/healthy" 2>nul
if %errorlevel%==0 (
    echo [OK] Prometheus is running
) else (
    echo [FAIL] Prometheus is not accessible
)

REM Check Grafana
echo Checking Grafana...
curl -s -f -o nul "%GRAFANA_URL%/api/health" 2>nul
if %errorlevel%==0 (
    echo [OK] Grafana is running
) else (
    echo [FAIL] Grafana is not accessible
)

REM Check API
echo Checking API...
curl -s -f -o nul "%API_URL%/api/health" 2>nul
if %errorlevel%==0 (
    echo [OK] API is running
) else (
    echo [FAIL] API is not accessible
)

echo.
echo 2. Metrics Collection
echo ---------------------

REM Check metrics endpoint
echo Checking metrics endpoint...
curl -s "%API_URL%/api/metrics" 2>nul | findstr "anoteros_http_requests_total" >nul
if %errorlevel%==0 (
    echo [OK] Metrics are available
) else (
    echo [FAIL] No metrics found
)

echo.
echo 3. Prometheus Configuration
echo ---------------------------

REM Check Prometheus targets
echo Checking Prometheus targets...
curl -s "%PROMETHEUS_URL%/api/v1/targets" 2>nul | findstr "\"health\":\"up\"" >nul
if %errorlevel%==0 (
    echo [OK] Targets are up
) else (
    echo [WARN] No active targets
    echo   Make sure Prometheus is configured to scrape your API
)

echo.
echo ==========================================
echo Verification Summary
echo ==========================================
echo.
echo Next Steps:
echo 1. Open Grafana: %GRAFANA_URL%
echo 2. Login (default: admin/admin)
echo 3. Navigate to Dashboards -^> Anoteros Logos
echo 4. Verify dashboards are showing data
echo.
echo If you see issues:
echo - Check Docker containers: docker-compose ps
echo - View logs: docker-compose logs
echo - Verify prometheus.yml configuration
echo - Ensure API is exposing metrics at /api/metrics
echo.
echo Documentation:
echo - README.md - Complete setup guide
echo - QUICK_START.md - Quick setup instructions
echo.

pause
