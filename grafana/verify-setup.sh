#!/bin/bash

# Grafana Setup Verification Script
# 
# This script verifies that Grafana and Prometheus are properly configured
# and that metrics are flowing correctly.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
API_URL="${API_URL:-http://localhost:3000}"

echo "=========================================="
echo "Grafana Setup Verification"
echo "=========================================="
echo ""

# Function to check if a service is running
check_service() {
    local name=$1
    local url=$2
    
    echo -n "Checking $name... "
    if curl -s -f -o /dev/null "$url"; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not accessible${NC}"
        return 1
    fi
}

# Function to check metrics endpoint
check_metrics() {
    echo -n "Checking metrics endpoint... "
    local response=$(curl -s "$API_URL/api/metrics")
    
    if echo "$response" | grep -q "anoteros_http_requests_total"; then
        echo -e "${GREEN}✓ Metrics available${NC}"
        
        # Count metrics
        local metric_count=$(echo "$response" | grep -c "^anoteros_" || true)
        echo "  Found $metric_count Anóteros metrics"
        return 0
    else
        echo -e "${RED}✗ No metrics found${NC}"
        return 1
    fi
}

# Function to check Prometheus targets
check_prometheus_targets() {
    echo -n "Checking Prometheus targets... "
    local response=$(curl -s "$PROMETHEUS_URL/api/v1/targets")
    
    if echo "$response" | grep -q '"health":"up"'; then
        echo -e "${GREEN}✓ Targets are up${NC}"
        
        # Count active targets
        local target_count=$(echo "$response" | grep -o '"health":"up"' | wc -l)
        echo "  $target_count active target(s)"
        return 0
    else
        echo -e "${YELLOW}⚠ No active targets${NC}"
        echo "  Make sure Prometheus is configured to scrape your API"
        return 1
    fi
}

# Function to check Grafana datasource
check_grafana_datasource() {
    echo -n "Checking Grafana datasource... "
    
    # Try to access Grafana API (may require auth)
    local response=$(curl -s "$GRAFANA_URL/api/datasources")
    
    if echo "$response" | grep -q "Prometheus"; then
        echo -e "${GREEN}✓ Prometheus datasource configured${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Cannot verify datasource${NC}"
        echo "  Please check manually in Grafana UI"
        return 1
    fi
}

# Function to test a PromQL query
test_promql_query() {
    local query=$1
    local description=$2
    
    echo -n "Testing query: $description... "
    local encoded_query=$(echo "$query" | jq -sRr @uri)
    local response=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$encoded_query")
    
    if echo "$response" | grep -q '"status":"success"'; then
        local result_count=$(echo "$response" | jq '.data.result | length')
        if [ "$result_count" -gt 0 ]; then
            echo -e "${GREEN}✓ $result_count result(s)${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ No data${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Query failed${NC}"
        return 1
    fi
}

# Main verification steps
echo "1. Service Availability"
echo "------------------------"
check_service "Prometheus" "$PROMETHEUS_URL/-/healthy" || true
check_service "Grafana" "$GRAFANA_URL/api/health" || true
check_service "API" "$API_URL/api/health" || true
echo ""

echo "2. Metrics Collection"
echo "---------------------"
check_metrics || true
echo ""

echo "3. Prometheus Configuration"
echo "---------------------------"
check_prometheus_targets || true
echo ""

echo "4. Sample Queries"
echo "-----------------"
if check_service "Prometheus" "$PROMETHEUS_URL/-/healthy" > /dev/null 2>&1; then
    test_promql_query "up" "Service status" || true
    test_promql_query "anoteros_http_requests_total" "HTTP requests" || true
    test_promql_query "anoteros_active_users" "Active users" || true
else
    echo -e "${YELLOW}⚠ Skipping (Prometheus not available)${NC}"
fi
echo ""

echo "5. Grafana Configuration"
echo "------------------------"
check_grafana_datasource || true
echo ""

# Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Open Grafana: $GRAFANA_URL"
echo "2. Login (default: admin/admin)"
echo "3. Navigate to Dashboards → Anóteros Lógos"
echo "4. Verify dashboards are showing data"
echo ""
echo "If you see issues:"
echo "- Check Docker containers: docker-compose ps"
echo "- View logs: docker-compose logs"
echo "- Verify prometheus.yml configuration"
echo "- Ensure API is exposing metrics at /api/metrics"
echo ""
echo "Documentation:"
echo "- README.md - Complete setup guide"
echo "- QUICK_START.md - Quick setup instructions"
echo ""
