package com.kipusalud.catalogoservice.repository;

import com.kipusalud.catalogoservice.entity.DomainOutboxEvent;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface DomainOutboxRepository extends JpaRepository<DomainOutboxEvent, UUID> {
    boolean existsByDedupeKey(String dedupeKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from DomainOutboxEvent e where e.publishedAt is null order by e.createdAt")
    List<DomainOutboxEvent> findPendingForUpdate(Pageable pageable);
}
