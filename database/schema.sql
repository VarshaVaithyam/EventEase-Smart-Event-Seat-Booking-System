-- =============================================================================
-- EventEase: Event Seat Booking System with Double-Booking Prevention
-- PostgreSQL Normalized Schema DDL
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ORGANIZER', 'ATTENDEE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    category VARCHAR(100),
    description TEXT NOT NULL,
    venue VARCHAR(200) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_rows INTEGER NOT NULL CHECK (total_rows >= 1 AND total_rows <= 52),
    seats_per_row INTEGER NOT NULL CHECK (seats_per_row >= 1 AND seats_per_row <= 50),
    ticket_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    organizer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

CREATE TABLE IF NOT EXISTS booking_settings (
    id BIGSERIAL PRIMARY KEY,
    organizer_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    max_seats_per_booking INTEGER NOT NULL DEFAULT 4 CHECK (max_seats_per_booking >= 1 AND max_seats_per_booking <= 20),
    hold_duration_minutes INTEGER NOT NULL DEFAULT 5 CHECK (hold_duration_minutes >= 1 AND hold_duration_minutes <= 60),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seat_holds (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'CONFIRMED', 'EXPIRED', 'RELEASED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_status_expires ON seat_holds(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_seat_holds_user_event ON seat_holds(user_id, event_id);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    booking_reference VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    hold_id BIGINT UNIQUE REFERENCES seat_holds(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    checked_in_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);

CREATE TABLE IF NOT EXISTS seats (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    row_label VARCHAR(10) NOT NULL,
    seat_number INTEGER NOT NULL CHECK (seat_number >= 1),
    seat_code VARCHAR(16) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED')),
    held_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    current_hold_id BIGINT REFERENCES seat_holds(id) ON DELETE SET NULL,
    hold_expires_at TIMESTAMP WITH TIME ZONE,
    current_booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
    CONSTRAINT uq_seats_event_row_seat UNIQUE (event_id, row_label, seat_number),
    CONSTRAINT uq_seats_event_code UNIQUE (event_id, seat_code)
);

CREATE INDEX IF NOT EXISTS idx_seats_event_status ON seats(event_id, status);
CREATE INDEX IF NOT EXISTS idx_seats_hold_expires ON seats(status, hold_expires_at);

CREATE TABLE IF NOT EXISTS hold_items (
    id BIGSERIAL PRIMARY KEY,
    hold_id BIGINT NOT NULL REFERENCES seat_holds(id) ON DELETE CASCADE,
    seat_id BIGINT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    CONSTRAINT uq_hold_items_hold_seat UNIQUE (hold_id, seat_id)
);

CREATE INDEX IF NOT EXISTS idx_hold_items_hold ON hold_items(hold_id);
CREATE INDEX IF NOT EXISTS idx_hold_items_seat ON hold_items(seat_id);

CREATE TABLE IF NOT EXISTS booking_items (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id BIGINT NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    seat_code VARCHAR(16) NOT NULL,
    active_seat_id BIGINT UNIQUE REFERENCES seats(id) ON DELETE SET NULL,
    CONSTRAINT uq_booking_items_booking_seat UNIQUE (booking_id, seat_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_seat ON booking_items(seat_id);
