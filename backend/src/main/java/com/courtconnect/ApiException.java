package com.courtconnect;
import org.springframework.http.HttpStatus;
import java.util.Map;

/** Business-rule error with an HTTP status and, optionally, the form field it belongs to. */
public class ApiException extends RuntimeException {
  private final HttpStatus status;
  private final Map<String,String> fieldErrors;

  public ApiException(HttpStatus status, String message){ super(message); this.status=status; this.fieldErrors=Map.of(); }
  public ApiException(HttpStatus status, String field, String message){ super(message); this.status=status; this.fieldErrors=Map.of(field, message); }

  public HttpStatus getStatus(){ return status; }
  public Map<String,String> getFieldErrors(){ return fieldErrors; }
}
