package com.cardinality.eventbooking.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;

public final class EventDtos {

    private EventDtos() {
    }

    public record CreateEventRequest(
            @NotBlank(message = "Event name cannot be empty")
            @Size(max = 180, message = "Event name must be at most 180 characters")
            String name,

            @Size(max = 100, message = "Category must be at most 100 characters")
            String category,

            @NotBlank(message = "Event description cannot be empty")
            @Size(max = 5000, message = "Description must be at most 5000 characters")
            String description,

            @NotBlank(message = "Venue cannot be empty")
            @Size(max = 200, message = "Venue must be at most 200 characters")
            String venue,

            @NotNull(message = "Event date is required")
            Instant eventDate,

            @NotNull(message = "Number of rows is required")
            @Min(value = 1, message = "Number of rows must be at least 1")
            @Max(value = 26, message = "Number of rows cannot exceed 26")
            Integer totalRows,

            @NotNull(message = "Number of seats per row is required")
            @Min(value = 1, message = "Number of seats per row must be at least 1")
            @Max(value = 30, message = "Number of seats per row cannot exceed 30")
            Integer seatsPerRow,

            @DecimalMin(value = "0.0", inclusive = true, message = "Ticket price cannot be negative")
            BigDecimal ticketPrice
    ) {}

    public record UpdateEventRequest(
            @NotBlank(message = "Event name cannot be empty")
            @Size(max = 180, message = "Event name must be at most 180 characters")
            String name,

            @Size(max = 100, message = "Category must be at most 100 characters")
            String category,

            @NotBlank(message = "Event description cannot be empty")
            @Size(max = 5000, message = "Description must be at most 5000 characters")
            String description,

            @NotBlank(message = "Venue cannot be empty")
            @Size(max = 200, message = "Venue must be at most 200 characters")
            String venue,

            @NotNull(message = "Event date is required")
            Instant eventDate,

            @DecimalMin(value = "0.0", inclusive = true, message = "Ticket price cannot be negative")
            BigDecimal ticketPrice
    ) {}

    public record EventResponse(
            Long id,
            String name,
            String category,
            String description,
            String venue,
            Instant eventDate,
            Integer totalRows,
            Integer seatsPerRow,
            Integer totalSeats,
            Long availableSeats,
            Long heldSeats,
            Long bookedSeats,
            BigDecimal ticketPrice,
            Long organizerId,
            String organizerName,
            Integer maxSeatsPerBooking,
            Integer holdDurationMinutes,
            Instant createdAt
    ) {}
}
