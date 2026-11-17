package com.cardinality.eventbooking.repository;

import com.cardinality.eventbooking.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long> {

    @Query("SELECT e FROM Event e JOIN FETCH e.organizer ORDER BY e.eventDate ASC")
    List<Event> findAllWithOrganizerOrderByEventDateAsc();

    @Query("SELECT e FROM Event e JOIN FETCH e.organizer WHERE e.organizer.id = :organizerId ORDER BY e.eventDate ASC")
    List<Event> findByOrganizerIdOrderByEventDateAsc(@Param("organizerId") Long organizerId);

    @Query("SELECT e FROM Event e JOIN FETCH e.organizer WHERE e.id = :id")
    Optional<Event> findByIdWithOrganizer(@Param("id") Long id);
}
