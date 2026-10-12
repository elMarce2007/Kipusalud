package com.kipusalud.catalogoservice.repository;

import com.kipusalud.catalogoservice.entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    List<Categoria> findAllByFarmaciaIdOrderByNombreAsc(Long farmaciaId);
    Optional<Categoria> findByIdAndFarmaciaId(Long id, Long farmaciaId);
    void deleteByIdAndFarmaciaId(Long id, Long farmaciaId);
}
