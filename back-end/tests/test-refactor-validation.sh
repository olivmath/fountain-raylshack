#!/bin/bash

source "$(dirname "$0")/config.sh"

print_header "VALIDATING DEPOSIT-REQUEST REFACTORING"
echo ""

# Step 1: Create a stablecoin
print_header "Step 1: Creating test stablecoin"
SYMBOL="REFTEST$(date +%s | tail -c 4)"

CREATE_DATA=$(cat <<EOD
{
  "client_name": "Refactor Test",
  "symbol": "$SYMBOL",
  "client_wallet": "0x1234567890123456789012345678901234567890",
  "webhook": "https://webhook.example.com",
  "total_supply": 1000000
}
EOD
)

CREATE_RESPONSE=$(api_call "POST" "stablecoin-create" "$CREATE_DATA")
STABLECOIN_ID=$(echo "$CREATE_RESPONSE" | jq -r '.stablecoin_id' 2>/dev/null)

if [ "$STABLECOIN_ID" != "null" ] && [ ! -z "$STABLECOIN_ID" ]; then
    print_success "Stablecoin created: $STABLECOIN_ID"
else
    print_error "Failed to create stablecoin"
    format_json "$CREATE_RESPONSE"
    exit 1
fi

# Step 2: Test deposit with NEW format (stablecoin_id in body)
print_header "Step 2: Testing deposit-request with REFACTORED format"
DEPOSIT_DATA=$(cat <<EOD
{
  "stablecoin_id": "$STABLECOIN_ID",
  "amount": 100
}
EOD
)

print_info "Request:"
echo "$DEPOSIT_DATA" | jq '.'

DEPOSIT_RESPONSE=$(api_call "POST" "deposit-request" "$DEPOSIT_DATA")

print_info "Response:"
format_json "$DEPOSIT_RESPONSE"

OPERATION_ID=$(echo "$DEPOSIT_RESPONSE" | jq -r '.operation_id' 2>/dev/null)

if [ "$OPERATION_ID" != "null" ] && [ ! -z "$OPERATION_ID" ]; then
    print_success "✅ REFACTORING SUCCESSFUL!"
    echo ""
    echo "Details:"
    echo "  Operation ID: $OPERATION_ID"
    echo "  Amount: $(echo "$DEPOSIT_RESPONSE" | jq -r '.amount')"
    echo "  Status: $(echo "$DEPOSIT_RESPONSE" | jq -r '.status')"
    echo ""
    echo "The deposit-request function now:"
    echo "  ✓ Accepts stablecoin_id in request body"
    echo "  ✓ No longer requires symbol in URL path"
    echo "  ✓ Consistent with other functions (withdraw, etc)"
else
    print_error "❌ REFACTORING FAILED"
    format_json "$DEPOSIT_RESPONSE"
    exit 1
fi
