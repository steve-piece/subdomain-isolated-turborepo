#!/bin/bash
# Trigger Stripe Test Events
# Usage: ./scripts/trigger-stripe-events.sh [event_name]

set -e

echo "🎯 Stripe Event Trigger Script"
echo "==============================="
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found!"
    exit 1
fi

EVENT=$1

if [ -z "$EVENT" ]; then
    echo "Available events to trigger:"
    echo ""
    echo "Existing handlers:"
    echo "  1. customer.subscription.created"
    echo "  2. customer.subscription.updated"
    echo "  3. customer.subscription.deleted"
    echo "  4. invoice.paid"
    echo "  5. invoice.payment_failed"
    echo "  6. payment_method.attached"
    echo "  7. payment_method.detached"
    echo ""
    echo "🆕 New handlers:"
    echo "  8. checkout.session.completed"
    echo "  9. customer.updated"
    echo " 10. customer.deleted"
    echo " 11. invoice.finalized"
    echo " 12. payment_method.updated"
    echo ""
    echo "Usage:"
    echo "  ./scripts/trigger-stripe-events.sh customer.subscription.created"
    echo "  ./scripts/trigger-stripe-events.sh all        # Test all events"
    echo "  ./scripts/trigger-stripe-events.sh new        # Test new events only"
    exit 0
fi

trigger_event() {
    local event=$1
    echo "🔄 Triggering: $event"
    stripe trigger "$event"
    echo "✅ Triggered: $event"
    echo ""
    sleep 2
}

if [ "$EVENT" = "all" ]; then
    echo "Testing all webhook events..."
    echo ""
    
    # Existing events
    trigger_event "customer.subscription.created"
    trigger_event "customer.subscription.updated"
    trigger_event "customer.subscription.deleted"
    trigger_event "invoice.paid"
    trigger_event "invoice.payment_failed"
    trigger_event "payment_method.attached"
    trigger_event "payment_method.detached"
    
    # New events
    trigger_event "checkout.session.completed"
    trigger_event "customer.updated"
    trigger_event "customer.deleted"
    trigger_event "invoice.finalized"
    # Note: payment_method.updated might not be available via trigger
    
    echo "✅ All events triggered!"
    echo ""
    echo "Check your database:"
    echo "  psql or Supabase Studio → stripe_webhook_events table"
    
elif [ "$EVENT" = "new" ]; then
    echo "Testing new webhook events..."
    echo ""
    
    trigger_event "checkout.session.completed"
    trigger_event "customer.updated"
    trigger_event "customer.deleted"
    trigger_event "invoice.finalized"
    
    echo "✅ New events triggered!"
    echo ""
    echo "Verify in database:"
    echo "  SELECT * FROM stripe_webhook_events WHERE event_type IN ("
    echo "    'checkout.session.completed',"
    echo "    'customer.updated',"
    echo "    'customer.deleted',"
    echo "    'invoice.finalized'"
    echo "  ) ORDER BY created_at DESC;"
    
else
    trigger_event "$EVENT"
    
    echo "Verify in database:"
    echo "  SELECT * FROM stripe_webhook_events WHERE event_type = '$EVENT' ORDER BY created_at DESC LIMIT 1;"
fi

