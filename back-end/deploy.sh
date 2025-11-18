#!/bin/bash

# Deploy Script for Stablecoin Gateway
# Usage: ./deploy.sh [link|migrate|function|all]

set -e

PROJECT_REF="bzxdqkttnkxqaecaiekt"
FUNCTION_NAMES=("stablecoin-create" "deposit-request" "webhook-deposit" "withdraw" "webhook-withdraw")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

echo_error() {
  echo -e "${RED}✗ $1${NC}"
}

echo_info() {
  echo -e "${YELLOW}→ $1${NC}"
}

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo_error "Supabase CLI is not installed"
  echo "Install from: https://supabase.com/docs/guides/cli/getting-started"
  exit 1
fi

case "$1" in
  link)
    echo_info "Linking Supabase project..."
    supabase link --project-ref $PROJECT_REF
    echo_success "Project linked!"
    ;;

  migrate)
    echo_info "Executing database migrations..."
    supabase db push
    echo_success "Migrations completed!"
    ;;

  function)
    if [ -z "$2" ]; then
      echo_error "Specify which function to deploy: ${FUNCTION_NAMES[@]}"
      exit 1
    fi
    echo_info "Deploying function: $2"
    supabase functions deploy "$2"
    echo_success "Function deployed!"
    ;;

  all)
    echo_info "Starting complete deployment..."

    echo_info "Step 1: Link project"
    supabase link --project-ref $PROJECT_REF || echo_info "Already linked"

    echo_info "Step 2: Execute migrations"
    supabase db push
    echo_success "Migrations completed!"

    echo_info "Step 3: Deploy functions"
    for func in "${FUNCTION_NAMES[@]}"; do
      echo_info "Deploying: $func"
      supabase functions deploy "$func"
      echo_success "$func deployed!"
    done

    echo_success "All deployment completed! 🎉"
    echo ""
    echo "Test with:"
    echo 'curl -X POST https://'$PROJECT_REF'.supabase.co/functions/v1/stablecoin-create \'
    echo '  -H "x-api-key: test-api-key-123" \'
    echo '  -H "Content-Type: application/json" \'
    echo '  -d '"'"'{"client_name":"Test","symbol":"TST","client_wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","webhook":"https://webhook.site/xxx"}'"'"
    ;;

  serve)
    echo_info "Serving functions locally..."
    supabase functions serve
    ;;

  status)
    echo_info "Checking status..."
    supabase status
    ;;

  *)
    echo "Usage: ./deploy.sh [link|migrate|function|all|serve|status]"
    echo ""
    echo "Commands:"
    echo "  link      - Link to Supabase project"
    echo "  migrate   - Execute database migrations"
    echo "  function  - Deploy specific function"
    echo "  all       - Execute all steps (link → migrate → deploy functions)"
    echo "  serve     - Start local development server"
    echo "  status    - Check Supabase status"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh link"
    echo "  ./deploy.sh migrate"
    echo "  ./deploy.sh function stablecoin-create"
    echo "  ./deploy.sh all"
    exit 1
    ;;
esac
