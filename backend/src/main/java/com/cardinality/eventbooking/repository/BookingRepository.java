package com.cardinality.eventbooking.repository;

import com.cardinality.eventbooking.entity.Booking;
import com.cardinality.eventbooking.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b JOIN FETCH b.user JOIN FETCH b.event e JOIN FETCH e.organizer WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b JOIN FETCH b.user JOIN FETCH b.event e JOIN FETCH e.organizer WHERE b.bookingReference = :reference")
    Optional<Booking> findByBookingReferenceForUpdate(@Param("reference") String reference);

    @Query("SELECT DISTINCT b FROM Booking b " +
           "JOIN FETCH b.user " +
           "JOIN FETCH b.event e " +
           "JOIN FETCH e.organizer " +
           "LEFT JOIN FETCH b.items bi " +
           "LEFT JOIN FETCH bi.seat " +
           "WHERE e.organizer.id = :organizerId " +
           "ORDER BY b.createdAt DESC")
    List<Booking> findByOrganizerIdWithDetailsOrderByCreatedAtDesc(@Param("organizerId") Long organizerId);

    @Query("SELECT DISTINCT b FROM Booking b " +
           "JOIN FETCH b.user " +
           "JOIN FETCH b.event e " +
           "JOIN FETCH e.organizer " +
           "LEFT JOIN FETCH b.items bi " +
           "LEFT JOIN FETCH bi.seat " +
           "WHERE b.id = :id")
    Optional<Booking> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT DISTINCT b FROM Booking b " +
           "JOIN FETCH b.user " +
           "JOIN FETCH b.event e " +
           "JOIN FETCH e.organizer " +
           "LEFT JOIN FETCH b.items bi " +
           "LEFT JOIN FETCH bi.seat " +
           "WHERE b.bookingReference = :reference")
    Optional<Booking> findByBookingReferenceWithDetails(@Param("reference") String reference);

    @Query("SELECT DISTINCT b FROM Booking b " +
           "JOIN FETCH b.user " +
           "JOIN FETCH b.event e " +
           "JOIN FETCH e.organizer " +
           "LEFT JOIN FETCH b.items bi " +
           "LEFT JOIN FETCH bi.seat " +
           "WHERE b.user.id = :userId " +
           "ORDER BY b.createdAt DESC")
    List<Booking> findByUserIdWithDetailsOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query("SELECT DISTINCT b FROM Booking b " +
           "JOIN FETCH b.user " +
           "JOIN FETCH b.event e " +
           "LEFT JOIN FETCH b.items bi " +
           "LEFT JOIN FETCH bi.seat " +
           "WHERE b.event.id = :eventId " +
           "ORDER BY b.createdAt DESC")
    List<Booking> findByEventIdWithDetailsOrderByCreatedAtDesc(@Param("eventId") Long eventId);

    boolean existsByHoldId(Long holdId);

    boolean existsByEventId(Long eventId);

    long countByEventIdAndStatus(Long eventId, BookingStatus status);

    long countByEventOrganizerIdAndStatus(Long organizerId, BookingStatus status);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.event.id = :eventId AND b.status = 'CONFIRMED' AND b.checkedInAt IS NOT NULL")
    long countCheckedInByEventId(@Param("eventId") Long eventId);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.event.organizer.id = :organizerId AND b.status = 'CONFIRMED' AND b.checkedInAt IS NOT NULL")
    long countCheckedInByOrganizerId(@Param("organizerId") Long organizerId);
}
