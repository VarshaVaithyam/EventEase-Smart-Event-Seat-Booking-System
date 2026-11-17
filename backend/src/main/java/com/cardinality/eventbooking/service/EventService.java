package com.cardinality.eventbooking.service;

import com.cardinality.eventbooking.dto.EventDtos.*;
import com.cardinality.eventbooking.entity.BookingSettings;
import com.cardinality.eventbooking.entity.Event;
import com.cardinality.eventbooking.entity.Seat;
import com.cardinality.eventbooking.entity.User;
import com.cardinality.eventbooking.enums.Role;
import com.cardinality.eventbooking.enums.SeatStatus;
import com.cardinality.eventbooking.exception.BadRequestException;
import com.cardinality.eventbooking.exception.ForbiddenOperationException;
import com.cardinality.eventbooking.exception.ResourceNotFoundException;
import com.cardinality.eventbooking.repository.*;
import com.cardinality.eventbooking.util.SeatLabelGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final SettingsService settingsService;
    private final HoldExpirationService holdExpirationService;
    private final Clock clock;

    public EventService(
            EventRepository eventRepository,
            SeatRepository seatRepository,
            SeatHoldRepository seatHoldRepository,
            BookingRepository bookingRepository,
            UserRepository userRepository,
            SettingsService settingsService,
            HoldExpirationService holdExpirationService,
            Clock clock
    ) {
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.settingsService = settingsService;
        this.holdExpirationService = holdExpirationService;
        this.clock = clock;
    }

    @Transactional
    public EventResponse createEvent(Long organizerId, CreateEventRequest request) {
        User organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("Organizer not found"));
        if (organizer.getRole() != Role.ORGANIZER) {
            throw new ForbiddenOperationException("Only organizers are permitted to create events");
        }

        validateEventDateInFuture(request.eventDate());
        if (request.totalRows() == null || request.totalRows() < 1 || request.seatsPerRow() == null || request.seatsPerRow() < 1) {
            throw new BadRequestException("Row and seat counts must be valid positive integers");
        }
        int totalSeats = request.totalRows() * request.seatsPerRow();
        if (totalSeats > 1000) {
            throw new BadRequestException("Seat layout cannot exceed 1,000 seats per event");
        }

        Event event = new Event();
        event.setName(request.name().trim());
        event.setCategory(request.category() != null && !request.category().isBlank() ? request.category().trim() : "Conference & Live Event");
        event.setDescription(request.description().trim());
        event.setVenue(request.venue().trim());
        event.setEventDate(request.eventDate());
        event.setTotalRows(request.totalRows());
        event.setSeatsPerRow(request.seatsPerRow());
        event.setTicketPrice(request.ticketPrice() != null ? request.ticketPrice() : BigDecimal.ZERO);
        event.setOrganizer(organizer);
        event.setCreatedAt(Instant.now(clock));

        event = eventRepository.save(event);

        // Dynamic seat generation
        List<Seat> generatedSeats = new ArrayList<>(totalSeats);
        for (int r = 0; r < request.totalRows(); r++) {
            String rowLabel = SeatLabelGenerator.toRowLabel(r);
            for (int s = 1; s <= request.seatsPerRow(); s++) {
                String code = SeatLabelGenerator.toSeatCode(rowLabel, s);
                generatedSeats.add(new Seat(event, rowLabel, s, code));
            }
        }
        seatRepository.saveAll(generatedSeats);

        return toEventResponse(event);
    }

    @Transactional
    public List<EventResponse> listAllEvents() {
        holdExpirationService.releaseExpiredHolds();
        return eventRepository.findAllWithOrganizerOrderByEventDateAsc()
                .stream()
                .map(this::toEventResponse)
                .toList();
    }

    @Transactional
    public List<EventResponse> listOrganizerEvents(Long organizerId) {
        holdExpirationService.releaseExpiredHolds();
        return eventRepository.findByOrganizerIdOrderByEventDateAsc(organizerId)
                .stream()
                .map(this::toEventResponse)
                .toList();
    }

    @Transactional
    public EventResponse getEventById(Long eventId) {
        holdExpirationService.releaseExpiredHolds();
        Event event = eventRepository.findByIdWithOrganizer(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + eventId));
        return toEventResponse(event);
    }

    @Transactional
    public EventResponse updateEvent(Long organizerId, Long eventId, UpdateEventRequest request) {
        Event event = eventRepository.findByIdWithOrganizer(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + eventId));
        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new ForbiddenOperationException("You can only modify events created by your organizer account");
        }
        validateEventDateInFuture(request.eventDate());

        event.setName(request.name().trim());
        if (request.category() != null && !request.category().isBlank()) {
            event.setCategory(request.category().trim());
        }
        event.setDescription(request.description().trim());
        event.setVenue(request.venue().trim());
        event.setEventDate(request.eventDate());
        if (request.ticketPrice() != null) {
            event.setTicketPrice(request.ticketPrice());
        }
        event = eventRepository.save(event);
        return toEventResponse(event);
    }

    @Transactional
    public void deleteEvent(Long organizerId, Long eventId) {
        Event event = eventRepository.findByIdWithOrganizer(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + eventId));
        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new ForbiddenOperationException("You can only delete events created by your organizer account");
        }
        holdExpirationService.releaseExpiredHolds();
        if (bookingRepository.existsByEventId(eventId)
                || seatRepository.existsByEventIdAndStatusIn(eventId, List.of(SeatStatus.HELD, SeatStatus.BOOKED))) {
            throw new BadRequestException("Cannot delete an event that has active holds or historical bookings");
        }
        seatHoldRepository.deleteByEventId(eventId);
        seatRepository.deleteByEventId(eventId);
        eventRepository.delete(event);
    }

    private void validateEventDateInFuture(Instant eventDate) {
        if (eventDate == null || !eventDate.isAfter(Instant.now(clock))) {
            throw new BadRequestException("Event date must be in the future");
        }
    }

    public EventResponse toEventResponse(Event event) {
        long available = seatRepository.countByEventIdAndStatus(event.getId(), SeatStatus.AVAILABLE);
        long held = seatRepository.countByEventIdAndStatus(event.getId(), SeatStatus.HELD);
        long booked = seatRepository.countByEventIdAndStatus(event.getId(), SeatStatus.BOOKED);
        BookingSettings settings = settingsService.getOrCreateEntityForOrganizer(event.getOrganizer().getId());

        return new EventResponse(
                event.getId(),
                event.getName(),
                event.getCategory(),
                event.getDescription(),
                event.getVenue(),
                event.getEventDate(),
                event.getTotalRows(),
                event.getSeatsPerRow(),
                event.getTotalCapacity(),
                available,
                held,
                booked,
                event.getTicketPrice(),
                event.getOrganizer().getId(),
                event.getOrganizer().getName(),
                settings.getMaxSeatsPerBooking(),
                settings.getHoldDurationMinutes(),
                event.getCreatedAt()
        );
    }
}
