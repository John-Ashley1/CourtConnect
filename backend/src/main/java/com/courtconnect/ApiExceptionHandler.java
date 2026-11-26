package com.courtconnect;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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
    // Increment 3 bodies are snake_case JSON (@JsonNaming), so report their fields the same way (courtName → court_name).
    Object target = e.getBindingResult().getTarget();
    boolean snake = target != null && target.getClass().isAnnotationPresent(JsonNaming.class);
    // One message per field. "Required" (@NotBlank) wins, so an empty password says "Enter a password."
    // rather than the strength rule.
    e.getBindingResult().getFieldErrors().forEach(f -> {
      String name = snake ? f.getField().replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase() : f.getField();
      if ("NotBlank".equals(f.getCode())) fields.put(name, f.getDefaultMessage());
      else fields.putIfAbsent(name, f.getDefaultMessage());
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

  @ExceptionHandler(AccessDeniedException.class)   // @PreAuthorize: signed in, but the wrong role
  public ResponseEntity<Map<String,Object>> denied(AccessDeniedException e, HttpServletRequest req){
    return respond(HttpStatus.FORBIDDEN, "You don't have permission to do that.", req, null);
  }

  @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
  public ResponseEntity<Map<String,Object>> badParam(Exception e, HttpServletRequest req){
    return respond(HttpStatus.BAD_REQUEST, "Part of the address isn't valid (for example a date that isn't YYYY-MM-DD).", req, null);
  }

  @ExceptionHandler({PessimisticLockingFailureException.class, ObjectOptimisticLockingFailureException.class})
  public ResponseEntity<Map<String,Object>> busy(Exception e, HttpServletRequest req){
    return respond(HttpStatus.CONFLICT, "Someone else changed this at the same moment. Refresh and try again.", req, null);
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
