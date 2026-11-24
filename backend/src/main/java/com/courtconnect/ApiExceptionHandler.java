package com.courtconnect;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Every API error uses the same JSON shape:
 * { "timestamp", "status", "error", "message", "path", "fieldErrors": { field: message } }
 * "message" is always present (the frontend shows it); "fieldErrors" only for form problems.
 */
@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  public static Map<String,Object> body(HttpStatus status, String message, String path, Map<String,String> fieldErrors){
    Map<String,Object> b = new LinkedHashMap<>();
    b.put("timestamp", Instant.now().toString());
    b.put("status", status.value());
    b.put("error", status.getReasonPhrase());
    b.put("message", message);
    b.put("path", path);
    if (fieldErrors != null && !fieldErrors.isEmpty()) b.put("fieldErrors", fieldErrors);
    return b;
  }

  private static ResponseEntity<Map<String,Object>> respond(HttpStatus s, String msg, HttpServletRequest req, Map<String,String> fields){
    return ResponseEntity.status(s).body(body(s, msg, req.getRequestURI(), fields));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String,Object>> invalid(MethodArgumentNotValidException e, HttpServletRequest req){
    Map<String,String> fields = new LinkedHashMap<>();
    // One message per field. "Required" (@NotBlank) wins, so an empty password says "Enter a password."
    // rather than the strength rule.
    e.getBindingResult().getFieldErrors().forEach(f -> {
      if ("NotBlank".equals(f.getCode())) fields.put(f.getField(), f.getDefaultMessage());
      else fields.putIfAbsent(f.getField(), f.getDefaultMessage());
    });
    String first = fields.values().stream().findFirst().orElse("Check the form and try again.");
    return respond(HttpStatus.BAD_REQUEST, first, req, fields);
  }

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String,Object>> api(ApiException e, HttpServletRequest req){
    return respond(e.getStatus(), e.getMessage(), req, e.getFieldErrors());
  }

  @ExceptionHandler(ResponseStatusException.class)   // used by Increment 1 AuthController
  public ResponseEntity<Map<String,Object>> status(ResponseStatusException e, HttpServletRequest req){
    HttpStatus s = HttpStatus.valueOf(e.getStatusCode().value());
    return respond(s, e.getReason() != null ? e.getReason() : s.getReasonPhrase(), req, null);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String,Object>> unreadable(HttpMessageNotReadableException e, HttpServletRequest req){
    return respond(HttpStatus.BAD_REQUEST, "The request body is missing or not valid JSON.", req, null);
  }

  @ExceptionHandler(DataIntegrityViolationException.class)   // e.g. two requests racing for the same email
  public ResponseEntity<Map<String,Object>> conflict(DataIntegrityViolationException e, HttpServletRequest req){
    return respond(HttpStatus.CONFLICT, "That change conflicts with existing data. Please try again.", req, null);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String,Object>> unexpected(Exception e, HttpServletRequest req){
    if (e instanceof ErrorResponse er) {   // Spring's own 404 / 405 / 415 etc. keep their status
      HttpStatus s = HttpStatus.valueOf(er.getStatusCode().value());
      return respond(s, s.getReasonPhrase(), req, null);
    }
    log.error("Unexpected error on {}", req.getRequestURI(), e);
    return respond(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong on our side. Please try again.", req, null);
  }
}
