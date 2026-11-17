package com.cardinality.eventbooking.service;

import com.cardinality.eventbooking.dto.BookingDtos.SettingsResponse;
import com.cardinality.eventbooking.dto.BookingDtos.SettingsUpdateRequest;
import com.cardinality.eventbooking.entity.BookingSettings;
import com.cardinality.eventbooking.entity.User;
import com.cardinality.eventbooking.enums.Role;
import com.cardinality.eventbooking.exception.BadRequestException;
import com.cardinality.eventbooking.exception.ForbiddenOperationException;
import com.cardinality.eventbooking.exception.ResourceNotFoundException;
import com.cardinality.eventbooking.repository.BookingSettingsRepository;
import com.cardinality.eventbooking.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private final BookingSettingsRepository settingsRepository;
    private final UserRepository userRepository;

    public SettingsService(BookingSettingsRepository settingsRepository, UserRepository userRepository) {
        this.settingsRepository = settingsRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public BookingSettings getOrCreateEntityForOrganizer(Long organizerId) {
        return settingsRepository.findByOrganizerId(organizerId)
                .orElseGet(() -> {
                    User organizer = userRepository.findById(organizerId)
                            .orElseThrow(() -> new ResourceNotFoundException("Organizer not found"));
                    return settingsRepository.save(new BookingSettings(
                            organizer,
                            BookingSettings.DEFAULT_MAX_SEATS,
                            BookingSettings.DEFAULT_HOLD_MINUTES
                    ));
                });
    }

    @Transactional
    public SettingsResponse getSettings(Long organizerId) {
        User user = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() != Role.ORGANIZER) {
            throw new ForbiddenOperationException("Only organizers can manage booking settings");
        }
        BookingSettings settings = getOrCreateEntityForOrganizer(organizerId);
        return toResponse(settings);
    }

    @Transactional
    public SettingsResponse updateSettings(Long organizerId, SettingsUpdateRequest request) {
        User user = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() != Role.ORGANIZER) {
            throw new ForbiddenOperationException("Only organizers can update booking settings");
        }
        if (request.maxSeatsPerBooking() == null || request.maxSeatsPerBooking() < 1 || request.maxSeatsPerBooking() > 20) {
            throw new BadRequestException("Maximum seats per booking must be between 1 and 20");
        }
        if (request.holdDurationMinutes() == null || request.holdDurationMinutes() < 1 || request.holdDurationMinutes() > 60) {
            throw new BadRequestException("Hold duration must be between 1 and 60 minutes");
        }
        BookingSettings settings = getOrCreateEntityForOrganizer(organizerId);
        settings.setMaxSeatsPerBooking(request.maxSeatsPerBooking());
        settings.setHoldDurationMinutes(request.holdDurationMinutes());
        settings = settingsRepository.save(settings);
        return toResponse(settings);
    }

    private SettingsResponse toResponse(BookingSettings s) {
        return new SettingsResponse(
                s.getId(),
                s.getOrganizer().getId(),
                s.getMaxSeatsPerBooking(),
                s.getHoldDurationMinutes(),
                s.getUpdatedAt()
        );
    }
}
