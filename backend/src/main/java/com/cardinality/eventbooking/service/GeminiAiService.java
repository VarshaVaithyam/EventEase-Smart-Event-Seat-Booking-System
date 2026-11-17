package com.cardinality.eventbooking.service;

import com.cardinality.eventbooking.dto.BookingDtos.AiDescriptionRequest;
import com.cardinality.eventbooking.dto.BookingDtos.AiDescriptionResponse;
import com.cardinality.eventbooking.exception.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class GeminiAiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiAiService.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String geminiApiKey;
    private final String geminiModel;
    private final String geminiApiUrl;

    public GeminiAiService(
            RestClient restClient,
            ObjectMapper objectMapper,
            @Value("${app.gemini.api-key:}") String geminiApiKey,
            @Value("${app.gemini.model:gemini-2.0-flash}") String geminiModel,
            @Value("${app.gemini.api-url:https://generativelanguage.googleapis.com/v1beta/models}") String geminiApiUrl
    ) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.geminiApiKey = geminiApiKey;
        this.geminiModel = geminiModel;
        this.geminiApiUrl = geminiApiUrl;
    }

    public AiDescriptionResponse generateEventDescription(AiDescriptionRequest request) {
        if (!StringUtils.hasText(request.eventName())) {
            throw new BadRequestException("Event name is required to generate an event description");
        }

        String eventName = request.eventName().trim();
        String category = StringUtils.hasText(request.category()) ? request.category().trim() : "Featured Live Event";
        String venue = StringUtils.hasText(request.venue()) ? request.venue().trim() : "Premier Venue";
        String keywords = StringUtils.hasText(request.keywords()) ? request.keywords().trim() : "Networking, Excellence, Live Experience";

        if (!StringUtils.hasText(geminiApiKey)) {
            log.info("GEMINI_API_KEY is not configured; returning structured fallback template for '{}'", eventName);
            return new AiDescriptionResponse(
                    buildStructuredDescription(eventName, category, venue, keywords),
                    "TEMPLATE_FALLBACK"
            );
        }

        String prompt = String.format(
                "Write a polished, engaging, professional 2-paragraph event description (around 120-160 words) for an upcoming event.\n" +
                "Event Name: %s\n" +
                "Category: %s\n" +
                "Venue: %s\n" +
                "Key Highlights / Keywords: %s\n" +
                "Return plain text paragraphs only without markdown headings or bullet asterisks.",
                eventName, category, venue, keywords
        );

        Map<String, Object> payload = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 350
                )
        );

        try {
            String url = String.format("%s/%s:generateContent?key=%s", geminiApiUrl, geminiModel, geminiApiKey);
            String rawJson = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (textNode.isTextual() && StringUtils.hasText(textNode.asText())) {
                return new AiDescriptionResponse(textNode.asText().trim(), "GEMINI_API");
            }
            throw new BadRequestException("Gemini API returned an empty response. Please try again or enter a description manually.");
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Gemini API call failed ({}). Returning user-friendly fallback error.", ex.getMessage());
            throw new BadRequestException(
                    "Unable to reach Google Gemini API right now. Please verify GEMINI_API_KEY / network connectivity or edit the description manually."
            );
        }
    }

    private String buildStructuredDescription(String eventName, String category, String venue, String keywords) {
        return String.format(
                "Join us at %s for %s — a premier %s experience designed to bring together passionate innovators, practitioners, and enthusiasts under one roof. " +
                "Featuring curated sessions centered around %s, this gathering offers an inspiring atmosphere with structured networking, interactive demonstrations, and high-impact takeaways.\n\n" +
                "Reserve your preferred seats early through our interactive auditorium map to guarantee front-row access. " +
                "Whether you are attending to collaborate with peers, gain practical insights, or experience standout live presentations at %s, %s promises a memorable and seamlessly organized event.",
                venue, eventName, category, keywords, venue, eventName
        );
    }
}
