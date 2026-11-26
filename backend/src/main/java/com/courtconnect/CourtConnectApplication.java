package com.courtconnect;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
@SpringBootApplication @EnableScheduling   // Increment 3: expiring unpaid holds, topping up time slots
public class CourtConnectApplication { public static void main(String[] a){ SpringApplication.run(CourtConnectApplication.class,a);} }
