package com.cardinality.eventbooking.config;

import com.cardinality.eventbooking.dto.BookingDtos.ConfirmBookingRequest;
import com.cardinality.eventbooking.dto.BookingDtos.HoldRequest;
import com.cardinality.eventbooking.dto.BookingDtos.HoldResponse;
import com.cardinality.eventbooking.dto.EventDtos.CreateEventRequest;
import com.cardinality.eventbooking.dto.EventDtos.EventResponse;
import com.cardinality.eventbooking.entity.BookingSettings;
import com.cardinality.eventbooking.entity.Seat;
import com.cardinality.eventbooking.entity.User;
import com.cardinality.eventbooking.enums.Role;
import com.cardinality.eventbooking.repository.*;
import com.cardinality.eventbooking.service.EventService;
import com.cardinality.eventbooking.service.SeatBookingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final boolean seedEnabled;
    private final UserRepository userRepository;
    private final BookingSettingsRepository settingsRepository;
    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;
    private final EventService eventService;
    private final SeatBookingService seatBookingService;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public DataSeeder(
            @Value("${app.seed.enabled:true}") boolean seedEnabled,
            UserRepository userRepository,
            BookingSettingsRepository settingsRepository,
            EventRepository eventRepository,
            SeatRepository seatRepository,
            BookingRepository bookingRepository,
            EventService eventService,
            SeatBookingService seatBookingService,
            PasswordEncoder passwordEncoder,
            Clock clock
    ) {
        this.seedEnabled = seedEnabled;
        this.userRepository = userRepository;
        this.settingsRepository = settingsRepository;
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.bookingRepository = bookingRepository;
        this.eventService = eventService;
        this.seatBookingService = seatBookingService;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }
        if (eventRepository.count() > 0) {
            log.info("Database already contains {} event(s); skipping initial seed.", eventRepository.count());
            return;
        }

        log.info("Seeding mandatory EventEase demonstration dataset into PostgreSQL...");
        Instant now = Instant.now(clock);
        String defaultHash = passwordEncoder.encode("DemoPass@123");

        // 1. Organizers
        User organizer1 = userRepository.save(new User(
                "Varsha Vaithyam",
                "organizer@eventease.dev",
                defaultHash,
                Role.ORGANIZER,
                now
        ));
        settingsRepository.save(new BookingSettings(
                organizer1,
                BookingSettings.DEFAULT_MAX_SEATS,
                BookingSettings.DEFAULT_HOLD_MINUTES
        ));

        User organizer2 = userRepository.save(new User(
                "Arjun Krishnan",
                "arjun.org@eventease.dev",
                defaultHash,
                Role.ORGANIZER,
                now
        ));
        settingsRepository.save(new BookingSettings(
                organizer2,
                BookingSettings.DEFAULT_MAX_SEATS,
                BookingSettings.DEFAULT_HOLD_MINUTES
        ));

        // 2. Attendees (10 sample attendees, primary demo attendee first)
        String[][] attendeeProfiles = {
                {"Karthik Subramanian", "attendee@eventease.dev"},
                {"Priya Narayanan", "priya@eventease.dev"},
                {"Rohan Deshmukh", "rohan@eventease.dev"},
                {"Ananya Iyer", "ananya@eventease.dev"},
                {"Vikramaditya Rao", "vikram@eventease.dev"},
                {"Meera Sundaram", "meera@eventease.dev"},
                {"Siddharth Menon", "siddharth@eventease.dev"},
                {"Divya Balasubramanian", "divya@eventease.dev"},
                {"Nikhil Sharma", "nikhil@eventease.dev"},
                {"Kavya Natarajan", "kavya@eventease.dev"}
        };

        List<User> attendees = new ArrayList<>();
        for (String[] p : attendeeProfiles) {
            attendees.add(userRepository.save(new User(p[0], p[1], defaultHash, Role.ATTENDEE, now)));
        }

        // 3. Event 1: 120 seats (10 rows x 12 seats per row)
        EventResponse event1 = eventService.createEvent(organizer1.getId(), new CreateEventRequest(
                "TENSORA 2K26 – National AI & Cloud Symposium",
                "AI Innovation Hackathon",
                "TENSORA 2K26 brings together top student engineers, AI researchers, and cloud architects at KLN College Auditorium for keynotes on Distributed Systems, Generative AI, live system design battles, and hands-on workshops.",
                "KLN College Auditorium, Madurai",
                now.plus(21, ChronoUnit.DAYS),
                10,
                12,
                new BigDecimal("499.00")
        ));

        // 4. Event 2: 60 seats (6 rows x 10 seats per row)
        EventResponse event2 = eventService.createEvent(organizer1.getId(), new CreateEventRequest(
                "CloudNative & Microservices Architecture Summit",
                "Software Engineering Workshop",
                "An intensive full-day engineering summit exploring PostgreSQL concurrency control, Spring Boot 3 production patterns, high-throughput event-driven architectures, and live fault-injection clinics.",
                "TIDEL Park Convention Hall, Chennai",
                now.plus(35, ChronoUnit.DAYS),
                6,
                10,
                new BigDecimal("799.00")
        ));

        List<Seat> event1Seats = seatRepository.findByEventIdOrderByIdAsc(event1.id());
        List<Seat> event2Seats = seatRepository.findByEventIdOrderByIdAsc(event2.id());

        // 5. Create 20 confirmed sample bookings on Event 1 (covering 36 seats across rows A-C)
        int seatCursor1 = 0;
        for (int i = 0; i < 20; i++) {
            User attendee = attendees.get(i % attendees.size());
            int count = (i % 5 == 0) ? 1 : 2; // 4*1 + 16*2 = 36 seats booked, 84 available
            List<Long> ids = new ArrayList<>();
            for (int k = 0; k < count; k++) {
                ids.add(event1Seats.get(seatCursor1++).getId());
            }
            HoldResponse hold = seatBookingService.createTemporaryHold(attendee.getId(), new HoldRequest(event1.id(), ids));
            seatBookingService.confirmBooking(attendee.getId(), new ConfirmBookingRequest(hold.holdId()));
        }

        // 6. Create 12 confirmed sample bookings on Event 2 (covering 20 seats across rows A-B)
        int seatCursor2 = 0;
        for (int i = 0; i < 12; i++) {
            User attendee = attendees.get((i + 2) % attendees.size());
            int count = (i % 3 == 0) ? 1 : 2; // 4*1 + 8*2 = 20 seats booked, 40 available
            List<Long> ids = new ArrayList<>();
            for (int k = 0; k < count; k++) {
                ids.add(event2Seats.get(seatCursor2++).getId());
            }
            HoldResponse hold = seatBookingService.createTemporaryHold(attendee.getId(), new HoldRequest(event2.id(), ids));
            seatBookingService.confirmBooking(attendee.getId(), new ConfirmBookingRequest(hold.holdId()));
        }

        log.info("Seed complete: {} events (120 seats + 60 seats) and {} sample bookings created.",
                eventRepository.count(), bookingRepository.count());
    }
}
