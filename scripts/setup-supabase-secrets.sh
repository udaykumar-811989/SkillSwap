#!/bin/bash

# SkillSwap - Supabase Edge Function Setup
# This script sets up the Firebase service account secret for the Edge Function.
#
# Prerequisites:
# 1. Install Supabase CLI: npm install -g supabase
# 2. Login: supabase login
# 3. Link your project: supabase link --project-ref your-project-ref
#
# Usage: bash scripts/setup-supabase-secrets.sh

echo "=== SkillSwap Supabase Setup ==="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI not found."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if FIREBASE_SERVICE_ACCOUNT env var is set
if [ -z "$FIREBASE_SERVICE_ACCOUNT" ]; then
    echo "Please set FIREBASE_SERVICE_ACCOUNT environment variable."
    echo ""
    echo "Example:"
    echo '  export FIREBASE_SERVICE_ACCOUNT=\'{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}\''
    echo ""
    echo "Get this from Firebase Console > Project Settings > Service Accounts > Generate New Private Key"
    exit 1
fi

echo "Setting FIREBASE_SERVICE_ACCOUNT secret..."
echo "$FIREBASE_SERVICE_ACCOUNT" | supabase secrets set FIREBASE_SERVICE_ACCOUNT=-

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Secret set successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy the Edge Function:"
    echo "   supabase functions deploy send-notification"
    echo ""
    echo "2. Test the function:"
    echo "   supabase functions invoke send-notification --body '{\"targetUserId\":\"test\",\"notification\":{\"title\":\"Test\",\"body\":\"Hello\"}}'"
else
    echo ""
    echo "❌ Failed to set secret. Make sure you're logged in and linked to your project."
    exit 1
fi
