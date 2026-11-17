package com.cardinality.eventbooking.service;

import com.cardinality.eventbooking.dto.BookingDtos.*;
import com.cardinality.eventbooking.entity.*;
import com.cardinality.eventbooking.enums.BookingStatus;
import com.cardinality.eventbooking.enums.HoldStatus;
import com.cardinality.eventbooking.enums.Role;
import com.cardinality.eventbooking.enums.SeatStatus;
import com.cardinality.eventbooking.exception.*;
import com.cardinality.eventbooking.repository.*;
import com.cardinality.eventbooking.util.QrCodeGenerator;
import com.cardinality.eventbooking.util.SeatLabelGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class SeatBookingService {

    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final HoldItemRepository holdItemRepository;
    private final BookingRepository bookingRepository;
    private final BookingItemRepository bookingItemRepository;
    private final UserRepository userRepository;
    private final SettingsService settingsService;
    private final HoldExpirationService holdExpirationService;
    private final Clock clock;
    private final String ticketSigningSecret;

    public SeatBookingService(
            EventRepository eventRepository,
            SeatRepository seatRepository,
            SeatHoldRepository seatHoldRepository,
            HoldItemRepository holdItemRepository,
            BookingRepository bookingRepository,
            BookingItemRepository bookingItemRepository,
            UserRepository userRepository,
            SettingsService settingsService,
            HoldExpirationService holdExpirationService,
            Clock clock,
            @Value("${app.jwt.secret}") String ticketSigningSecret
    ) {
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.holdItemRepository = holdItemRepository;
        this.bookingRepository = bookingRepository;
        this.bookingItemRepository = bookingItemRepository;
        this.userRepository = userRepository;
        this.settingsService = settingsService;
        this.holdExpirationService = holdExpirationService;
        this.clock = clock;
        this.ticketSigningSecret = ticketSigningSecret;
    }

    /**
     * Retrieves the complete interactive seat map for an event after cleaning up any expired holds.
     */
    @Transactional
    public SeatMapResponse getEventSeatMap(Long eventId, Long currentUserId) {
        holdExpirationService.releaseExpiredHolds();

        Event event = eventRepository.findByIdWithOrganizer(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + eventId));
        BookingSettings settings = settingsService.getOrCreateEntityForOrganizer(event.getOrganizer().getId());
        List<Seat> seats = seatRepository.findByEventIdOrderByIdAsc(eventId);

        long available = 0;
        long held = 0;
        long booked = 0;
        List<SeatResponse> seatResponses = new ArrayList<>(seats.size());

        for (Seat s : seats) {
            if (s.getStatus() == SeatStatus.AVAILABLE) available++;
            else if (s.getStatus() == SeatStatus.HELD) held++;
            else if (s.getStatus() == SeatStatus.BOOKED) booked++;

            boolean heldByCurrent = currentUserId != null
                    && s.getStatus() == SeatStatus.HELD
                    && currentUserId.equals(s.getHeldByUserId());

            seatResponses.add(new SeatResponse(
                    s.getId(),
                    eventId,
                    s.getRowLabel(),
                    s.getSeatNumber(),
                    s.getSeatCode(),
                    s.getStatus(),
                    heldByCurrent,
                    heldByCurrent ? s.getCurrentHoldId() : null,
                    s.getHoldExpiresAt()
            ));
        }

        HoldResponse activeUserHold = null;
        if (currentUserId != null) {
            Instant now = Instant.now(clock);
            List<SeatHold> activeHolds = seatHoldRepository.findActiveHoldsForUserAndEvent(
                    currentUserId, eventId, HoldStatus.ACTIVE, now
            );
            if (!activeHolds.isEmpty()) {
                SeatHold h = activeHolds.get(0);
                List<Seat> hSeats = h.getItems().stream()
                        .map(HoldItem::getSeat)
                        .sorted(Comparator.comparing(Seat::getId))
                        .toList();
                activeUserHold = toHoldResponse(h, event, hSeats, now);
            }
        }

        return new SeatMapResponse(
                event.getId(),
                event.getName(),
                event.getVenue(),
                event.getEventDate(),
                event.getTotalRows(),
                event.getSeatsPerRow(),
                event.getTotalCapacity(),
                available,
                held,
                booked,
                settings.getMaxSeatsPerBooking(),
                settings.getHoldDurationMinutes(),
                event.getTicketPrice(),
                activeUserHold,
                seatResponses
        );
    }

    /**
     * DOUBLE-BOOKING PREVENTION WORKFLOW (Database-Level Concurrency Control):
     * 1. Runs inside @Transactional PostgreSQL transaction.
     * 2. Deduplicates and sorts requested seatIds ascending.
     * 3. Acquires PostgreSQL PESSIMISTIC_WRITE row locks (SELECT ... FOR UPDATE ORDER BY id ASC)
     *    to serialize concurrent attempts on the same seat(s) and eliminate multi-seat deadlocks.
     * 4. Validates attendee role, event existence, and organizer's maxSeatsPerBooking setting.
     * 5. Inline-expires any stale hold on the locked seat rows if hold_expires_at <= now(clock).
     * 6. Verifies all requested seats belong to the target event and are AVAILABLE (or held by no one).
     * 7. Atomically creates SeatHold + HoldItems and transitions locked seats to HELD.
     */
    @Transactional
    public HoldResponse createTemporaryHold(Long attendeeId, HoldRequest request) {
        User attendee = userRepository.findById(attendeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendee account not found"));
        if (attendee.getRole() != Role.ATTENDEE) {
            throw new ForbiddenOperationException("Only attendees can hold and book seats");
        }

        Event event = eventRepository.findByIdWithOrganizer(request.eventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + request.eventId()));

        Instant now = Instant.now(clock);
        if (!event.getEventDate().isAfter(now)) {
            throw new BadRequestException("Cannot reserve seats for a past event");
        }

        // Deduplicate & sort seat IDs deterministically to prevent deadlocks
        List<Long> sortedSeatIds = request.seatIds().stream()
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .toList();

        if (sortedSeatIds.isEmpty()) {
            throw new BadRequestException("At least one valid seat must be selected");
        }

        BookingSettings settings = settingsService.getOrCreateEntityForOrganizer(event.getOrganizer().getId());
        int maxSeats = settings.getMaxSeatsPerBooking();
        if (sortedSeatIds.size() > maxSeats) {
            throw new BadRequestException("Cannot select more than " + maxSeats + " seats per booking for this event");
        }

        // Check existing active holds for this user on the same event so total held seats don't bypass max limit
        List<SeatHold> existingUserHolds = seatHoldRepository.findActiveHoldsForUserAndEvent(
                attendeeId, event.getId(), HoldStatus.ACTIVE, now
        );
        int alreadyHeldCount = existingUserHolds.stream()
                .mapToInt(h -> h.getItems().size())
                .sum();
        if (alreadyHeldCount + sortedSeatIds.size() > maxSeats) {
            throw new BadRequestException(
                    "You already have " + alreadyHeldCount + " seat(s) held. Maximum seats per booking is " + maxSeats
            );
        }

        // Acquire PostgreSQL SELECT ... FOR UPDATE locks in ascending seat ID order
        List<Seat> lockedSeats = seatRepository.findAllByIdInForUpdate(sortedSeatIds);
        if (lockedSeats.size() != sortedSeatIds.size()) {
            throw new ResourceNotFoundException("One or more requested seats do not exist");
        }

        List<String> unavailableCodes = new ArrayList<>();
        Set<Long> staleHoldIdsToExpire = new HashSet<>();

        for (Seat seat : lockedSeats) {
            if (!seat.getEvent().getId().equals(event.getId())) {
                throw new BadRequestException("Seat " + seat.getSeatCode() + " does not belong to the specified event");
            }

            // Inline expiration of stale holds on locked seat rows
            if (seat.getStatus() == SeatStatus.HELD
                    && seat.getHoldExpiresAt() != null
                    && !seat.getHoldExpiresAt().isAfter(now)) {
                if (seat.getCurrentHoldId() != null) {
                    staleHoldIdsToExpire.add(seat.getCurrentHoldId());
                }
                seat.releaseToAvailable();
            }

            if (seat.getStatus() != SeatStatus.AVAILABLE) {
                unavailableCodes.add(seat.getSeatCode() + " (" + seat.getStatus() + ")");
            }
        }

        // Mark any inline-expired SeatHold records as EXPIRED
        for (Long staleHoldId : staleHoldIdsToExpire) {
            seatHoldRepository.findByIdForUpdate(staleHoldId).ifPresent(stale -> {
                if (stale.getStatus() == HoldStatus.ACTIVE && !stale.getExpiresAt().isAfter(now)) {
                    stale.setStatus(HoldStatus.EXPIRED);
                    seatHoldRepository.save(stale);
                }
            });
        }

        if (!unavailableCodes.isEmpty()) {
            throw new SeatConflictException(
                    "Seat(s) unavailable for reservation: " + String.join(", ", unavailableCodes)
            );
        }

        Instant expiresAt = now.plus(settings.getHoldDurationMinutes(), ChronoUnit.MINUTES);

        SeatHold hold = new SeatHold();
        hold.setUser(attendee);
        hold.setEvent(event);
        hold.setCreatedAt(now);
        hold.setExpiresAt(expiresAt);
        hold.setStatus(HoldStatus.ACTIVE);
        hold = seatHoldRepository.save(hold);

        for (Seat seat : lockedSeats) {
            seat.markHeld(attendeeId, hold.getId(), expiresAt);
            hold.addItem(new HoldItem(hold, seat));
        }

        seatRepository.saveAll(lockedSeats);
        hold = seatHoldRepository.save(hold);

        return toHoldResponse(hold, event, lockedSeats, now);
    }

    /**
     * Allows an attendee to explicitly release their own active hold before expiration.
     */
    @Transactional
    public void releaseHold(Long attendeeId, Long holdId) {
        SeatHold hold = seatHoldRepository.findByIdForUpdate(holdId)
                .orElseThrow(() -> new ResourceNotFoundException("Seat hold not found"));
        if (!hold.getUser().getId().equals(attendeeId)) {
            throw new ForbiddenOperationException("You cannot release another attendee's seat hold");
        }
        if (hold.getStatus() != HoldStatus.ACTIVE) {
            return;
        }
        List<Seat> seats = seatRepository.findByCurrentHoldIdForUpdate(holdId);
        for (Seat seat : seats) {
            if (seat.getStatus() == SeatStatus.HELD) {
                seat.releaseToAvailable();
            }
        }
        hold.setStatus(HoldStatus.RELEASED);
        seatRepository.saveAll(seats);
        seatHoldRepository.save(hold);
    }

    /**
     * Atomically converts a valid, unexpired SeatHold owned by the attendee into a CONFIRMED Booking.
     * Enforces:
     * - Hold row lock (SELECT ... FOR UPDATE)
     * - Hold ownership verification
     * - Duplicate confirmation prevention
     * - Strict backend expiration verification via injected Clock
     * - Seat row locks + activeSeatId database unique constraint
     */
    @Transactional(noRollbackFor = HoldExpiredException.class)
    public BookingResponse confirmBooking(Long attendeeId, ConfirmBookingRequest request) {
        SeatHold hold = seatHoldRepository.findByIdForUpdate(request.holdId())
                .orElseThrow(() -> new ResourceNotFoundException("Seat hold not found with ID: " + request.holdId()));

        if (!hold.getUser().getId().equals(attendeeId)) {
            throw new ForbiddenOperationException("You are not authorized to confirm another attendee's hold");
        }

        if (hold.getStatus() == HoldStatus.CONFIRMED || bookingRepository.existsByHoldId(hold.getId())) {
            throw new SeatConflictException("This hold has already been confirmed into a booking");
        }

        if (hold.getStatus() == HoldStatus.RELEASED) {
            throw new BadRequestException("This hold was already released and cannot be confirmed");
        }

        Instant now = Instant.now(clock);
        if (hold.getStatus() == HoldStatus.EXPIRED || !hold.getExpiresAt().isAfter(now)) {
            // Ensure seats and hold are marked expired
            hold.setStatus(HoldStatus.EXPIRED);
            List<Seat> staleSeats = seatRepository.findByCurrentHoldIdForUpdate(hold.getId());
            for (Seat s : staleSeats) {
                if (s.getStatus() == SeatStatus.HELD) {
                    s.releaseToAvailable();
                }
            }
            seatRepository.saveAll(staleSeats);
            seatHoldRepository.saveAndFlush(hold);
            throw new HoldExpiredException("Your temporary seat hold has expired. Please select available seats again.");
        }

        List<HoldItem> holdItems = holdItemRepository.findByHoldIdWithSeats(hold.getId());
        if (holdItems.isEmpty()) {
            throw new BadRequestException("Hold contains no seats");
        }

        List<Long> seatIds = holdItems.stream()
                .map(hi -> hi.getSeat().getId())
                .sorted()
                .toList();

        List<Seat> lockedSeats = seatRepository.findAllByIdInForUpdate(seatIds);
        for (Seat seat : lockedSeats) {
            if (seat.getStatus() != SeatStatus.HELD
                    || !attendeeId.equals(seat.getHeldByUserId())
                    || !hold.getId().equals(seat.getCurrentHoldId())) {
                throw new SeatConflictException("Seat " + seat.getSeatCode() + " is no longer held by your session");
            }
        }

        Booking booking = new Booking();
        booking.setBookingReference(generateUniqueReference());
        booking.setUser(hold.getUser());
        booking.setEvent(hold.getEvent());
        booking.setHoldId(hold.getId());
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setCreatedAt(now);
        booking = bookingRepository.save(booking);

        for (Seat seat : lockedSeats) {
            seat.markBooked(booking.getId());
            booking.addItem(new BookingItem(booking, seat));
        }

        hold.setStatus(HoldStatus.CONFIRMED);

        seatRepository.saveAll(lockedSeats);
        seatHoldRepository.save(hold);
        booking = bookingRepository.saveAndFlush(booking);

        return toBookingResponse(booking, lockedSeats);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(Long attendeeId) {
        return bookingRepository.findByUserIdWithDetailsOrderByCreatedAtDesc(attendeeId)
                .stream()
                .map(this::toBookingResponseFromLoaded)
                .toList();
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingDetails(Long requesterId, Role requesterRole, Long bookingId) {
        Booking booking = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));

        boolean isOwnerAttendee = booking.getUser().getId().equals(requesterId);
        boolean isEventOrganizer = requesterRole == Role.ORGANIZER
                && booking.getEvent().getOrganizer().getId().equals(requesterId);

        if (!isOwnerAttendee && !isEventOrganizer) {
            throw new ForbiddenOperationException("You do not have permission to view this booking");
        }
        return toBookingResponseFromLoaded(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getEventBookingsForOrganizer(Long organizerId, Long eventId) {
        Event event = eventRepository.findByIdWithOrganizer(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + eventId));
        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new ForbiddenOperationException("You can only view bookings for events you organized");
        }
        return bookingRepository.findByEventIdWithDetailsOrderByCreatedAtDesc(eventId)
                .stream()
                .map(this::toBookingResponseFromLoaded)
                .toList();
    }

    /**
     * Cancels a confirmed booking within a PostgreSQL transaction:
     * 1. Locks Booking row & validates ownership.
     * 2. Updates Booking status -> CANCELLED and sets cancelledAt.
     * 3. Clears activeSeatId on BookingItems (releasing DB unique active constraint while preserving history).
     * 4. Locks associated Seats and transitions them back to AVAILABLE.
     */
    @Transactional
    public BookingResponse cancelBooking(Long attendeeId, Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));

        if (!booking.getUser().getId().equals(attendeeId)) {
            throw new ForbiddenOperationException("You can only cancel your own bookings");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BadRequestException("This booking has already been cancelled");
        }

        List<BookingItem> items = bookingItemRepository.findByBookingIdWithSeats(bookingId);
        List<Long> seatIds = items.stream()
                .map(bi -> bi.getSeat().getId())
                .sorted()
                .toList();

        List<Seat> lockedSeats = seatRepository.findAllByIdInForUpdate(seatIds);
        for (Seat seat : lockedSeats) {
            if (seat.getStatus() == SeatStatus.BOOKED && bookingId.equals(seat.getCurrentBookingId())) {
                seat.releaseToAvailable();
            }
        }

        for (BookingItem item : items) {
            item.setActiveSeatId(null);
        }

        Instant now = Instant.now(clock);
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(now);

        seatRepository.saveAll(lockedSeats);
        bookingItemRepository.saveAll(items);
        booking = bookingRepository.saveAndFlush(booking);

        return toBookingResponse(booking, lockedSeats);
    }

    /**
     * Generates a cryptographically verifiable QR digital ticket ONLY for CONFIRMED bookings.
     */
    @Transactional(readOnly = true)
    public TicketResponse getBookingTicket(Long requesterId, Role requesterRole, Long bookingId) {
        Booking booking = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));

        boolean isOwnerAttendee = booking.getUser().getId().equals(requesterId);
        boolean isEventOrganizer = requesterRole == Role.ORGANIZER
                && booking.getEvent().getOrganizer().getId().equals(requesterId);

        if (!isOwnerAttendee && !isEventOrganizer) {
            throw new ForbiddenOperationException("You do not have permission to access this ticket");
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Digital QR tickets are only available for CONFIRMED bookings");
        }

        List<String> seatCodes = booking.getItems().stream()
                .sorted(Comparator.comparing(bi -> bi.getSeat().getId()))
                .map(BookingItem::getSeatCode)
                .toList();

        String signature = computeTicketSignature(booking.getBookingReference(), booking.getEvent().getId(), booking.getUser().getId(), seatCodes);
        String qrPayload = String.format(
                "EVENTEASE-TICKET|REF:%s|EVENT:%d|USER:%d|SEATS:%s|SIG:%s",
                booking.getBookingReference(),
                booking.getEvent().getId(),
                booking.getUser().getId(),
                String.join(",", seatCodes),
                signature
        );

        String qrDataUri = QrCodeGenerator.generateBase64PngDataUri(qrPayload, 280);
        BigDecimal unitPrice = booking.getEvent().getTicketPrice() != null ? booking.getEvent().getTicketPrice() : BigDecimal.ZERO;
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(seatCodes.size()));

        return new TicketResponse(
                booking.getId(),
                booking.getBookingReference(),
                booking.getStatus(),
                booking.getEvent().getName(),
                booking.getEvent().getCategory(),
                booking.getEvent().getVenue(),
                booking.getEvent().getEventDate(),
                booking.getUser().getName(),
                booking.getUser().getEmail(),
                seatCodes,
                totalAmount,
                booking.getCreatedAt(),
                booking.getCheckedInAt(),
                signature,
                qrPayload,
                qrDataUri
        );
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getAllOrganizerBookings(Long organizerId) {
        return bookingRepository.findByOrganizerIdWithDetailsOrderByCreatedAtDesc(organizerId)
                .stream()
                .map(this::toBookingResponseFromLoaded)
                .toList();
    }

    /**
     * Gate Check-In & Cryptographic Ticket Verification for Organizers.
     * Supports scanning either a full signed QR payload
     * ("EVENTEASE-TICKET|REF:EVE-XXXX|EVENT:1|USER:3|SEATS:A1,A2|SIG:ABCDEF12")
     * or a direct booking reference ("EVE-XXXX").
     */
    @Transactional
    public CheckInVerifyResponse verifyAndCheckInTicket(Long organizerId, CheckInVerifyRequest request) {
        String rawInput = request.code() == null ? "" : request.code().trim();
        if (rawInput.isEmpty()) {
            throw new BadRequestException("Ticket QR payload or booking reference cannot be empty");
        }

        String parsedRef = rawInput;
        String providedSig = null;

        if (rawInput.startsWith("EVENTEASE-TICKET|")) {
            String[] segments = rawInput.split("\\|");
            for (String seg : segments) {
                if (seg.startsWith("REF:")) {
                    parsedRef = seg.substring(4).trim();
                } else if (seg.startsWith("SIG:")) {
                    providedSig = seg.substring(4).trim();
                }
            }
        } else {
            parsedRef = rawInput.toUpperCase(Locale.ROOT);
        }

        final String lookupReference = parsedRef;
        Booking booking = bookingRepository.findByBookingReferenceForUpdate(lookupReference)
                .orElseThrow(() -> new ResourceNotFoundException("No booking found matching reference: " + lookupReference));

        if (!booking.getEvent().getOrganizer().getId().equals(organizerId)) {
            throw new ForbiddenOperationException("This ticket belongs to an event managed by a different organizer");
        }

        List<BookingItem> loadedItems = bookingItemRepository.findByBookingIdWithSeats(booking.getId());
        List<String> seatCodes = loadedItems.stream()
                .sorted(Comparator.comparing(bi -> bi.getSeat().getId()))
                .map(BookingItem::getSeatCode)
                .toList();

        BigDecimal unitPrice = booking.getEvent().getTicketPrice() != null
                ? booking.getEvent().getTicketPrice()
                : BigDecimal.ZERO;
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(seatCodes.size()));

        String expectedSig = computeTicketSignature(
                booking.getBookingReference(),
                booking.getEvent().getId(),
                booking.getUser().getId(),
                seatCodes
        );

        if (providedSig != null && !expectedSig.equalsIgnoreCase(providedSig)) {
            return new CheckInVerifyResponse(
                    false,
                    false,
                    booking.getCheckedInAt() != null,
                    "INVALID_SIGNATURE",
                    "QR cryptographic signature mismatch! Ticket payload may have been tampered with.",
                    booking.getId(),
                    booking.getBookingReference(),
                    booking.getStatus(),
                    booking.getEvent().getId(),
                    booking.getEvent().getName(),
                    booking.getEvent().getVenue(),
                    booking.getEvent().getEventDate(),
                    booking.getUser().getName(),
                    booking.getUser().getEmail(),
                    seatCodes,
                    totalAmount,
                    booking.getCreatedAt(),
                    booking.getCheckedInAt()
            );
        }

        boolean sigVerified = providedSig != null;

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            return new CheckInVerifyResponse(
                    false,
                    sigVerified,
                    false,
                    "CANCELLED_VOID",
                    "Entry Denied: Booking " + booking.getBookingReference() + " was CANCELLED and seats were released.",
                    booking.getId(),
                    booking.getBookingReference(),
                    booking.getStatus(),
                    booking.getEvent().getId(),
                    booking.getEvent().getName(),
                    booking.getEvent().getVenue(),
                    booking.getEvent().getEventDate(),
                    booking.getUser().getName(),
                    booking.getUser().getEmail(),
                    seatCodes,
                    totalAmount,
                    booking.getCreatedAt(),
                    booking.getCheckedInAt()
            );
        }

        boolean alreadyCheckedIn = booking.getCheckedInAt() != null;
        boolean shouldMark = request.markCheckedIn() == null || Boolean.TRUE.equals(request.markCheckedIn());

        if (alreadyCheckedIn) {
            return new CheckInVerifyResponse(
                    true,
                    sigVerified,
                    true,
                    "ALREADY_CHECKED_IN",
                    "Attendee was already checked in at " + booking.getCheckedInAt() + ". Verify identity before re-entry.",
                    booking.getId(),
                    booking.getBookingReference(),
                    booking.getStatus(),
                    booking.getEvent().getId(),
                    booking.getEvent().getName(),
                    booking.getEvent().getVenue(),
                    booking.getEvent().getEventDate(),
                    booking.getUser().getName(),
                    booking.getUser().getEmail(),
                    seatCodes,
                    totalAmount,
                    booking.getCreatedAt(),
                    booking.getCheckedInAt()
            );
        }

        if (shouldMark) {
            Instant now = Instant.now(clock);
            booking.setCheckedInAt(now);
            bookingRepository.saveAndFlush(booking);

            return new CheckInVerifyResponse(
                    true,
                    sigVerified,
                    false,
                    "CHECKED_IN",
                    "Gate Check-In Successful! Welcome " + booking.getUser().getName() + " — Seats: " + String.join(", ", seatCodes),
                    booking.getId(),
                    booking.getBookingReference(),
                    booking.getStatus(),
                    booking.getEvent().getId(),
                    booking.getEvent().getName(),
                    booking.getEvent().getVenue(),
                    booking.getEvent().getEventDate(),
                    booking.getUser().getName(),
                    booking.getUser().getEmail(),
                    seatCodes,
                    totalAmount,
                    booking.getCreatedAt(),
                    booking.getCheckedInAt()
            );
        }

        return new CheckInVerifyResponse(
                true,
                sigVerified,
                false,
                "VALID_READY",
                "Ticket Verified & Authentic — Ready for Gate Check-In.",
                booking.getId(),
                booking.getBookingReference(),
                booking.getStatus(),
                booking.getEvent().getId(),
                booking.getEvent().getName(),
                booking.getEvent().getVenue(),
                booking.getEvent().getEventDate(),
                booking.getUser().getName(),
                booking.getUser().getEmail(),
                seatCodes,
                totalAmount,
                booking.getCreatedAt(),
                null
        );
    }

    private String computeTicketSignature(String ref, Long eventId, Long userId, List<String> seats) {
        try {
            String raw = ref + "|" + eventId + "|" + userId + "|" + String.join(",", seats) + "|" + ticketSigningSecret;
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                hex.append(String.format("%02X", digest[i]));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Unable to compute ticket verification signature", e);
        }
    }

    private String generateUniqueReference() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = SeatLabelGenerator.generateBookingReference();
            if (bookingRepository.findByBookingReferenceWithDetails(candidate).isEmpty()) {
                return candidate;
            }
        }
        return "EVE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private HoldResponse toHoldResponse(SeatHold hold, Event event, List<Seat> seats, Instant now) {
        long remaining = Math.max(0L, Duration.between(now, hold.getExpiresAt()).getSeconds());
        List<Long> seatIds = seats.stream().map(Seat::getId).toList();
        List<String> seatCodes = seats.stream().map(Seat::getSeatCode).toList();
        BigDecimal price = event.getTicketPrice() != null ? event.getTicketPrice() : BigDecimal.ZERO;
        BigDecimal total = price.multiply(BigDecimal.valueOf(seats.size()));

        return new HoldResponse(
                hold.getId(),
                event.getId(),
                event.getName(),
                event.getVenue(),
                event.getEventDate(),
                hold.getUser().getId(),
                hold.getStatus(),
                hold.getCreatedAt(),
                hold.getExpiresAt(),
                remaining,
                seatIds,
                seatCodes,
                total
        );
    }

    private BookingResponse toBookingResponse(Booking booking, List<Seat> seats) {
        List<Seat> sorted = seats.stream().sorted(Comparator.comparing(Seat::getId)).toList();
        List<Long> seatIds = sorted.stream().map(Seat::getId).toList();
        List<String> seatCodes = sorted.stream().map(Seat::getSeatCode).toList();
        BigDecimal unit = booking.getEvent().getTicketPrice() != null ? booking.getEvent().getTicketPrice() : BigDecimal.ZERO;
        BigDecimal total = unit.multiply(BigDecimal.valueOf(sorted.size()));

        return new BookingResponse(
                booking.getId(),
                booking.getBookingReference(),
                booking.getEvent().getId(),
                booking.getEvent().getName(),
                booking.getEvent().getCategory(),
                booking.getEvent().getVenue(),
                booking.getEvent().getEventDate(),
                booking.getUser().getId(),
                booking.getUser().getName(),
                booking.getUser().getEmail(),
                booking.getStatus(),
                seatIds,
                seatCodes,
                unit,
                total,
                booking.getCreatedAt(),
                booking.getCancelledAt(),
                booking.getCheckedInAt()
        );
    }

    private BookingResponse toBookingResponseFromLoaded(Booking booking) {
        List<BookingItem> sortedItems = booking.getItems().stream()
                .sorted(Comparator.comparing(bi -> bi.getSeat().getId()))
                .toList();
        List<Long> seatIds = sortedItems.stream().map(bi -> bi.getSeat().getId()).toList();
        List<String> seatCodes = sortedItems.stream().map(BookingItem::getSeatCode).toList();
        BigDecimal unit = booking.getEvent().getTicketPrice() != null ? booking.getEvent().getTicketPrice() : BigDecimal.ZERO;
        BigDecimal total = unit.multiply(BigDecimal.valueOf(sortedItems.size()));

        return new BookingResponse(
                booking.getId(),
                booking.getBookingReference(),
                booking.getEvent().getId(),
                booking.getEvent().getName(),
                booking.getEvent().getCategory(),
                booking.getEvent().getVenue(),
                booking.getEvent().getEventDate(),
                booking.getUser().getId(),
                booking.getUser().getName(),
                booking.getUser().getEmail(),
                booking.getStatus(),
                seatIds,
                seatCodes,
                unit,
                total,
                booking.getCreatedAt(),
                booking.getCancelledAt(),
                booking.getCheckedInAt()
        );
    }
}
