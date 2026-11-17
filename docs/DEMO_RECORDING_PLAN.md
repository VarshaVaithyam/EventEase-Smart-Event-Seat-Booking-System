# 5-Minute Backup Technical Demonstration Plan

Use this step-by-step script to record a crisp **<= 5 minute** technical walkthrough covering every assessment requirement.

---

## Pre-Recording Checklist (30 seconds before recording)
1. Ensure PostgreSQL, Spring Boot (`:8080`), and Vite React (`:5173`) are running.
2. Open two browser windows side by side:
   - **Window A (Normal Browser):** For Organizer & Attendee 1 (`attendee@eventease.dev`)
   - **Window B (Incognito Window):** For Attendee 2 (`priya@eventease.dev`)
3. Have a terminal tab ready at the repo root to run `mvn -f backend/pom.xml test`.

---

## Minute 0:00 – 1:15 | Organizer Login, AI Description Generator & Event Creation
1. In **Window A**, click **Sign In** -> click **Fill Organizer** (`organizer@eventease.dev`) -> **Sign In**.
2. Show the **Organizer Dashboard** (2 seeded events: 120 seats + 60 seats, 32 confirmed sample bookings) and **Event Analytics** (Recharts Pie & Bar charts).
3. Open **Booking Settings** to show PostgreSQL-backed `maxSeatsPerBooking = 4` and `holdDurationMinutes = 5`.
4. Navigate to **Create Event**:
   - Enter Name: `CARDINALITY TECH SUMMIT 2027`, Venue: `Main Auditorium`, Rows: `6`, Seats/Row: `8` (`48 seats`).
   - Click **Generate with AI** (`POST /api/ai/generate-event-description`) -> show the generated description populating the form.
   - Click **Create Event (48 Seats)** -> immediately land on the newly generated interactive auditorium seat map (`A1`–`F8`).

---

## Minute 1:15 – 2:45 | Attendee Seat Selection, 5-Minute Hold & Double-Booking Prevention
1. Sign out in **Window A**, click **Fill Attendee 1** (`attendee@eventease.dev`), and sign in.
2. In **Window B (Incognito)**, sign in as **Attendee 2** (`priya@eventease.dev`).
3. Open **TENSORA 2K26** (`Select Seats`) in both windows simultaneously:
   - Point out the visual legend: **Red** (Booked), **Green** (Available), **Blue** (Selected), **Orange** (Held).
4. In **Window A**, select seats `D1` and `D2` -> click **Hold Seats (5m Timer)**.
   - Show the live **05:00 countdown timer** starting in Window A.
   - Show **Window B** automatically refreshing within 4 seconds: `D1` and `D2` turn **Orange (Temporarily Held)** and cannot be clicked!

---

## Minute 2:45 – 4:00 | Booking Confirmation, QR Digital Ticket, History & Cancellation
1. In **Window A**, click **Confirm Booking Now**:
   - Show the **Booking Confirmation Page** with unique `EVE-XXXXXXXX` reference.
   - Click **View Digital QR Ticket** -> show the backend-signed QR code and click **Download Digital Ticket**.
2. Navigate to **My Bookings**:
   - Point out historical bookings, statuses, and seat badges.
   - Click **Cancel** on the newly created booking -> confirm in the modal.
   - Show status updating to `CANCELLED` (historical record preserved!) while in **Window B**, seats `D1` and `D2` immediately turn **Green (Available)** again!

---

## Minute 4:00 – 5:00 | Database-Level Concurrency Test Proof (`SELECT ... FOR UPDATE`)
1. Switch to the terminal and run:
   ```bash
   mvn -f backend/pom.xml test
   ```
2. Highlight `EventBookingIntegrationAndConcurrencyTest`:
   - `test13_concurrentRequestsForSameSeatInPostgreSQLOnlyOneSucceeds`: 10 concurrent threads fire simultaneous PostgreSQL transactions for the same seat (`CountDownLatch`); **1 succeeds** and **9 receive `409 Conflict`**.
   - `test08_expiredHoldReleaseUsingFixedClock` & `test14_rejectConfirmationAfterHoldExpiration`: Deterministic `MutableClock` advances +5m01s without sleeping.
   - Show `Tests run: 17, Failures: 0, Errors: 0 — BUILD SUCCESS`.
