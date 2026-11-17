package com.cardinality.eventbooking.controller;

import com.cardinality.eventbooking.dto.BookingDtos.AiDescriptionRequest;
import com.cardinality.eventbooking.dto.BookingDtos.AiDescriptionResponse;
import com.cardinality.eventbooking.service.GeminiAiService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@PreAuthorize("hasRole('ORGANIZER')")
public class AiController {

    private final GeminiAiService geminiAiService;

    public AiController(GeminiAiService geminiAiService) {
        this.geminiAiService = geminiAiService;
    }

    @PostMapping("/generate-event-description")
    public ResponseEntity<AiDescriptionResponse> generateDescription(
            @Valid @RequestBody AiDescriptionRequest request
    ) {
        return ResponseEntity.ok(geminiAiService.generateEventDescription(request));
    }
}
