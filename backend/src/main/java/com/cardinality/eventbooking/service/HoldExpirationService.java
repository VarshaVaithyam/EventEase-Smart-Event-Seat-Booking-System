package com.cardinality.eventbooking.service;

import com.cardinality.eventbooking.entity.Seat;
import com.cardinality.eventbooking.entity.SeatHold;
import com.cardinality.eventbooking.enums.HoldStatus;
import com.cardinality.eventbooking.enums.SeatStatus;
import com.cardinality.eventbooking.repository.SeatHoldRepository;
import com.cardinality.eventbooking.repository.SeatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

@Service
public class HoldExpirationService {

    private static final Logger log = LoggerFactory.getLogger(HoldExpirationService.class);

    private final SeatHoldRepository seatHoldRepository;
    private final SeatRepository seatRepository;
    private final Clock clock;

    public HoldExpirationService(
            SeatHoldRepository seatHoldRepository,
            SeatRepository seatRepository,
            Clock clock
    ) {
        this.seatHoldRepository = seatHoldRepository;
        this.seatRepository = seatRepository;
        this.clock = clock;
    }

    /**
     * Safely releases all expired holds and returns locked held seats back to AVAILABLE.
     * Uses pessimistic row-level locks (SELECT ... FOR UPDATE) in deterministic ID order.
     */
    @Transactional
    public int releaseExpiredHolds() {
        Instant now = Instant.now(clock);
        List<Seat> expiredSeats = seatRepository.findExpiredHeldSeatsForUpdate(now);
        List<SeatHold> expiredHolds = seatHoldRepository.findExpiredActiveHoldsForUpdate(now);

        for (Seat seat : expiredSeats) {
            if (seat.getStatus() == SeatStatus.HELD && seat.getHoldExpiresAt() != null && !seat.getHoldExpiresAt().isAfter(now)) {
                seat.releaseToAvailable();
            }
        }
        if (!expiredSeats.isEmpty()) {
            seatRepository.saveAll(expiredSeats);
        }

        for (SeatHold hold : expiredHolds) {
            if (hold.getStatus() == HoldStatus.ACTIVE && !hold.getExpiresAt().isAfter(now)) {
                hold.setStatus(HoldStatus.EXPIRED);
                List<Seat> holdSeats = seatRepository.findByCurrentHoldIdForUpdate(hold.getId());
                for (Seat seat : holdSeats) {
                    if (seat.getStatus() == SeatStatus.HELD) {
                        seat.releaseToAvailable();
                    }
                }
                if (!holdSeats.isEmpty()) {
                    seatRepository.saveAll(holdSeats);
                }
            }
        }
        if (!expiredHolds.isEmpty()) {
            seatHoldRepository.saveAll(expiredHolds);
            log.info("Released {} expired temporary hold(s) at {}", expiredHolds.size(), now);
        }
        return expiredHolds.size();
    }
}
