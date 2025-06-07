#!/bin/bash

# WeAnime Health Check Script
# Monitors system health and sends alerts to Slack

set -e

# Configuration
HEALTH_CHECK_URL="https://weanime.app/api/health"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL}"
LOG_FILE="/var/log/weanime-health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Send Slack notification
send_slack_alert() {
    local status=$1
    local message=$2
    local color=$3
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"WeAnime Health Check - $status\",
                    \"text\": \"$message\",
                    \"footer\": \"WeAnime Monitoring\",
                    \"ts\": $(date +%s)
                }]
            }" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    fi
}

# Check API health
check_api_health() {
    log "Checking API health..."
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$HEALTH_CHECK_URL" --max-time 10)
    
    if [ "$response" = "200" ]; then
        log "${GREEN}✅ API health check passed${NC}"
        return 0
    else
        log "${RED}❌ API health check failed (HTTP $response)${NC}"
        send_slack_alert "CRITICAL" "API health check failed with HTTP status $response" "danger"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    # Test database connection through API
    local db_response=$(curl -s "$HEALTH_CHECK_URL" | jq -r '.database.status' 2>/dev/null)
    
    if [ "$db_response" = "healthy" ]; then
        log "${GREEN}✅ Database connectivity check passed${NC}"
        return 0
    else
        log "${RED}❌ Database connectivity check failed${NC}"
        send_slack_alert "CRITICAL" "Database connectivity check failed" "danger"
        return 1
    fi
}

# Check response time
check_response_time() {
    log "Checking response time..."
    
    local response_time=$(curl -s -w "%{time_total}" -o /dev/null "$HEALTH_CHECK_URL" --max-time 30)
    local threshold=3.0
    
    # Use bc for floating point comparison
    if (( $(echo "$response_time < $threshold" | bc -l) )); then
        log "${GREEN}✅ Response time check passed (${response_time}s)${NC}"
        return 0
    else
        log "${YELLOW}⚠️ Response time check warning (${response_time}s > ${threshold}s)${NC}"
        send_slack_alert "WARNING" "High response time detected: ${response_time}s" "warning"
        return 1
    fi
}

# Check SSL certificate
check_ssl_certificate() {
    log "Checking SSL certificate..."
    
    local domain="weanime.app"
    local expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates | grep 'notAfter' | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ "$days_until_expiry" -gt 30 ]; then
        log "${GREEN}✅ SSL certificate check passed ($days_until_expiry days remaining)${NC}"
        return 0
    elif [ "$days_until_expiry" -gt 7 ]; then
        log "${YELLOW}⚠️ SSL certificate expires in $days_until_expiry days${NC}"
        send_slack_alert "WARNING" "SSL certificate expires in $days_until_expiry days" "warning"
        return 1
    else
        log "${RED}❌ SSL certificate expires in $days_until_expiry days${NC}"
        send_slack_alert "CRITICAL" "SSL certificate expires in $days_until_expiry days" "danger"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    local threshold=80
    
    if [ "$usage" -lt "$threshold" ]; then
        log "${GREEN}✅ Disk space check passed (${usage}% used)${NC}"
        return 0
    elif [ "$usage" -lt 90 ]; then
        log "${YELLOW}⚠️ Disk space warning (${usage}% used)${NC}"
        send_slack_alert "WARNING" "High disk usage detected: ${usage}%" "warning"
        return 1
    else
        log "${RED}❌ Disk space critical (${usage}% used)${NC}"
        send_slack_alert "CRITICAL" "Critical disk usage: ${usage}%" "danger"
        return 1
    fi
}

# Check memory usage
check_memory_usage() {
    log "Checking memory usage..."
    
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2 }')
    local threshold=80
    
    if [ "$usage" -lt "$threshold" ]; then
        log "${GREEN}✅ Memory usage check passed (${usage}% used)${NC}"
        return 0
    elif [ "$usage" -lt 90 ]; then
        log "${YELLOW}⚠️ Memory usage warning (${usage}% used)${NC}"
        send_slack_alert "WARNING" "High memory usage detected: ${usage}%" "warning"
        return 1
    else
        log "${RED}❌ Memory usage critical (${usage}% used)${NC}"
        send_slack_alert "CRITICAL" "Critical memory usage: ${usage}%" "danger"
        return 1
    fi
}

# Check CPU usage
check_cpu_usage() {
    log "Checking CPU usage..."
    
    local usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    local threshold=80
    
    # Convert to integer for comparison
    local usage_int=$(echo "$usage" | cut -d. -f1)
    
    if [ "$usage_int" -lt "$threshold" ]; then
        log "${GREEN}✅ CPU usage check passed (${usage}% used)${NC}"
        return 0
    elif [ "$usage_int" -lt 90 ]; then
        log "${YELLOW}⚠️ CPU usage warning (${usage}% used)${NC}"
        send_slack_alert "WARNING" "High CPU usage detected: ${usage}%" "warning"
        return 1
    else
        log "${RED}❌ CPU usage critical (${usage}% used)${NC}"
        send_slack_alert "CRITICAL" "Critical CPU usage: ${usage}%" "danger"
        return 1
    fi
}

# Main health check function
main() {
    log "Starting WeAnime health check..."
    
    local failed_checks=0
    local total_checks=0
    
    # Run all health checks
    checks=(
        "check_api_health"
        "check_database"
        "check_response_time"
        "check_ssl_certificate"
        "check_disk_space"
        "check_memory_usage"
        "check_cpu_usage"
    )
    
    for check in "${checks[@]}"; do
        total_checks=$((total_checks + 1))
        if ! $check; then
            failed_checks=$((failed_checks + 1))
        fi
    done
    
    # Summary
    local passed_checks=$((total_checks - failed_checks))
    log "Health check summary: $passed_checks/$total_checks checks passed"
    
    if [ "$failed_checks" -eq 0 ]; then
        log "${GREEN}🎉 All health checks passed!${NC}"
        # Send success notification only if previous check failed
        if [ -f "/tmp/weanime-health-failed" ]; then
            send_slack_alert "SUCCESS" "All health checks are now passing!" "good"
            rm -f "/tmp/weanime-health-failed"
        fi
        return 0
    else
        log "${RED}⚠️ $failed_checks health check(s) failed${NC}"
        touch "/tmp/weanime-health-failed"
        return 1
    fi
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main "$@"