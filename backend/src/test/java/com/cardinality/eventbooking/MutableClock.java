package com.cardinality.eventbooking;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Thread-safe mutable Java Clock used in integration tests to deterministically advance time
 * (e.g. +5 minutes + 1 second) and verify temporary hold expiration without Thread.sleep().
 */
public class MutableClock extends Clock {

    private final AtomicReference<Instant> currentInstant;
    private final ZoneId zone;

    public MutableClock(Instant initialInstant, ZoneId zone) {
        this.currentInstant = new AtomicReference<>(initialInstant);
        this.zone = zone;
    }

    public void setInstant(Instant newInstant) {
        this.currentInstant.set(newInstant);
    }

    public void advance(Duration duration) {
        this.currentInstant.updateAndGet(inst -> inst.plus(duration));
    }

    public void resetToNow() {
        this.currentInstant.set(Instant.now());
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return new MutableClock(this.currentInstant.get(), zone);
    }

    @Override
    public Instant instant() {
        return currentInstant.get();
    }
}
