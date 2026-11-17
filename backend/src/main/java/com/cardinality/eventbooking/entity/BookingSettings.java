package com.cardinality.eventbooking.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "booking_settings",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_booking_settings_organizer", columnNames = {"organizer_id"})
        }
)
public class BookingSettings {

    public static final int DEFAULT_MAX_SEATS = 4;
    public static final int DEFAULT_HOLD_MINUTES = 5;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false, unique = true)
    private User organizer;

    @Column(name = "max_seats_per_booking", nullable = false)
    private Integer maxSeatsPerBooking = DEFAULT_MAX_SEATS;

    @Column(name = "hold_duration_minutes", nullable = false)
    private Integer holdDurationMinutes = DEFAULT_HOLD_MINUTES;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public BookingSettings() {
    }

    public BookingSettings(User organizer, Integer maxSeatsPerBooking, Integer holdDurationMinutes) {
        this.organizer = organizer;
        this.maxSeatsPerBooking = maxSeatsPerBooking;
        this.holdDurationMinutes = holdDurationMinutes;
        this.updatedAt = Instant.now();
    }

    @PrePersist
    @PreUpdate
    public void touch() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getOrganizer() {
        return organizer;
    }

    public void setOrganizer(User organizer) {
        this.organizer = organizer;
    }

    public Integer getMaxSeatsPerBooking() {
        return maxSeatsPerBooking;
    }

    public void setMaxSeatsPerBooking(Integer maxSeatsPerBooking) {
        this.maxSeatsPerBooking = maxSeatsPerBooking;
    }

    public Integer getHoldDurationMinutes() {
        return holdDurationMinutes;
    }

    public void setHoldDurationMinutes(Integer holdDurationMinutes) {
        this.holdDurationMinutes = holdDurationMinutes;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
