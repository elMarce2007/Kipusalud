package com.kipusalud.authservice.controller;

import com.kipusalud.authservice.dto.DemoSessionResponse;
import com.kipusalud.authservice.service.DemoSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/demo")
public class DemoSessionController {

    private final DemoSessionService demoSessionService;

    public DemoSessionController(DemoSessionService demoSessionService) {
        this.demoSessionService = demoSessionService;
    }

    @PostMapping("/sessions")
    public ResponseEntity<DemoSessionResponse> crearSesion() {
        return ResponseEntity.ok(demoSessionService.crearSesion());
    }
}
