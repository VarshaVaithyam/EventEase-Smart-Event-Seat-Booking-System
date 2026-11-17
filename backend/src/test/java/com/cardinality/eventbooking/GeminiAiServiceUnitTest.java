package com.cardinality.eventbooking;

import com.cardinality.eventbooking.dto.BookingDtos.AiDescriptionRequest;
import com.cardinality.eventbooking.dto.BookingDtos.AiDescriptionResponse;
import com.cardinality.eventbooking.service.GeminiAiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeminiAiServiceUnitTest {

    @Test
    void fallbackTemplateGeneratedWhenApiKeyMissing() {
        RestClient mockRestClient = Mockito.mock(RestClient.class);
        GeminiAiService service = new GeminiAiService(
                mockRestClient,
                new ObjectMapper(),
                "",
                "gemini-2.0-flash",
                "https://generativelanguage.googleapis.com/v1beta/models"
        );

        AiDescriptionResponse res = service.generateEventDescription(new AiDescriptionRequest(
                "TENSORA 2K26",
                "AI Innovation Hackathon",
                "KLN College Auditorium",
                "Artificial Intelligence, Innovation, Students"
        ));

        assertThat(res.description()).contains("TENSORA 2K26");
        assertThat(res.description()).contains("KLN College Auditorium");
        assertThat(res.source()).isEqualTo("TEMPLATE_FALLBACK");
    }

    @Test
    void blankEventNameRejected() {
        RestClient mockRestClient = Mockito.mock(RestClient.class);
        GeminiAiService service = new GeminiAiService(
                mockRestClient,
                new ObjectMapper(),
                "",
                "gemini-2.0-flash",
                "https://generativelanguage.googleapis.com/v1beta/models"
        );

        assertThatThrownBy(() -> service.generateEventDescription(
                new AiDescriptionRequest("   ", "Tech", "Venue", "AI")
        )).hasMessageContaining("Event name is required");
    }
}
