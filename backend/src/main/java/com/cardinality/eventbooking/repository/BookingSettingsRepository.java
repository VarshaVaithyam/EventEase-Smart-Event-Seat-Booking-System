package com.cardinality.eventbooking.repository;

import com.cardinality.eventbooking.entity.BookingSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookingSettingsRepository extends JpaRepository<BookingSettings, Long> {
    Optional<BookingSettings> findByOrganizerId(Long organizerId);
}
