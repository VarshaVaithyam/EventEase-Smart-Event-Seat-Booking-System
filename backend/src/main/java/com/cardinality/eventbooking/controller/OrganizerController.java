package com.cardinality.eventbooking.controller;

import com.cardinality.eventbooking.dto.BookingDtos.AnalyticsResponse;
import com.cardinality.eventbooking.dto.BookingDtos.BookingResponse;
import com.cardinality.eventbooking.dto.BookingDtos.CheckInVerifyRequest;
import com.cardinality.eventbooking.dto.BookingDtos.CheckInVerifyResponse;
import com.cardinality.eventbooking.dto.EventDtos.EventResponse;
import com.cardinality.eventbooking.security.CustomUserDetails;
import com.cardinality.eventbooking.service.AnalyticsService;
import com.cardinality.eventbooking.service.EventService;
import com.cardinality.eventbooking.service.SeatBookingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizer")
@PreAuthorize("hasRole('ORGANIZER')")
public class OrganizerController {

    private final EventService eventService;
    private final SeatBookingService seatBookingService;
    private final AnalyticsService analyticsService;

    public OrganizerController(
            EventService eventService,
            SeatBookingService seatBookingService,
            AnalyticsService analyticsService
    ) {
        this.eventService = eventService;
        this.seatBookingService = seatBookingService;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/events")
    public ResponseEntity<List<EventResponse>> getMyEvents(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(eventService.listOrganizerEvents(userDetails.getId()));
    }

    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getAllMyOrganizerBookings(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(seatBookingService.getAllOrganizerBookings(userDetails.getId()));
    }

    @GetMapping("/events/{id}/bookings")
    public ResponseEntity<List<BookingResponse>> getEventBookings(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(seatBookingService.getEventBookingsForOrganizer(userDetails.getId(), id));
    }

    @PostMapping("/tickets/verify")
    public ResponseEntity<CheckInVerifyResponse> verifyAndCheckInTicket(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CheckInVerifyRequest request
    ) {
        return ResponseEntity.ok(seatBookingService.verifyAndCheckInTicket(userDetails.getId(), request));
    }

    @GetMapping("/analytics")
    public ResponseEntity<AnalyticsResponse> getAnalytics(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(analyticsService.getOrganizerAnalytics(userDetails.getId()));
    }
}
