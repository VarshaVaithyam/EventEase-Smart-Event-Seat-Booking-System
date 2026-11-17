package com.cardinality.eventbooking.entity;

import com.cardinality.eventbooking.enums.SeatStatus;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "seats",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_seats_event_row_seat", columnNames = {"event_id", "row_label", "seat_number"}),
                @UniqueConstraint(name = "uq_seats_event_code", columnNames = {"event_id", "seat_code"})
        },
        indexes = {
                @Index(name = "idx_seats_event_status", columnList = "event_id, status"),
                @Index(name = "idx_seats_hold_expires", columnList = "status, hold_expires_at")
        }
)
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(name = "row_label", nullable = false, length = 10)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;

    @Column(name = "seat_code", nullable = false, length = 16)
    private String seatCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SeatStatus status = SeatStatus.AVAILABLE;

    @Column(name = "held_by_user_id")
    private Long heldByUserId;

    @Column(name = "current_hold_id")
    private Long currentHoldId;

    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;

    @Column(name = "current_booking_id")
    private Long currentBookingId;

    public Seat() {
    }

    public Seat(Event event, String rowLabel, Integer seatNumber, String seatCode) {
        this.event = event;
        this.rowLabel = rowLabel;
        this.seatNumber = seatNumber;
        this.seatCode = seatCode;
        this.status = SeatStatus.AVAILABLE;
    }

    public void markHeld(Long userId, Long holdId, Instant expiresAt) {
        this.status = SeatStatus.HELD;
        this.heldByUserId = userId;
        this.currentHoldId = holdId;
        this.holdExpiresAt = expiresAt;
    }

    public void markBooked(Long bookingId) {
        this.status = SeatStatus.BOOKED;
        this.currentBookingId = bookingId;
        this.heldByUserId = null;
        this.currentHoldId = null;
        this.holdExpiresAt = null;
    }

    public void releaseToAvailable() {
        this.status = SeatStatus.AVAILABLE;
        this.heldByUserId = null;
        this.currentHoldId = null;
        this.holdExpiresAt = null;
        this.currentBookingId = null;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public String getRowLabel() {
        return rowLabel;
    }

    public void setRowLabel(String rowLabel) {
        this.rowLabel = rowLabel;
    }

    public Integer getSeatNumber() {
        return seatNumber;
    }

    public void setSeatNumber(Integer seatNumber) {
        this.seatNumber = seatNumber;
    }

    public String getSeatCode() {
        return seatCode;
    }

    public void setSeatCode(String seatCode) {
        this.seatCode = seatCode;
    }

    public SeatStatus getStatus() {
        return status;
    }

    public void setStatus(SeatStatus status) {
        this.status = status;
    }

    public Long getHeldByUserId() {
        return heldByUserId;
    }

    public void setHeldByUserId(Long heldByUserId) {
        this.heldByUserId = heldByUserId;
    }

    public Long getCurrentHoldId() {
        return currentHoldId;
    }

    public void setCurrentHoldId(Long currentHoldId) {
        this.currentHoldId = currentHoldId;
    }

    public Instant getHoldExpiresAt() {
        return holdExpiresAt;
    }

    public void setHoldExpiresAt(Instant holdExpiresAt) {
        this.holdExpiresAt = holdExpiresAt;
    }

    public Long getCurrentBookingId() {
        return currentBookingId;
    }

    public void setCurrentBookingId(Long currentBookingId) {
        this.currentBookingId = currentBookingId;
    }
}
