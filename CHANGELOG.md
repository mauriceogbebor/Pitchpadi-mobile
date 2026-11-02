# Changelog

## 2026-11-02 — M1 Play mode (0.2.0)

- Book from the app: tap a pitch or a kick-off time on Play to open the pitch page with what the venue has, directions, the cancellation terms, 14 days of open times and the choice of length with prices.
- "Hold" keeps the time for you with a live countdown. Enter the name for the booking (your phone is filled in), pick card, bank transfer or USSD, and pay.
- Test mode: a test payment screen stands in for Paystack. Paying confirms the booking through the API's signed webhook, exactly like a real payment; you can also make it fail.
- The booked card shows the reference to show at the pitch, when, where, what you paid and the cancellation terms, with "Tell the team on WhatsApp" and "Get directions".
- New Bookings tab: your upcoming and recent games, including ones booked on the website with the same phone number. Tap one for the full booking.
- Waiting-for-payment and ended-hold screens explain what happened and what to do next. Every request that changes something carries an idempotency key, so a retry on a bad connection never books twice.
- The app refreshes when you come back to it, for example after paying in another app.

## 2026-11-02 — M0 Foundation (0.1.0)

- New Expo app (SDK 58, expo-router, TypeScript strict) for players and venues, on the same API as the website.
- Sign in with your phone and a 6-digit code; the session is kept in the phone's secure storage.
- Play: find open pitches across Lagos by day, area and time of day, with from-prices, Floodlit marks and kick-off times.
- Venue (owners and staff only): one day of bookings, read-only, with tap-to-call and a venue switcher.
- Account: who is signed in, your venues, sign out and sign out on all devices.
- Light and dark themes following the phone.
