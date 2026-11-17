package com.cardinality.eventbooking.dto;

import com.cardinality.eventbooking.enums.BookingStatus;
import com.cardinality.eventbooking.enums.HoldStatus;
import com.cardinality.eventbooking.enums.SeatStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class BookingDtos {

    private BookingDtos() {
    }

    public record SeatResponse(
            Long id,
            Long eventId,
            String rowLabel,
            Integer seatNumber,
            String seatCode,
            SeatStatus status,
            Boolean heldByCurrentUser,
            Long currentHoldId,
            Instant holdExpiresAt
    ) {}

    public record SeatMapResponse(
            Long eventId,
            String eventName,
            String venue,
            Instant eventDate,
            Integer totalRows,
            Integer seatsPerRow,
            Integer totalSeats,
            Long availableSeats,
            Long heldSeats,
            Long bookedSeats,
            Integer maxSeatsPerBooking,
            Integer holdDurationMinutes,
            BigDecimal ticketPrice,
            HoldResponse activeUserHold,
            List<SeatResponse> seats
    ) {}

    public record HoldRequest(
            @NotNull(message = "Event ID is required")
            Long eventId,

            @NotEmpty(message = "At least one seat must be selected")
            List<@NotNull(message = "Seat ID cannot be null") Long> seatIds
    ) {}

    public record HoldResponse(
            Long holdId,
            Long eventId,
            String eventName,
            String venue,
            Instant eventDate,
            Long userId,
            HoldStatus status,
            Instant createdAt,
            Instant expiresAt,
            long remainingSeconds,
            List<Long> seatIds,
            List<String> seatCodes,
            BigDecimal totalAmount
    ) {}

    public record ConfirmBookingRequest(
            @NotNull(message = "Hold ID is required to confirm booking")
            Long holdId
    ) {}

    public record BookingResponse(
            Long id,
            String bookingReference,
            Long eventId,
            String eventName,
            String eventCategory,
            String venue,
            Instant eventDate,
            Long attendeeId,
            String attendeeName,
            String attendeeEmail,
            BookingStatus status,
            List<Long> seatIds,
            List<String> seats,
            BigDecimal ticketPrice,
            BigDecimal totalAmount,
            Instant createdAt,
            Instant cancelledAt,
            Instant checkedInAt
    ) {}

    public record SettingsUpdateRequest(
            @NotNull(message = "Maximum seats per booking is required")
            @Min(value = 1, message = "Maximum seats per booking must be at least 1")
            @Max(value = 20, message = "Maximum seats per booking cannot exceed 20")
            Integer maxSeatsPerBooking,

            @NotNull(message = "Hold duration in minutes is required")
            @Min(value = 1, message = "Hold duration must be at least 1 minute")
            @Max(value = 60, message = "Hold duration cannot exceed 60 minutes")
            Integer holdDurationMinutes
    ) {}

    public record SettingsResponse(
            Long id,
            Long organizerId,
            Integer maxSeatsPerBooking,
            Integer holdDurationMinutes,
            Instant updatedAt
    ) {}

    public record EventStatItem(
            Long eventId,
            String eventName,
            String venue,
            Instant eventDate,
            long totalSeats,
            long availableSeats,
            long heldSeats,
            long bookedSeats,
            long confirmedBookings,
            long cancelledBookings,
            double bookingPercentage,
            BigDecimal revenue,
            long checkedInBookings
    ) {}

    public record AnalyticsResponse(
            long totalEvents,
            long totalSeats,
            long totalConfirmedBookings,
            long totalBookedSeats,
            long availableSeats,
            long currentlyHeldSeats,
            double bookingPercentage,
            BigDecimal totalRevenue,
            long totalCheckedInBookings,
            List<EventStatItem> eventStats
    ) {}

    public record AiDescriptionRequest(
            @jakarta.validation.constraints.NotBlank(message = "Event name is required")
            String eventName,
            String category,
            String venue,
            String keywords
    ) {}

    public record AiDescriptionResponse(
            String description,
            String source
    ) {}

    public record TicketResponse(
            Long bookingId,
            String bookingReference,
            BookingStatus status,
            String eventName,
            String eventCategory,
            String venue,
            Instant eventDate,
            String attendeeName,
            String attendeeEmail,
            List<String> seats,
            BigDecimal totalAmount,
            Instant issuedAt,
            Instant checkedInAt,
            String verificationHash,
            String qrPayload,
            String qrCodeDataUri
    ) {}

    public record CheckInVerifyRequest(
            @jakarta.validation.constraints.NotBlank(message = "Ticket QR payload or booking reference is required")
            String code,
            Boolean markCheckedIn
    ) {}

    public record CheckInVerifyResponse(
            boolean valid,
            boolean signatureVerified,
            boolean alreadyCheckedIn,
            String outcome,
            String message,
            Long bookingId,
            String bookingReference,
            BookingStatus status,
            Long eventId,
            String eventName,
            String venue,
            Instant eventDate,
            String attendeeName,
            String attendeeEmail,
            List<String> seats,
            BigDecimal totalAmount,
            Instant bookedAt,
            Instant checkedInAt
    ) {}
}
