# SSL Certificates

This directory contains SSL certificates for secure database connections.

## Setup Instructions

### 1. Download Supabase SSL Certificate

Go to your Supabase project settings:

1. Navigate to **Project Settings** → **Database**
2. Scroll down to **Connection Info** → **SSL Mode**
3. Download the certificate file (usually named `prod-ca-2021.crt` or similar)

### 2. Add Certificate to This Directory

Save the downloaded certificate as:

```
certs/supabase-ca.crt
```

### 3. Environment Variables

The certificate path is automatically configured in the Supabase client.
No additional environment variables are needed.

## Security Notes

- ✅ Certificate files are gitignored by default
- ✅ Only the README is tracked in version control
- ⚠️ Never commit actual certificate files
- ⚠️ Each developer should download their own certificate

## Verification

To verify SSL is working, check your Supabase connection logs for SSL/TLS handshake messages.
