package com.kipusalud.authservice.repository;

import com.kipusalud.authservice.entity.CodigoRecuperacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CodigoRecuperacionRepository extends JpaRepository<CodigoRecuperacion, Long> {
    Optional<CodigoRecuperacion> findFirstByUsuarioIdAndUsadoEnIsNullOrderByCreadoEnDesc(Long usuarioId);

    List<CodigoRecuperacion> findAllByUsuarioIdAndUsadoEnIsNull(Long usuarioId);
}
