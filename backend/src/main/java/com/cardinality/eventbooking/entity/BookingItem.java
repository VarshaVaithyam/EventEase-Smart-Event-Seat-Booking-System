package com.cardinality.eventbooking.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "booking_items",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_booking_items_booking_seat", columnNames = {"booking_id", "seat_id"}),
                @UniqueConstraint(name = "uq_booking_items_active_seat", columnNames = {"active_seat_id"})
        },
        indexes = {
                @Index(name = "idx_booking_items_booking", columnList = "booking_id"),
                @Index(name = "idx_booking_items_seat", columnList = "seat_id")
        }
)
public class BookingItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @Column(name = "seat_code", nullable = false, length = 16)
    private String seatCode;

    /**
     * Database-level active allocation guard:
     * Populated with seat.getId() while the booking is CONFIRMED, and set to NULL when CANCELLED.
     * PostgreSQL allows multiple NULLs in a UNIQUE column, so historical cancelled booking_items
     * are preserved forever while two active CONFIRMED bookings can NEVER reference the same seat!
     */
    @Column(name = "active_seat_id", unique = true)
    private Long activeSeatId;

    public BookingItem() {
    }

    public BookingItem(Booking booking, Seat seat) {
        this.booking = booking;
        this.seat = seat;
        this.seatCode = seat.getSeatCode();
        this.activeSeatId = seat.getId();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Booking getBooking() {
        return booking;
    }

    public void setBooking(Booking booking) {
        this.booking = booking;
    }

    public Seat getSeat() {
        return seat;
    }

    public void setSeat(Seat seat) {
        this.seat = seat;
    }

    public String getSeatCode() {
        return seatCode;
    }

    public void setSeatCode(String seatCode) {
        this.seatCode = seatCode;
    }

    public Long getActiveSeatId() {
        return activeSeatId;
    }

    public void setActiveSeatId(Long activeSeatId) {
        this.activeSeatId = activeSeatId;
    }
}
