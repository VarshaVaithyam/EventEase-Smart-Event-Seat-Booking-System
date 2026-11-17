package com.cardinality.eventbooking.controller;

import com.cardinality.eventbooking.dto.BookingDtos.SettingsResponse;
import com.cardinality.eventbooking.dto.BookingDtos.SettingsUpdateRequest;
import com.cardinality.eventbooking.security.CustomUserDetails;
import com.cardinality.eventbooking.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@PreAuthorize("hasRole('ORGANIZER')")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public ResponseEntity<SettingsResponse> getSettings(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(settingsService.getSettings(userDetails.getId()));
    }

    @PutMapping
    public ResponseEntity<SettingsResponse> updateSettings(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SettingsUpdateRequest request
    ) {
        return ResponseEntity.ok(settingsService.updateSettings(userDetails.getId(), request));
    }
}
