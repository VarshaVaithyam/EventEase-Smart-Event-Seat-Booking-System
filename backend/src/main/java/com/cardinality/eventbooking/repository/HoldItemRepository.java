package com.cardinality.eventbooking.repository;

import com.cardinality.eventbooking.entity.HoldItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface HoldItemRepository extends JpaRepository<HoldItem, Long> {

    @Query("SELECT hi FROM HoldItem hi JOIN FETCH hi.seat WHERE hi.hold.id = :holdId ORDER BY hi.seat.id ASC")
    List<HoldItem> findByHoldIdWithSeats(@Param("holdId") Long holdId);
}
