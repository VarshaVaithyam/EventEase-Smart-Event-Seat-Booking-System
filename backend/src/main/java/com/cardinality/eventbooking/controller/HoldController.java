package com.cardinality.eventbooking.controller;

import com.cardinality.eventbooking.dto.BookingDtos.HoldRequest;
import com.cardinality.eventbooking.dto.BookingDtos.HoldResponse;
import com.cardinality.eventbooking.security.CustomUserDetails;
import com.cardinality.eventbooking.service.SeatBookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/holds")
public class HoldController {

    private final SeatBookingService seatBookingService;

    public HoldController(SeatBookingService seatBookingService) {
        this.seatBookingService = seatBookingService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ATTENDEE')")
    public ResponseEntity<HoldResponse> createHold(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody HoldRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(seatBookingService.createTemporaryHold(userDetails.getId(), request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ATTENDEE')")
    public ResponseEntity<Map<String, String>> releaseHold(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        seatBookingService.releaseHold(userDetails.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Temporary hold released"));
    }
}
