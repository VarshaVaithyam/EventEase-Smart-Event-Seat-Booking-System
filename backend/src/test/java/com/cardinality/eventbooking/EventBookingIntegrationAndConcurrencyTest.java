package com.cardinality.eventbooking;

import com.cardinality.eventbooking.dto.AuthDtos.*;
import com.cardinality.eventbooking.dto.BookingDtos.*;
import com.cardinality.eventbooking.dto.EventDtos.*;
import com.cardinality.eventbooking.entity.Seat;
import com.cardinality.eventbooking.enums.BookingStatus;
import com.cardinality.eventbooking.enums.Role;
import com.cardinality.eventbooking.enums.SeatStatus;
import com.cardinality.eventbooking.exception.SeatConflictException;
import com.cardinality.eventbooking.repository.*;
import com.cardinality.eventbooking.service.HoldExpirationService;
import com.cardinality.eventbooking.service.SeatBookingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Comprehensive PostgreSQL Integration & Concurrency Test Suite covering all 14+ mandatory scenarios,
 * including real multi-threaded database lock contention (SELECT ... FOR UPDATE) on PostgreSQL.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class EventBookingIntegrationAndConcurrencyTest {

    @TestConfiguration
    static class FixedClockTestConfig {
        @Bean
        @Primary
        public MutableClock testClock() {
            return new MutableClock(Instant.parse("2026-11-15T10:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MutableClock mutableClock;

    @Autowired
    private SeatBookingService seatBookingService;

    @Autowired
    private HoldExpirationService holdExpirationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private SeatHoldRepository seatHoldRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingItemRepository bookingItemRepository;

    @Autowired
    private BookingSettingsRepository bookingSettingsRepository;

    @BeforeEach
    void cleanDatabaseAndResetClock() {
        mutableClock.setInstant(Instant.parse("2026-11-15T10:00:00Z"));
        bookingItemRepository.deleteAll();
        bookingRepository.deleteAll();
        seatHoldRepository.deleteAll();
        seatRepository.deleteAll();
        eventRepository.deleteAll();
        bookingSettingsRepository.deleteAll();
        userRepository.deleteAll();
    }

    private AuthResponse registerUser(String name, String email, String password, Role role) throws Exception {
        RegisterRequest req = new RegisterRequest(name, email, password, role);
        MvcResult res = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(res.getResponse().getContentAsString(), AuthResponse.class);
    }

    private EventResponse createSampleEvent(String organizerToken, int rows, int cols) throws Exception {
        CreateEventRequest req = new CreateEventRequest(
                "TENSORA 2K26",
                "AI Hackathon",
                "National AI Innovation Symposium",
                "KLN College Auditorium",
                mutableClock.instant().plus(14, ChronoUnit.DAYS),
                rows,
                cols,
                new BigDecimal("250.00")
        );
        MvcResult res = mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + organizerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(res.getResponse().getContentAsString(), EventResponse.class);
    }

    // -------------------------------------------------------------------------
    // 1. Successful Attendee Registration
    // -------------------------------------------------------------------------
    @Test
    @Order(1)
    void test01_successfulAttendeeRegistration() throws Exception {
        AuthResponse response = registerUser("Karthik S", "karthik@test.dev", "Secret123!", Role.ATTENDEE);

        assertThat(response.token()).isNotBlank();
        assertThat(response.user().email()).isEqualTo("karthik@test.dev");
        assertThat(response.user().role()).isEqualTo(Role.ATTENDEE);
        assertThat(userRepository.findByEmailIgnoreCase("karthik@test.dev")).isPresent();
    }

    // -------------------------------------------------------------------------
    // 2. Successful Login
    // -------------------------------------------------------------------------
    @Test
    @Order(2)
    void test02_successfulLogin() throws Exception {
        registerUser("Varsha V", "varsha@test.dev", "Organizer123!", Role.ORGANIZER);

        LoginRequest loginReq = new LoginRequest("varsha@test.dev", "Organizer123!");
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("ORGANIZER"))
                .andReturn();

        AuthResponse auth = objectMapper.readValue(res.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(auth.token()).isNotBlank();
    }

    // -------------------------------------------------------------------------
    // 3. Invalid Login Rejected with 401 Unauthorized
    // -------------------------------------------------------------------------
    @Test
    @Order(3)
    void test03_invalidLoginRejected() throws Exception {
        registerUser("Attendee One", "att1@test.dev", "CorrectPass123", Role.ATTENDEE);

        LoginRequest wrongPass = new LoginRequest("att1@test.dev", "WrongPassword999");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongPass)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    // -------------------------------------------------------------------------
    // 4. Organizer-Only Event Creation (Attendee Forbidden, Organizer Succeeds)
    // -------------------------------------------------------------------------
    @Test
    @Order(4)
    void test04_organizerOnlyEventCreation() throws Exception {
        AuthResponse attendee = registerUser("Attendee", "attendee@test.dev", "Pass123!", Role.ATTENDEE);
        AuthResponse organizer = registerUser("Organizer", "organizer@test.dev", "Pass123!", Role.ORGANIZER);

        CreateEventRequest req = new CreateEventRequest(
                "Restricted Event",
                "Tech",
                "Testing RBAC enforcement",
                "Main Hall",
                mutableClock.instant().plus(10, ChronoUnit.DAYS),
                5,
                6,
                new BigDecimal("100.00")
        );

        // Attendee attempt MUST fail with 403 Forbidden
        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + attendee.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        // Organizer attempt MUST succeed and dynamically generate 30 seats
        EventResponse created = createSampleEvent(organizer.token(), 5, 6);
        assertThat(created.totalSeats()).isEqualTo(30);
        assertThat(seatRepository.countByEventId(created.id())).isEqualTo(30);
    }

    // -------------------------------------------------------------------------
    // 5. Future Event Date Validation
    // -------------------------------------------------------------------------
    @Test
    @Order(5)
    void test05_pastEventDateRejected() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);

        CreateEventRequest pastEvent = new CreateEventRequest(
                "Past Event",
                "Tech",
                "Should fail validation",
                "Auditorium",
                mutableClock.instant().minus(2, ChronoUnit.DAYS),
                4,
                5,
                BigDecimal.TEN
        );

        mockMvc.perform(post("/api/events")
                        .header("Authorization", "Bearer " + organizer.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pastEvent)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Event date must be in the future"));
    }

    // -------------------------------------------------------------------------
    // 6. Seat Availability Retrieval (Dynamic Seat Layout Verification)
    // -------------------------------------------------------------------------
    @Test
    @Order(6)
    void test06_seatAvailabilityRetrieval() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        EventResponse event = createSampleEvent(organizer.token(), 10, 12); // 120 seats

        MvcResult res = mockMvc.perform(get("/api/events/" + event.id() + "/seats"))
                .andExpect(status().isOk())
                .andReturn();

        SeatMapResponse map = objectMapper.readValue(res.getResponse().getContentAsString(), SeatMapResponse.class);
        assertThat(map.totalSeats()).isEqualTo(120);
        assertThat(map.availableSeats()).isEqualTo(120L);
        assertThat(map.seats()).hasSize(120);
        assertThat(map.seats().get(0).seatCode()).isEqualTo("A1");
        assertThat(map.seats().get(119).seatCode()).isEqualTo("J12");
    }

    // -------------------------------------------------------------------------
    // 7. Successful Temporary Seat Hold
    // -------------------------------------------------------------------------
    @Test
    @Order(7)
    void test07_successfulTemporarySeatHold() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        AuthResponse attendee = registerUser("Attendee", "att@test.dev", "Pass123!", Role.ATTENDEE);
        EventResponse event = createSampleEvent(organizer.token(), 3, 4);

        List<Seat> seats = seatRepository.findByEventIdOrderByIdAsc(event.id());
        List<Long> targetIds = List.of(seats.get(0).getId(), seats.get(1).getId());

        HoldRequest holdReq = new HoldRequest(event.id(), targetIds);
        MvcResult res = mockMvc.perform(post("/api/holds")
                        .header("Authorization", "Bearer " + attendee.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holdReq)))
                .andExpect(status().isCreated())
                .andReturn();

        HoldResponse hold = objectMapper.readValue(res.getResponse().getContentAsString(), HoldResponse.class);
        assertThat(hold.seatCodes()).containsExactly("A1", "A2");
        assertThat(hold.remainingSeconds()).isEqualTo(300L); // Default 5 minutes = 300s
        assertThat(seatRepository.countByEventIdAndStatus(event.id(), SeatStatus.HELD)).isEqualTo(2L);
    }

    // -------------------------------------------------------------------------
    // 8. Expired Hold Release Using Fixed/Mutable Clock (No 5-Minute Sleep)
    // -------------------------------------------------------------------------
    @Test
    @Order(8)
    void test08_expiredHoldReleaseUsingFixedClock() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        AuthResponse attendeeA = registerUser("Attendee A", "atta@test.dev", "Pass123!", Role.ATTENDEE);
        AuthResponse attendeeB = registerUser("Attendee B", "attb@test.dev", "Pass123!", Role.ATTENDEE);
        EventResponse event = createSampleEvent(organizer.token(), 2, 4);

        Long seatA1 = seatRepository.findByEventIdOrderByIdAsc(event.id()).get(0).getId();

        // Attendee A holds seat A1 at T = 10:00:00Z (expires at 10:05:00Z)
        seatBookingService.createTemporaryHold(attendeeA.user().id(), new HoldRequest(event.id(), List.of(seatA1)));
        assertThat(seatRepository.findById(seatA1).orElseThrow().getStatus()).isEqualTo(SeatStatus.HELD);

        // Advance injected clock by 5 minutes + 1 second -> T = 10:05:01Z
        mutableClock.advance(Duration.ofMinutes(5).plusSeconds(1));

        // Run backend expiration cleanup
        int released = holdExpirationService.releaseExpiredHolds();
        assertThat(released).isEqualTo(1);
        assertThat(seatRepository.findById(seatA1).orElseThrow().getStatus()).isEqualTo(SeatStatus.AVAILABLE);

        // Attendee B can now reserve seat A1 cleanly
        HoldResponse newHold = seatBookingService.createTemporaryHold(attendeeB.user().id(), new HoldRequest(event.id(), List.of(seatA1)));
        assertThat(newHold.userId()).isEqualTo(attendeeB.user().id());
    }

    // -------------------------------------------------------------------------
    // 9. Successful Booking Confirmation & Ticket QR Generation
    // -------------------------------------------------------------------------
    @Test
    @Order(9)
    void test09_successfulBookingConfirmationAndQrTicket() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        AuthResponse attendee = registerUser("Attendee", "att@test.dev", "Pass123!", Role.ATTENDEE);
        EventResponse event = createSampleEvent(organizer.token(), 3, 4);

        Long seatId = seatRepository.findByEventIdOrderByIdAsc(event.id()).get(0).getId();
        HoldResponse hold = seatBookingService.createTemporaryHold(attendee.user().id(), new HoldRequest(event.id(), List.of(seatId)));

        ConfirmBookingRequest confirmReq = new ConfirmBookingRequest(hold.holdId());
        MvcResult res = mockMvc.perform(post("/api/bookings/confirm")
                        .header("Authorization", "Bearer " + attendee.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.bookingReference").isNotEmpty())
                .andReturn();

        BookingResponse booking = objectMapper.readValue(res.getResponse().getContentAsString(), BookingResponse.class);
        assertThat(seatRepository.findById(seatId).orElseThrow().getStatus()).isEqualTo(SeatStatus.BOOKED);

        // Repeated confirmation of the same hold must be rejected with 409 Conflict
        mockMvc.perform(post("/api/bookings/confirm")
                        .header("Authorization", "Bearer " + attendee.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isConflict());

        // Digital QR ticket endpoint must succeed for CONFIRMED booking
        mockMvc.perform(get("/api/bookings/" + booking.id() + "/ticket")
                        .header("Authorization", "Bearer " + attendee.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.qrCodeDataUri").isNotEmpty())
                .andExpect(jsonPath("$.bookingReference").value(booking.bookingReference()));
    }

    // -------------------------------------------------------------------------
    // 10. Booking Cancellation Releases Seats While Preserving Historical Record
    // -------------------------------------------------------------------------
    @Test
    @Order(10)
    void test10_cancellationReleasesSeatsAndPreservesHistory() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        AuthResponse attendee1 = registerUser("Attendee 1", "att1@test.dev", "Pass123!", Role.ATTENDEE);
        AuthResponse attendee2 = registerUser("Attendee 2", "att2@test.dev", "Pass123!", Role.ATTENDEE);
        EventResponse event = createSampleEvent(organizer.token(), 2, 3);

        Long seatId = seatRepository.findByEventIdOrderByIdAsc(event.id()).get(0).getId();
        HoldResponse hold1 = seatBookingService.createTemporaryHold(attendee1.user().id(), new HoldRequest(event.id(), List.of(seatId)));
        BookingResponse booking1 = seatBookingService.confirmBooking(attendee1.user().id(), new ConfirmBookingRequest(hold1.holdId()));

        // Cancel booking via REST API
        mockMvc.perform(post("/api/bookings/" + booking1.id() + "/cancel")
                        .header("Authorization", "Bearer " + attendee1.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        // Historical booking & booking_item records remain in PostgreSQL
        assertThat(bookingRepository.findById(booking1.id())).isPresent();
        assertThat(bookingRepository.findById(booking1.id()).orElseThrow().getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(seatRepository.findById(seatId).orElseThrow().getStatus()).isEqualTo(SeatStatus.AVAILABLE);

        // Attendee 2 can now hold and confirm the released seat!
        HoldResponse hold2 = seatBookingService.createTemporaryHold(attendee2.user().id(), new HoldRequest(event.id(), List.of(seatId)));
        BookingResponse booking2 = seatBookingService.confirmBooking(attendee2.user().id(), new ConfirmBookingRequest(hold2.holdId()));
        assertThat(booking2.status()).isEqualTo(BookingStatus.CONFIRMED);
    }

    // -------------------------------------------------------------------------
    // 11. Configurable Booking Settings Enforcement (Max Seats & Hold Duration)
    // -------------------------------------------------------------------------
    @Test
    @Order(11)
    void test11_configurableMaxSeatsAndHoldDurationEnforced() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        AuthResponse attendee = registerUser("Attendee", "att@test.dev", "Pass123!", Role.ATTENDEE);
        EventResponse event = createSampleEvent(organizer.token(), 3, 4);

        // Organizer updates maxSeatsPerBooking = 2 and holdDurationMinutes = 10
        SettingsUpdateRequest updateReq = new SettingsUpdateRequest(2, 10);
        mockMvc.perform(put("/api/settings")
                        .header("Authorization", "Bearer " + organizer.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maxSeatsPerBooking").value(2))
                .andExpect(jsonPath("$.holdDurationMinutes").value(10));

        List<Seat> seats = seatRepository.findByEventIdOrderByIdAsc(event.id());

        // Attempting to hold 3 seats must fail with 400 Bad Request
        HoldRequest threeSeats = new HoldRequest(event.id(), List.of(seats.get(0).getId(), seats.get(1).getId(), seats.get(2).getId()));
        mockMvc.perform(post("/api/holds")
                        .header("Authorization", "Bearer " + attendee.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(threeSeats)))
                .andExpect(status().isBadRequest());

        // Holding 2 seats succeeds and uses the updated 10-minute (600s) hold duration
        HoldResponse twoSeatsHold = seatBookingService.createTemporaryHold(
                attendee.user().id(),
                new HoldRequest(event.id(), List.of(seats.get(0).getId(), seats.get(1).getId()))
        );
        assertThat(twoSeatsHold.remainingSeconds()).isEqualTo(600L);
    }

    // -------------------------------------------------------------------------
    // 12. Sequential Double-Booking Prevention (Already Held or Booked Seat)
    // -------------------------------------------------------------------------
    @Test
    @Order(12)
    void test12_sequentialDoubleBookingPrevention() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        AuthResponse attendeeA = registerUser("Attendee A", "atta@test.dev", "Pass123!", Role.ATTENDEE);
        AuthResponse attendeeB = registerUser("Attendee B", "attb@test.dev", "Pass123!", Role.ATTENDEE);
        EventResponse event = createSampleEvent(organizer.token(), 2, 4);

        Long seatA1 = seatRepository.findByEventIdOrderByIdAsc(event.id()).get(0).getId();

        // Attendee A holds seat A1
        HoldResponse holdA = seatBookingService.createTemporaryHold(attendeeA.user().id(), new HoldRequest(event.id(), List.of(seatA1)));

        // Attendee B tries to hold A1 while HELD -> 409 Conflict
        mockMvc.perform(post("/api/holds")
                        .header("Authorization", "Bearer " + attendeeB.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new HoldRequest(event.id(), List.of(seatA1)))))
                .andExpect(status().isConflict());

        // Attendee B tries to confirm Attendee A's hold -> 403 Forbidden
        mockMvc.perform(post("/api/bookings/confirm")
                        .header("Authorization", "Bearer " + attendeeB.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ConfirmBookingRequest(holdA.holdId()))))
                .andExpect(status().isForbidden());

        // Attendee A confirms A1 -> BOOKED
        seatBookingService.confirmBooking(attendeeA.user().id(), new ConfirmBookingRequest(holdA.holdId()));

        // Attendee B tries to hold A1 after BOOKED -> 409 Conflict
        mockMvc.perform(post("/api/holds")
                        .header("Authorization", "Bearer " + attendeeB.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new HoldRequest(event.id(), List.of(seatA1)))))
                .andExpect(status().isConflict());
    }

    // -------------------------------------------------------------------------
    // 13. CRITICAL CONCURRENCY TEST: Simultaneous Competing Requests on PostgreSQL
    // -------------------------------------------------------------------------
    @Test
    @Order(13)
    void test13_concurrentRequestsForSameSeatInPostgreSQLOnlyOneSucceeds() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        EventResponse event = createSampleEvent(organizer.token(), 2, 4);
        Long targetSeatId = seatRepository.findByEventIdOrderByIdAsc(event.id()).get(0).getId();

        int contenderCount = 10;
        List<Long> attendeeIds = new ArrayList<>();
        for (int i = 0; i < contenderCount; i++) {
            AuthResponse att = registerUser("Contender " + i, "contender" + i + "@test.dev", "Pass123!", Role.ATTENDEE);
            attendeeIds.add(att.user().id());
        }

        ExecutorService pool = Executors.newFixedThreadPool(contenderCount);
        CountDownLatch readyLatch = new CountDownLatch(contenderCount);
        CountDownLatch startGun = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<HoldResponse> winningHolds = new ConcurrentLinkedQueue<>();
        ConcurrentLinkedQueue<Throwable> unexpectedErrors = new ConcurrentLinkedQueue<>();

        for (Long attendeeId : attendeeIds) {
            pool.submit(() -> {
                readyLatch.countDown();
                try {
                    startGun.await();
                    HoldResponse hold = seatBookingService.createTemporaryHold(
                            attendeeId,
                            new HoldRequest(event.id(), List.of(targetSeatId))
                    );
                    winningHolds.add(hold);
                    successCount.incrementAndGet();
                } catch (SeatConflictException ex) {
                    conflictCount.incrementAndGet();
                } catch (Throwable t) {
                    unexpectedErrors.add(t);
                }
            });
        }

        assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();
        startGun.countDown(); // Fire all 10 concurrent PostgreSQL transactions simultaneously!
        pool.shutdown();
        assertThat(pool.awaitTermination(15, TimeUnit.SECONDS)).isTrue();

        assertThat(unexpectedErrors).isEmpty();
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(contenderCount - 1);
        assertThat(winningHolds).hasSize(1);

        // Confirm the winning hold and verify exactly 1 confirmed booking exists in PostgreSQL
        HoldResponse winner = winningHolds.peek();
        BookingResponse confirmed = seatBookingService.confirmBooking(
                winner.userId(),
                new ConfirmBookingRequest(winner.holdId())
        );
        assertThat(confirmed.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(bookingRepository.countByEventIdAndStatus(event.id(), BookingStatus.CONFIRMED)).isEqualTo(1L);
        assertThat(seatRepository.findById(targetSeatId).orElseThrow().getStatus()).isEqualTo(SeatStatus.BOOKED);
    }

    // -------------------------------------------------------------------------
    // 14. Rejection of Confirmation After Hold Expiration
    // -------------------------------------------------------------------------
    @Test
    @Order(14)
    void test14_rejectConfirmationAfterHoldExpiration() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        AuthResponse attendee = registerUser("Attendee", "att@test.dev", "Pass123!", Role.ATTENDEE);
        EventResponse event = createSampleEvent(organizer.token(), 2, 4);

        Long seatId = seatRepository.findByEventIdOrderByIdAsc(event.id()).get(0).getId();
        HoldResponse hold = seatBookingService.createTemporaryHold(attendee.user().id(), new HoldRequest(event.id(), List.of(seatId)));

        // Advance time past the 5-minute expiration BEFORE cleanup scheduler runs
        mutableClock.advance(Duration.ofMinutes(5).plusSeconds(5));

        // Attempting to confirm an expired hold MUST fail with 410 Gone and release the seat
        mockMvc.perform(post("/api/bookings/confirm")
                        .header("Authorization", "Bearer " + attendee.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ConfirmBookingRequest(hold.holdId()))))
                .andExpect(status().isGone());

        assertThat(seatRepository.findById(seatId).orElseThrow().getStatus()).isEqualTo(SeatStatus.AVAILABLE);
    }

    // -------------------------------------------------------------------------
    // 15. Multi-Seat Overlapping Lock-Order Concurrency Test (Deadlock Prevention)
    // -------------------------------------------------------------------------
    @Test
    @Order(15)
    void test15_overlappingMultiSeatConcurrentRequestsReverseOrderNoDeadlock() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        AuthResponse attendeeA = registerUser("Attendee A", "atta@test.dev", "Pass123!", Role.ATTENDEE);
        AuthResponse attendeeB = registerUser("Attendee B", "attb@test.dev", "Pass123!", Role.ATTENDEE);
        EventResponse event = createSampleEvent(organizer.token(), 2, 4);

        List<Seat> seats = seatRepository.findByEventIdOrderByIdAsc(event.id());
        Long s1 = seats.get(0).getId();
        Long s2 = seats.get(1).getId();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger conflicts = new AtomicInteger(0);

        // Attendee A requests [s1, s2], Attendee B requests [s2, s1] in reverse order
        Future<?> f1 = pool.submit(() -> {
            try {
                start.await();
                seatBookingService.createTemporaryHold(attendeeA.user().id(), new HoldRequest(event.id(), List.of(s1, s2)));
                successes.incrementAndGet();
            } catch (SeatConflictException e) {
                conflicts.incrementAndGet();
            } catch (InterruptedException ignored) {
            }
        });
        Future<?> f2 = pool.submit(() -> {
            try {
                start.await();
                seatBookingService.createTemporaryHold(attendeeB.user().id(), new HoldRequest(event.id(), List.of(s2, s1)));
                successes.incrementAndGet();
            } catch (SeatConflictException e) {
                conflicts.incrementAndGet();
            } catch (InterruptedException ignored) {
            }
        });

        start.countDown();
        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(successes.get()).isEqualTo(1);
        assertThat(conflicts.get()).isEqualTo(1);
    }

    // -------------------------------------------------------------------------
    // 16. Organizer Gate Check-In & Cryptographic Ticket Verification
    // -------------------------------------------------------------------------
    @Test
    @Order(16)
    void test16_organizerGateCheckInVerificationAndTamperDetection() throws Exception {
        AuthResponse organizer = registerUser("Organizer", "org@test.dev", "Pass123!", Role.ORGANIZER);
        AuthResponse attendee = registerUser("Attendee", "att@test.dev", "Pass123!", Role.ATTENDEE);
        EventResponse event = createSampleEvent(organizer.token(), 2, 4);

        Long seatId = seatRepository.findByEventIdOrderByIdAsc(event.id()).get(0).getId();
        HoldResponse hold = seatBookingService.createTemporaryHold(attendee.user().id(), new HoldRequest(event.id(), List.of(seatId)));
        BookingResponse booking = seatBookingService.confirmBooking(attendee.user().id(), new ConfirmBookingRequest(hold.holdId()));

        // Fetch signed digital ticket
        MvcResult ticketRes = mockMvc.perform(get("/api/bookings/" + booking.id() + "/ticket")
                        .header("Authorization", "Bearer " + attendee.token()))
                .andExpect(status().isOk())
                .andReturn();
        TicketResponse ticket = objectMapper.readValue(ticketRes.getResponse().getContentAsString(), TicketResponse.class);

        // Tampered QR signature MUST fail verification
        CheckInVerifyRequest tamperedReq = new CheckInVerifyRequest(
                ticket.qrPayload().replace(ticket.verificationHash(), "DEADBEEF00000000"),
                true
        );
        mockMvc.perform(post("/api/organizer/tickets/verify")
                        .header("Authorization", "Bearer " + organizer.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tamperedReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.outcome").value("INVALID_SIGNATURE"));

        // Authentic QR payload checks in attendee on first scan
        CheckInVerifyRequest validReq = new CheckInVerifyRequest(ticket.qrPayload(), true);
        mockMvc.perform(post("/api/organizer/tickets/verify")
                        .header("Authorization", "Bearer " + organizer.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.signatureVerified").value(true))
                .andExpect(jsonPath("$.outcome").value("CHECKED_IN"));

        // Second scan detects duplicate entry attempt
        mockMvc.perform(post("/api/organizer/tickets/verify")
                        .header("Authorization", "Bearer " + organizer.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alreadyCheckedIn").value(true))
                .andExpect(jsonPath("$.outcome").value("ALREADY_CHECKED_IN"));
    }
}
