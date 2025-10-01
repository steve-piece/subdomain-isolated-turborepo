#!/bin/bash
# Test Stripe Webhooks Locally
# Usage: ./scripts/test-stripe-webhooks.sh

set -e

echo "🔧 Stripe Webhook Testing Script"
echo "=================================="
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found!"
    echo ""
    echo "Install it with:"
    echo "  macOS: brew install stripe/stripe-cli/stripe"
    echo "  Other: https://stripe.com/docs/stripe-cli"
    exit 1
fi

echo "✅ Stripe CLI found"
echo ""

# Check if logged in
if ! stripe config --list &> /dev/null; then
    echo "⚠️  Not logged in to Stripe CLI"
    echo "Run: stripe login"
    exit 1
fi

echo "✅ Logged in to Stripe"
echo ""

# Determine port from environment or use default
PORT=${PORT:-3003}
WEBHOOK_URL="localhost:${PORT}/api/webhooks/stripe"

echo "📡 Webhook endpoint: ${WEBHOOK_URL}"
echo ""
echo "Starting webhook listener..."
echo "Press Ctrl+C to stop"
echo ""
echo "Copy the webhook secret (whsec_...) and add to .env.local:"
echo "  STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""

# Start listening
stripe listen --forward-to "${WEBHOOK_URL}"

