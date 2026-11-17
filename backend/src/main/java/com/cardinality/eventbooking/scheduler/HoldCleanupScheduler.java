package com.cardinality.eventbooking.scheduler;

import com.cardinality.eventbooking.service.HoldExpirationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class HoldCleanupScheduler {

    private final HoldExpirationService holdExpirationService;

    public HoldCleanupScheduler(HoldExpirationService holdExpirationService) {
        this.holdExpirationService = holdExpirationService;
    }

    @Scheduled(fixedDelayString = "${app.scheduler.hold-cleanup-ms:15000}")
    public void cleanupExpiredHolds() {
        holdExpirationService.releaseExpiredHolds();
    }
}
