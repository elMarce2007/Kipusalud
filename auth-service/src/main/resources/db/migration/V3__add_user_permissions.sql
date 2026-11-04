CREATE TABLE usuario_permisos (
    usuario_id BIGINT NOT NULL,
    permiso VARCHAR(50) NOT NULL,
    CONSTRAINT fk_usuario_permisos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT pk_usuario_permisos PRIMARY KEY (usuario_id, permiso)
);
