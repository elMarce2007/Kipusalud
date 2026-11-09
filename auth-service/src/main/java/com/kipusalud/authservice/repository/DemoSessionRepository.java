package com.kipusalud.authservice.repository;

import com.kipusalud.authservice.entity.DemoSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DemoSessionRepository extends JpaRepository<DemoSession, UUID> {
    List<DemoSession> findAllByExpiraEnBefore(Instant instant);
    long countByExpiraEnAfter(Instant instant);
    Optional<DemoSession> findByFarmaciaId(Long farmaciaId);
}
