# TWIGA transactional email setup

## Sender identity
- Display name: `Mike from TWIGA`
- From address after Resend verifies the subdomain: `hello@mike.twiga.co.ke`
- Resend sending domain: `mike.twiga.co.ke`
- SMTP host: `smtp.resend.com`
- SMTP port: `465` (SSL) or `587` (STARTTLS)
- SMTP username: `resend`
- SMTP password: a restricted Resend sending API key scoped to `mike.twiga.co.ke`

## Supabase Auth
Set the custom SMTP values in Supabase Authentication > SMTP Settings. Do not paste the API key into chat or source control. Use a key scoped only to sending from the verified Mike subdomain.

In Authentication > Email Templates > Confirm signup:
- Subject: `Welcome to TWIGA — confirm your email`
- HTML: use `confirmation.html`
- Keep the `{{ .ConfirmationURL }}` placeholder intact; it is the confirmation button destination.

The dashboard implements a Resend confirmation action using Supabase Auth's `auth.resend({ type: "signup" })`.

## Deliverability
SPF, DKIM and DMARC authenticate the sender; they do not guarantee inbox placement or prevent every spam classification. Send only to opted-in recipients, use accurate sender details, avoid purchased lists, process bounces/complaints, and increase volume gradually. The subdomain DMARC policy is currently monitoring-only (`p=none`).
