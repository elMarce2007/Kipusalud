# Emisión electrónica SUNAT

Al registrar una venta se elige el **comprobante de pago**: boleta interna (no va a
SUNAT, correlativo `I001-…`), boleta electrónica (tipo `03`) o factura (tipo `01`).
Los electrónicos se emiten por el SEE del contribuyente apenas la venta se confirma:
se genera XML UBL 2.1, se firma con un certificado PKCS#12, se empaqueta en ZIP y se
usa `sendBill` de SOAP 1.1. La boleta electrónica se envía de forma individual
(sin resumen diario); **verificar en el beta de SUNAT antes de usarla en producción**. El entorno predeterminado es
beta. La URL de producción no está configurada y la emisión en producción
permanece desactivada deliberadamente.

## Configuración de despliegue

Defina `SUNAT_MASTER_KEY` como una clave Base64 de exactamente 32 bytes (por
ejemplo, generada con `openssl rand -base64 32`). En despliegues reales,
inyéctela desde un gestor de secretos, no desde el repositorio. La clave debe
permanecer estable: las credenciales y el certificado ya guardados por cada
farmacia no se podrán descifrar si se reemplaza.

`SUNAT_ENVIRONMENT` acepta `BETA` o `PRODUCCION`. Beta utiliza el WSDL oficial
`https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService`; producción
requiere configurar `SUNAT_PRODUCTION_URL` y habilitar explícitamente
`SUNAT_PRODUCTION_ENABLED=true` después de verificar el endpoint y completar
las pruebas de homologación. El endpoint beta no debe reutilizarse en
producción.

## Configuración por farmacia

El administrador lo configura en la interfaz en **Administración → Datos fiscales y
SUNAT**, en dos pasos independientes (la API también admite `QF_REGENTE`):

1. `PUT /api/ventas/facturacion/configuracion` — perfil fiscal: `ruc`, `razonSocial`,
   `direccionFiscal`, `ubigeo`, `departamento`, `provincia`, `distrito`,
   `serieFactura` (`F###`), `serieBoleta` (`B###`), y opcionales `telefono`, `email`.
2. `PUT /api/ventas/facturacion/configuracion/credenciales` — `usuarioSol`,
   `claveSol`, `certificadoPkcs12Base64`, `claveCertificado`.

Mientras falte alguno de los dos, el punto de venta solo ofrece la boleta interna.
Al cambiar una serie, la numeración continúa después del último comprobante emitido
en ella.

El servicio valida que el archivo sea PKCS#12 e incluya una clave privada.
Credenciales y certificado se cifran con AES-256-GCM antes de persistirlos.
La respuesta de configuración no contiene secretos.

## Datos requeridos antes de emitir

- Cada producto que se facture debe tener `afectacionIgv` del Catálogo 07 de
  SUNAT y `precioIncluyeIgv` configurados. La primera versión admite códigos
  `10` (gravado, operación onerosa), `20` (exonerado, operación onerosa) y
  `30` (inafecto, operación onerosa). Se establecen en la API de productos;
  empleados no pueden cambiarlos. Otros códigos de afectación aún no se
  admiten.
- Factura: el cliente necesita `ruc` de 11 dígitos, `razonSocial` y
  `direccionFiscal`, campos disponibles en el API de clientes.
- Boleta electrónica: cliente opcional; sin cliente se emite a "clientes varios"
  (catálogo 06, código `-`), permitido solo por debajo de S/ 700. Desde S/ 700 se
  exige un cliente con DNI.
- Solo se emiten ventas con estado `CONFIRMADA`; las ventas antiguas sin
  snapshots tributarios de sus líneas no son facturables.

Cuando el precio gravado excluye IGV, el servicio calcula el IGV al confirmar la
venta para que el total pagado coincida con el importe de la factura. Si el
precio ya incluye IGV, el sistema separa base e impuesto al construir el XML.

## API de comprobantes

- `POST /api/ventas/{ventaId}/factura-electronica`: prepara y envía la factura.
- `GET /api/ventas/{ventaId}/factura-electronica`: consulta su estado local.
- `POST /api/ventas/{ventaId}/factura-electronica/consultar-sunat`: usa
  `getStatusAR` para reconciliar un resultado incierto.
- `GET /api/ventas/{ventaId}/factura-electronica/cdr`: descarga el CDR ZIP
  recibido, cuando exista.

Estados locales: `PREPARADA`, `ENVIANDO`, `ACEPTADA`, `RECHAZADA` y
`RESULTADO_DESCONOCIDO`. Ante timeout o respuesta ilegible, no se reenvía
automáticamente; primero debe consultarse SUNAT para evitar duplicados. El
correlativo se reserva bajo bloqueo transaccional por farmacia.

## Validación previa a producción

El WSDL beta confirma los contratos SOAP 1.1 y las acciones `urn:sendBill` y
`urn:getStatusAR`. Antes de habilitar producción, se debe validar la generación
contra los XSD y catálogos SUNAT vigentes, confirmar la compatibilidad de la
firma digital requerida por el perfil actual, ejecutar casos de homologación
con certificados/credenciales de prueba y validar las reglas fiscales con un
especialista. Esta implementación no debe considerarse certificada para
producción hasta superar esas pruebas.
