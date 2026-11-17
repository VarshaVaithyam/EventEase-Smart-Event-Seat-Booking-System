package com.cardinality.eventbooking.util;

import java.security.SecureRandom;

public final class SeatLabelGenerator {

    private static final String ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private SeatLabelGenerator() {
    }

    /**
     * Converts 0-based row index to auditorium row label (0 -> A, 25 -> Z, 26 -> AA).
     */
    public static String toRowLabel(int rowIndex) {
        if (rowIndex < 0) {
            throw new IllegalArgumentException("Row index cannot be negative");
        }
        StringBuilder sb = new StringBuilder();
        int n = rowIndex;
        while (n >= 0) {
            sb.insert(0, (char) ('A' + (n % 26)));
            n = (n / 26) - 1;
        }
        return sb.toString();
    }

    public static String toSeatCode(String rowLabel, int seatNumber) {
        return rowLabel + seatNumber;
    }

    public static String generateBookingReference() {
        StringBuilder sb = new StringBuilder("EVE-");
        for (int i = 0; i < 8; i++) {
            sb.append(ALPHANUM.charAt(RANDOM.nextInt(ALPHANUM.length())));
        }
        return sb.toString();
    }
}
