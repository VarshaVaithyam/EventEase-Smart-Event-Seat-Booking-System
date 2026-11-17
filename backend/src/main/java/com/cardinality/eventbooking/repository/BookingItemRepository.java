package com.cardinality.eventbooking.repository;

import com.cardinality.eventbooking.entity.BookingItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookingItemRepository extends JpaRepository<BookingItem, Long> {

    @Query("SELECT bi FROM BookingItem bi JOIN FETCH bi.seat WHERE bi.booking.id = :bookingId ORDER BY bi.seat.id ASC")
    List<BookingItem> findByBookingIdWithSeats(@Param("bookingId") Long bookingId);
}
