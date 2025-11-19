#!/bin/bash
# Configuration for API testing

# API Configuration
export API_KEY="sk_93d392d426debe7edaebb78d534e60b33e935ebd99d653b5"
export BASE_URL="https://bzxdqkttnkxqaecaiekt.supabase.co/functions/v1"
export LOCAL_URL="http://localhost:54321/functions/v1"

# Use LOCAL_URL for local testing, BASE_URL for production
# Uncomment the one you want to use:
export API_URL="$BASE_URL"
# export API_URL="$LOCAL_URL"

# Common headers
export HEADERS=(-H "Content-Type: application/json" -H "x-api-key: $API_KEY")

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

# Helper function to print colored output
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -z "$data" ]; then
        curl -s -X "$method" "${API_URL}/${endpoint}" "${HEADERS[@]}"
    else
        curl -s -X "$method" "${API_URL}/${endpoint}" "${HEADERS[@]}" -d "$data"
    fi
}

# Helper to format JSON output
format_json() {
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
}
