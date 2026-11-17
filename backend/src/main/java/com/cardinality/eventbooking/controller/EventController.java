package com.cardinality.eventbooking.controller;

import com.cardinality.eventbooking.dto.BookingDtos.SeatMapResponse;
import com.cardinality.eventbooking.dto.EventDtos.*;
import com.cardinality.eventbooking.security.CustomUserDetails;
import com.cardinality.eventbooking.service.EventService;
import com.cardinality.eventbooking.service.SeatBookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;
    private final SeatBookingService seatBookingService;

    public EventController(EventService eventService, SeatBookingService seatBookingService) {
        this.eventService = eventService;
        this.seatBookingService = seatBookingService;
    }

    @GetMapping
    public ResponseEntity<List<EventResponse>> listEvents() {
        return ResponseEntity.ok(eventService.listAllEvents());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEvent(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    @GetMapping("/{id}/seats")
    public ResponseEntity<SeatMapResponse> getEventSeats(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long currentUserId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(seatBookingService.getEventSeatMap(id, currentUserId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<EventResponse> createEvent(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateEventRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.createEvent(userDetails.getId(), request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<EventResponse> updateEvent(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateEventRequest request
    ) {
        return ResponseEntity.ok(eventService.updateEvent(userDetails.getId(), id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<Map<String, String>> deleteEvent(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        eventService.deleteEvent(userDetails.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Event deleted successfully"));
    }
}
