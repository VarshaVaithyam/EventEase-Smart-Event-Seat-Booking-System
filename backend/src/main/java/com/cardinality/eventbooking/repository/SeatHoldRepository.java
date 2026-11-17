package com.cardinality.eventbooking.repository;

import com.cardinality.eventbooking.entity.SeatHold;
import com.cardinality.eventbooking.enums.HoldStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SeatHoldRepository extends JpaRepository<SeatHold, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM SeatHold h JOIN FETCH h.user JOIN FETCH h.event WHERE h.id = :id")
    Optional<SeatHold> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM SeatHold h WHERE h.status = 'ACTIVE' AND h.expiresAt <= :now ORDER BY h.id ASC")
    List<SeatHold> findExpiredActiveHoldsForUpdate(@Param("now") Instant now);

    @Query("SELECT DISTINCT h FROM SeatHold h LEFT JOIN FETCH h.items hi LEFT JOIN FETCH hi.seat " +
           "WHERE h.user.id = :userId AND h.event.id = :eventId AND h.status = :status AND h.expiresAt > :now " +
           "ORDER BY h.createdAt DESC")
    List<SeatHold> findActiveHoldsForUserAndEvent(
            @Param("userId") Long userId,
            @Param("eventId") Long eventId,
            @Param("status") HoldStatus status,
            @Param("now") Instant now
    );

    void deleteByEventId(Long eventId);
}
