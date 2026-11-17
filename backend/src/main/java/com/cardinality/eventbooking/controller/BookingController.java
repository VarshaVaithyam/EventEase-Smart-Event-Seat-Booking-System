package com.cardinality.eventbooking.controller;

import com.cardinality.eventbooking.dto.BookingDtos.*;
import com.cardinality.eventbooking.security.CustomUserDetails;
import com.cardinality.eventbooking.service.SeatBookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final SeatBookingService seatBookingService;

    public BookingController(SeatBookingService seatBookingService) {
        this.seatBookingService = seatBookingService;
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasRole('ATTENDEE')")
    public ResponseEntity<BookingResponse> confirmBooking(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ConfirmBookingRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(seatBookingService.confirmBooking(userDetails.getId(), request));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('ATTENDEE')")
    public ResponseEntity<List<BookingResponse>> getMyBookings(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(seatBookingService.getMyBookings(userDetails.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBookingById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                seatBookingService.getBookingDetails(userDetails.getId(), userDetails.getRole(), id)
        );
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ATTENDEE')")
    public ResponseEntity<BookingResponse> cancelBooking(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(seatBookingService.cancelBooking(userDetails.getId(), id));
    }

    @GetMapping("/{id}/ticket")
    public ResponseEntity<TicketResponse> getBookingTicket(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                seatBookingService.getBookingTicket(userDetails.getId(), userDetails.getRole(), id)
        );
    }
}
