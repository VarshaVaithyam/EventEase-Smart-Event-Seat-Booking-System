package com.cardinality.eventbooking.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Clock;

@Configuration
public class AppConfig {

    /**
     * Injectable Java Clock bean used across all expiration, hold, booking, and validation
     * workflows so automated tests can inject a deterministic fixed/mutable clock without
     * waiting 5 real minutes.
     */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    public RestClient restClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(6000);
        factory.setReadTimeout(15000);
        return RestClient.builder()
                .requestFactory(factory)
                .build();
    }
}
