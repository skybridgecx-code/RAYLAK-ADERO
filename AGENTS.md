# RAYLAK agent instructions

## Product

RAYLAK is a production-grade luxury transportation platform.
Build RAYLAK first.
Do not build Adero network features yet.

## Business context

RAYLAK serves premium transportation clients including VIP, corporate, airport, event, and long-distance bookings.
The platform must feel polished, private, reliable, and operationally safe.

## Core surfaces

1. Public website
2. Operator dashboard
3. Driver PWA

## In scope now

- bookings
- dispatch
- pricing
- fleet management
- CRM
- real-time ride operations
- notifications
- customer ride tracking
- RBAC
- audit logging

## Out of scope for now

- Adero B2B overflow marketplace
- native iOS app
- native Android app
- speculative side features

## Stack

- Next.js 15 App Router
- TypeScript strict
- tRPC
- Drizzle ORM
- PostgreSQL
- Redis
- dedicated Socket.io real-time server
- Clerk auth with RBAC
- Twilio
- Resend
- Google Maps
- AWS S3 + CloudFront
- Stripe
- Sentry
- Vercel + Fly.io

## Domain model

- users
- bookings
- booking_stops
- vehicles
- driver_profiles
- booking_status_log
- pricing_rules
- notifications
- driver_earnings
- company_accounts
- availability_blocks
- service_areas
- rate_cards

## Booking status flow

new_request -> quoted -> confirmed -> assigned -> driver_en_route -> driver_arrived -> passenger_picked_up -> completed
Also support canceled and no_show.
Transitions must be enforced server-side.

## Product principles

- premium
- executive
- reliable
- dispatcher-led
- human override over automation
- real-time visibility like Uber, but not a consumer gig marketplace
- mobile-first for customers and drivers
- privacy-aware for VIP clientele

## Rules

- build in bounded phases
- keep each phase deployable
- no scope drift
- do not change stack choices without approval
- do not remove the driver app
- do not weaken RBAC, audit logging, notifications, or dispatch depth
- do not build Adero features now
- commit after each completed phase

## Required after every phase

1. what changed
2. exact files changed
3. validations run
4. risks / follow-ups
5. exact git commit command
