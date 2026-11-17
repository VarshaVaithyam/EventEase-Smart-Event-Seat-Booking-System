package com.cardinality.eventbooking.repository;

import com.cardinality.eventbooking.entity.Seat;
import com.cardinality.eventbooking.enums.SeatStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByEventIdOrderByIdAsc(Long eventId);

    /**
     * Acquires PostgreSQL row-level pessimistic write locks (SELECT ... FOR UPDATE)
     * in deterministic ascending ID order to prevent deadlocks when two concurrent
     * transactions request overlapping multi-seat sets (e.g. [A1, A2] vs [A2, A1]).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Seat s WHERE s.id IN :seatIds ORDER BY s.id ASC")
    List<Seat> findAllByIdInForUpdate(@Param("seatIds") Collection<Long> seatIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Seat s WHERE s.currentHoldId = :holdId ORDER BY s.id ASC")
    List<Seat> findByCurrentHoldIdForUpdate(@Param("holdId") Long holdId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Seat s WHERE s.currentBookingId = :bookingId ORDER BY s.id ASC")
    List<Seat> findByCurrentBookingIdForUpdate(@Param("bookingId") Long bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Seat s WHERE s.status = 'HELD' AND s.holdExpiresAt <= :now ORDER BY s.id ASC")
    List<Seat> findExpiredHeldSeatsForUpdate(@Param("now") Instant now);

    long countByEventId(Long eventId);

    long countByEventIdAndStatus(Long eventId, SeatStatus status);

    boolean existsByEventIdAndStatusIn(Long eventId, Collection<SeatStatus> statuses);

    void deleteByEventId(Long eventId);
}
