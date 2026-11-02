# Changelog

## 2026-11-02 — D3 Redesign: "Under the lights" (0.6.0)

- A new look across the app: deep pitch-green bands with mowing stripes and chalk lines where it matters (Play, the pitch page, the hold, the booking, sign-in), quiet chalk-and-white elsewhere, and scoreboard figures for times, prices and references.
- Play: a fixtures-style date strip on the band, "Your next game" or "Finish paying" at the top, area chips and a sliding time-of-day control, clearer pitch cards with kick-off "tickets". When nothing is left today, a button takes you to the next day.
- Pitch page: venue band with directions, amenities, date strip, time tickets that pop when chosen, length cards, and a bottom bar that slides up with "Hold 5:00 pm".
- Checkout: four steps (Time held, Your details, Payment, Booked), a big countdown with a draining bar, payment methods with icons, a clear "waiting for your payment" state.
- The booking moment: the pitch lines draw themselves and a check lands on the centre spot, with a light buzz on phones. It plays once, only right after paying, and appears complete at once if the phone asks for less motion. The confirmation now opens at the top.
- My bookings as a fixtures list (Not finished, Coming up, Earlier) with date blocks.
- Venue: the day on a band with a scoreboard of bookings, paid and to collect; bookings as a timeline, coloured by what you need to do.
- Account: a list of your venues and actions. Buttons and cards respond to presses; the tab bar shows the current tab with a pill.
- Buttons now always announce their own label to screen readers (icons no longer leak into the name).

## 2026-11-02 — M4 Links and notifications (0.5.0)

- Notifications: turn them on from Account, the Venue tab ("Know when a player books") or the booked screen ("Get a reminder before kick-off"). New bookings for venue members; confirmations and kick-off reminders for players. Tapping one opens the booking. Signing out stops them on this phone.
- Push needs a real build: Expo Go and the web preview explain this instead. It switches on with the app's Expo project (`EAS_PROJECT_ID`, M5).
- Links: team links (`/b/PP-…`, shown as "Game on") and pitch links open in the app; unknown links get a friendly page. With `EXPO_PUBLIC_WEB_URL` set to the live https site, they become verified Android App Links and iOS Universal Links.

## 2026-11-02 — M3 Venue setup (0.4.0)

- Set up your venue: name, Lagos area, address, landmark, amenities and the first pitch; sent to PitchPadi for review. If the connection drops, the app checks whether the venue was saved and opens it.
- Manage venue: review status, "Get ready for bookings" steps, the review note with "Ask for another review", facilities and pitches with their state.
- Hours and prices: open or closed per day with 30-minute steppers, copy to weekdays or every day, prices for 1, 1½ and 2 hours, cancellation terms, publish and make private. Peak prices from the website are kept as they are.
- Venue details: edit name, area, address, landmark and amenities.
- Review venues (PitchPadi team): waiting, sent back and approved; call the owner; approve or send back with a note.
- Switches, checkboxes and radio buttons now report their state on every platform.

## 2026-11-02 — M2 Venue mode (0.3.0)

- Venue tab: the day's bookings by pitch with status (paid how, to collect, cancelled, being paid online), totals (bookings, paid, to collect), previous/next day and back to today, venue switcher; refreshes every minute and on opening.
- Add booking: pitch, day, kick-off (half hours, with times after midnight on request), length; the API checks the time as you choose and says what it found. Customer, how they booked, price (standard, editable), paid or not, note. Saving is safe to retry: it never records the same booking twice.
- Booking details: call or WhatsApp the customer, mark paid by cash, POS or transfer, cancel with a reason (venue-entered bookings that have not ended).

## 2026-11-02 — M1 review fixes (0.2.1)

- Signing in, signing out or an ended session clears all loaded data; Bookings and the venue calendar are cached per account.
- Bookings: "Not finished" holds and payments, tapping through to checkout; the tab refreshes each time it is opened.
- Checkout: opens a payment page only when there is one, and otherwise says so and retries with a new key.

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
