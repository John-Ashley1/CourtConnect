package com.courtconnect;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * FR-010: turns a facility's address into latitude/longitude with OpenStreetMap Nominatim
 * (free, no API key; used instead of Google Geocoding, which needs a billing account).
 * Every failure is an ApiException, so the facility is NOT saved:
 *   address not found → 400 on the "address" field · Nominatim unreachable or refusing → 502.
 * Nominatim's usage policy: identify the app (User-Agent) and stay under 1 request per second,
 * which registering facilities by hand easily does.
 */
@Component
public class Geocoder {
  public record Position(double latitude, double longitude) {}
  private static final Logger log = LoggerFactory.getLogger(Geocoder.class);

  private final RestClient http;

  public Geocoder(@Value("${app.geocoding.nominatim-url:https://nominatim.openstreetmap.org}") String baseUrl){
    SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
    f.setConnectTimeout(8000); f.setReadTimeout(10000);
    this.http = RestClient.builder().baseUrl(baseUrl.replaceAll("/+$", "")).requestFactory(f)
      .defaultHeader("User-Agent", "CourtConnect/1.0 (student project)").build();
  }

  public Position locate(String street, String city){
    JsonNode r;
    try {
      r = http.get().uri("/search?format=jsonv2&limit=1&countrycodes=ph&q={q}", street + ", " + city + ", Philippines")
        .retrieve().body(JsonNode.class);
    } catch (RestClientException e) {
      log.warn("Geocoding (Nominatim) failed: {}", e.getMessage());
      throw new ApiException(HttpStatus.BAD_GATEWAY, "The map service isn't responding, so the address couldn't be checked. The facility wasn't saved. Try again in a minute.");
    }
    if (r == null || !r.isArray() || r.isEmpty())
      throw new ApiException(HttpStatus.BAD_REQUEST, "address",
        "The map couldn't find this address. Check the spelling, or use the barangay and city (e.g. \"Lahug\" + \"Cebu City\").");
    return new Position(r.get(0).path("lat").asDouble(), r.get(0).path("lon").asDouble());
  }
}
