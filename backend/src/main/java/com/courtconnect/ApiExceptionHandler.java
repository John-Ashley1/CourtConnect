package com.courtconnect;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String,String>> invalid(MethodArgumentNotValidException e){
    String m = e.getBindingResult().getFieldErrors().stream().findFirst().map(f -> f.getDefaultMessage()).orElse("Check the form and try again.");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", m));
  }
}
