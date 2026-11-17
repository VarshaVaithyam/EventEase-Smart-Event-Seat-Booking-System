package com.cardinality.eventbooking.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "hold_items",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_hold_items_hold_seat", columnNames = {"hold_id", "seat_id"})
        },
        indexes = {
                @Index(name = "idx_hold_items_hold", columnList = "hold_id"),
                @Index(name = "idx_hold_items_seat", columnList = "seat_id")
        }
)
public class HoldItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hold_id", nullable = false)
    private SeatHold hold;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    public HoldItem() {
    }

    public HoldItem(SeatHold hold, Seat seat) {
        this.hold = hold;
        this.seat = seat;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public SeatHold getHold() {
        return hold;
    }

    public void setHold(SeatHold hold) {
        this.hold = hold;
    }

    public Seat getSeat() {
        return seat;
    }

    public void setSeat(Seat seat) {
        this.seat = seat;
    }
}
