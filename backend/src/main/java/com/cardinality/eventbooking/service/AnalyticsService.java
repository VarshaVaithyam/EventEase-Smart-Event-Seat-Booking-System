package com.cardinality.eventbooking.service;

import com.cardinality.eventbooking.dto.BookingDtos.AnalyticsResponse;
import com.cardinality.eventbooking.dto.BookingDtos.EventStatItem;
import com.cardinality.eventbooking.entity.Event;
import com.cardinality.eventbooking.enums.BookingStatus;
import com.cardinality.eventbooking.enums.SeatStatus;
import com.cardinality.eventbooking.repository.BookingRepository;
import com.cardinality.eventbooking.repository.EventRepository;
import com.cardinality.eventbooking.repository.SeatRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class AnalyticsService {

    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;
    private final HoldExpirationService holdExpirationService;

    public AnalyticsService(
            EventRepository eventRepository,
            SeatRepository seatRepository,
            BookingRepository bookingRepository,
            HoldExpirationService holdExpirationService
    ) {
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.bookingRepository = bookingRepository;
        this.holdExpirationService = holdExpirationService;
    }

    @Transactional
    public AnalyticsResponse getOrganizerAnalytics(Long organizerId) {
        holdExpirationService.releaseExpiredHolds();

        List<Event> events = eventRepository.findByOrganizerIdOrderByEventDateAsc(organizerId);
        long totalSeats = 0;
        long totalAvailable = 0;
        long totalHeld = 0;
        long totalBookedSeats = 0;
        long totalConfirmedBookings = 0;
        long totalCheckedIn = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;

        List<EventStatItem> eventStats = new ArrayList<>(events.size());

        for (Event event : events) {
            long seatsCount = seatRepository.countByEventId(event.getId());
            long available = seatRepository.countByEventIdAndStatus(event.getId(), SeatStatus.AVAILABLE);
            long held = seatRepository.countByEventIdAndStatus(event.getId(), SeatStatus.HELD);
            long booked = seatRepository.countByEventIdAndStatus(event.getId(), SeatStatus.BOOKED);
            long confirmedBookings = bookingRepository.countByEventIdAndStatus(event.getId(), BookingStatus.CONFIRMED);
            long cancelledBookings = bookingRepository.countByEventIdAndStatus(event.getId(), BookingStatus.CANCELLED);
            long checkedIn = bookingRepository.countCheckedInByEventId(event.getId());

            BigDecimal unitPrice = event.getTicketPrice() != null ? event.getTicketPrice() : BigDecimal.ZERO;
            BigDecimal eventRevenue = unitPrice.multiply(BigDecimal.valueOf(booked));

            double pct = seatsCount > 0 ? Math.round((booked * 1000.0) / seatsCount) / 10.0 : 0.0;

            totalSeats += seatsCount;
            totalAvailable += available;
            totalHeld += held;
            totalBookedSeats += booked;
            totalConfirmedBookings += confirmedBookings;
            totalCheckedIn += checkedIn;
            totalRevenue = totalRevenue.add(eventRevenue);

            eventStats.add(new EventStatItem(
                    event.getId(),
                    event.getName(),
                    event.getVenue(),
                    event.getEventDate(),
                    seatsCount,
                    available,
                    held,
                    booked,
                    confirmedBookings,
                    cancelledBookings,
                    pct,
                    eventRevenue,
                    checkedIn
            ));
        }

        double overallPct = totalSeats > 0 ? Math.round((totalBookedSeats * 1000.0) / totalSeats) / 10.0 : 0.0;

        return new AnalyticsResponse(
                events.size(),
                totalSeats,
                totalConfirmedBookings,
                totalBookedSeats,
                totalAvailable,
                totalHeld,
                overallPct,
                totalRevenue,
                totalCheckedIn,
                eventStats
        );
    }
}
