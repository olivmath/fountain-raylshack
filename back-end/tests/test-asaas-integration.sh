#!/bin/bash

source "$(dirname "$0")/config.sh"

print_header "ASAAS INTEGRATION TEST"
echo ""

# Generate unique symbol
SYMBOL="ASAAS$(date +%s | tail -c 4)"

# Step 1: Create stablecoin (should create Asaas customer)
print_header "Step 1: Create stablecoin with Asaas customer"
CREATE_DATA=$(cat <<EOD
{
  "client_name": "Asaas Test Client",
  "symbol": "$SYMBOL",
  "client_wallet": "0x1234567890123456789012345678901234567890",
  "webhook": "https://webhook.example.com/events",
  "total_supply": 1000000
}
EOD
)

print_info "Creating stablecoin: $SYMBOL"
CREATE_RESPONSE=$(api_call "POST" "stablecoin-create" "$CREATE_DATA")

STABLECOIN_ID=$(echo "$CREATE_RESPONSE" | jq -r '.stablecoin_id' 2>/dev/null)

if [ "$STABLECOIN_ID" != "null" ] && [ ! -z "$STABLECOIN_ID" ]; then
    print_success "✅ Stablecoin created: $STABLECOIN_ID"
    echo "  Response:"
    format_json "$CREATE_RESPONSE"
else
    print_error "❌ Failed to create stablecoin"
    format_json "$CREATE_RESPONSE"
    exit 1
fi

# Step 2: Test deposit request (should use Asaas customer)
print_header "Step 2: Create deposit request with Asaas customer"
DEPOSIT_DATA=$(cat <<EOD
{
  "stablecoin_id": "$STABLECOIN_ID",
  "amount": 100
}
EOD
)

print_info "Creating deposit request for $SYMBOL"
DEPOSIT_RESPONSE=$(api_call "POST" "deposit-request" "$DEPOSIT_DATA")

OPERATION_ID=$(echo "$DEPOSIT_RESPONSE" | jq -r '.operation_id' 2>/dev/null)

if [ "$OPERATION_ID" != "null" ] && [ ! -z "$OPERATION_ID" ]; then
    print_success "✅ Deposit request created: $OPERATION_ID"
    echo "  Response:"
    format_json "$DEPOSIT_RESPONSE"
elif echo "$DEPOSIT_RESPONSE" | grep -q "customer not configured"; then
    print_error "❌ Stablecoin customer not configured (migration issue?)"
    format_json "$DEPOSIT_RESPONSE"
elif echo "$DEPOSIT_RESPONSE" | grep -q "Failed to create PIX code"; then
    print_error "❌ Failed to create PIX code (Asaas API error)"
    format_json "$DEPOSIT_RESPONSE"
else
    print_error "❌ Failed to create deposit request"
    format_json "$DEPOSIT_RESPONSE"
fi

print_header "ASAAS INTEGRATION TEST COMPLETE"
