package com.cardinality.eventbooking.dto;

import com.cardinality.eventbooking.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank(message = "Full name is required")
            @Size(min = 2, max = 120, message = "Name must be between 2 and 120 characters")
            String name,

            @NotBlank(message = "Email address is required")
            @Email(message = "Please provide a valid email address")
            String email,

            @NotBlank(message = "Password is required")
            @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
            String password,

            @NotNull(message = "User role (ORGANIZER or ATTENDEE) is required")
            Role role
    ) {}

    public record LoginRequest(
            @NotBlank(message = "Email address is required")
            @Email(message = "Please provide a valid email address")
            String email,

            @NotBlank(message = "Password is required")
            String password
    ) {}

    public record UserProfileResponse(
            Long id,
            String name,
            String email,
            Role role,
            Instant createdAt
    ) {}

    public record AuthResponse(
            String token,
            String tokenType,
            UserProfileResponse user
    ) {}
}
