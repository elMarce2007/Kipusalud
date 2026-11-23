-- Comprobante de pago elegido al registrar la venta:
-- BOLETA_INTERNA (no va a SUNAT), BOLETA_ELECTRONICA (03) o FACTURA (01).
-- Todos los cambios son aditivos para que la versión anterior del servicio siga funcionando.

ALTER TABLE ventas
    ADD COLUMN tipo_comprobante VARCHAR(20) NOT NULL DEFAULT 'BOLETA_INTERNA',
    ADD COLUMN serie_comprobante VARCHAR(4),
    ADD COLUMN numero_comprobante VARCHAR(8),
    ALTER COLUMN cliente_id DROP NOT NULL;

ALTER TABLE ventas
    ADD CONSTRAINT ck_ventas_tipo_comprobante
        CHECK (tipo_comprobante IN ('BOLETA_INTERNA', 'BOLETA_ELECTRONICA', 'FACTURA'));

CREATE UNIQUE INDEX uk_ventas_numero_comprobante
    ON ventas (farmacia_id, serie_comprobante, numero_comprobante)
    WHERE numero_comprobante IS NOT NULL;

-- Correlativo de la boleta interna. Independiente del perfil fiscal para que una
-- farmacia sin datos SUNAT pueda emitir boletas internas desde el primer día.
CREATE TABLE correlativos_comprobante (
    farmacia_id BIGINT NOT NULL,
    serie VARCHAR(4) NOT NULL,
    siguiente_numero BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT pk_correlativos_comprobante PRIMARY KEY (farmacia_id, serie)
);

-- Perfil fiscal de la farmacia: los datos del emisor se guardan sin exigir los
-- secretos; las credenciales SOL y el certificado se registran por separado.
ALTER TABLE sunat_configuraciones
    ALTER COLUMN sol_usuario_cifrado DROP NOT NULL,
    ALTER COLUMN sol_clave_cifrada DROP NOT NULL,
    ALTER COLUMN certificado_cifrado DROP NOT NULL,
    ALTER COLUMN certificado_clave_cifrada DROP NOT NULL,
    ADD COLUMN serie_boleta VARCHAR(4),
    ADD COLUMN siguiente_numero_boleta BIGINT NOT NULL DEFAULT 1,
    ADD COLUMN telefono VARCHAR(30),
    ADD COLUMN email VARCHAR(120);
