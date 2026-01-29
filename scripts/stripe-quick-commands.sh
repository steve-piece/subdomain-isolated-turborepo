#!/bin/bash
# Stripe Quick Commands Reference
# Source this file or run commands directly

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔷 STRIPE TESTING - QUICK COMMANDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 WEBHOOK LISTENER"
echo "  ./scripts/test-stripe-webhooks.sh"
echo ""
echo "🎯 TRIGGER EVENTS"
echo "  ./scripts/trigger-stripe-events.sh new          # Test new handlers"
echo "  ./scripts/trigger-stripe-events.sh all          # Test all handlers"
echo "  ./scripts/trigger-stripe-events.sh invoice.paid # Test specific event"
echo ""
echo "✅ VERIFY DATABASE"
echo "  cat scripts/verify-stripe-sync.sql | pbcopy     # Copy queries"
echo "  # Then paste into Supabase SQL Editor"
echo ""
echo "🔍 QUICK CHECKS"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "⚠️  Not in project root. Run from: /path/to/subdomain-isolated-turborepo"
    exit 1
fi

# Check Stripe CLI
if command -v stripe &> /dev/null; then
    echo "  ✅ Stripe CLI installed"
else
    echo "  ❌ Stripe CLI not found"
    echo "     Install: brew install stripe/stripe-cli/stripe"
fi

# Check if logged in
if stripe config --list &> /dev/null 2>&1; then
    echo "  ✅ Logged in to Stripe"
else
    echo "  ⚠️  Not logged in to Stripe"
    echo "     Run: stripe login"
fi

# Check if dev server is running
if lsof -i:3003 &> /dev/null; then
    echo "  ✅ Dev server running on port 3003"
else
    echo "  ⏳ Dev server not running"
    echo "     Start: cd apps/protected && pnpm dev"
fi

# Check webhook secret
if [ -f "apps/protected/.env.local" ] && grep -q "STRIPE_WEBHOOK_SECRET" apps/protected/.env.local; then
    echo "  ✅ Webhook secret configured"
else
    echo "  ⚠️  Webhook secret not configured"
    echo "     Add to apps/protected/.env.local:"
    echo "     STRIPE_WEBHOOK_SECRET=whsec_..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📚 DOCUMENTATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Stripe Guide:  docs/STRIPE.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

