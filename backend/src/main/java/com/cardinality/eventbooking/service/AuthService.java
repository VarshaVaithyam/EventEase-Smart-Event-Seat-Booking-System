package com.cardinality.eventbooking.service;

import com.cardinality.eventbooking.dto.AuthDtos.*;
import com.cardinality.eventbooking.entity.BookingSettings;
import com.cardinality.eventbooking.entity.User;
import com.cardinality.eventbooking.enums.Role;
import com.cardinality.eventbooking.exception.BadRequestException;
import com.cardinality.eventbooking.exception.ResourceNotFoundException;
import com.cardinality.eventbooking.repository.BookingSettingsRepository;
import com.cardinality.eventbooking.repository.UserRepository;
import com.cardinality.eventbooking.security.CustomUserDetails;
import com.cardinality.eventbooking.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BookingSettingsRepository settingsRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final Clock clock;

    public AuthService(
            UserRepository userRepository,
            BookingSettingsRepository settingsRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenProvider jwtTokenProvider,
            Clock clock
    ) {
        this.userRepository = userRepository;
        this.settingsRepository = settingsRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.clock = clock;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new BadRequestException("An account with this email address already exists");
        }

        User user = new User(
                request.name().trim(),
                normalizedEmail,
                passwordEncoder.encode(request.password()),
                request.role(),
                Instant.now(clock)
        );
        user = userRepository.save(user);

        if (user.getRole() == Role.ORGANIZER) {
            settingsRepository.save(new BookingSettings(
                    user,
                    BookingSettings.DEFAULT_MAX_SEATS,
                    BookingSettings.DEFAULT_HOLD_MINUTES
            ));
        }

        CustomUserDetails principal = new CustomUserDetails(user);
        String token = jwtTokenProvider.generateToken(principal);
        return new AuthResponse(token, "Bearer", toProfile(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(), request.password())
        );
        CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String token = jwtTokenProvider.generateToken(principal);
        return new AuthResponse(token, "Bearer", toProfile(user));
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toProfile(user);
    }

    private UserProfileResponse toProfile(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}
