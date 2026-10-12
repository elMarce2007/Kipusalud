package com.kipusalud.authservice.repository;

import com.kipusalud.authservice.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    boolean existsByUsername(String username);
    List<Usuario> findAllByFarmaciaIdOrderByUsername(Long farmaciaId);
    boolean existsByFarmaciaIdAndUsername(Long farmaciaId, String username);
}
