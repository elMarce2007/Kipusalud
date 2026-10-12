---
schema: clarification-answers/v1
status: submitted
generated_at: "2026-10-07T19:24:49.730Z"
scope: [frontend, backend, generic]
questions_file: clarification-questions.json
---

# Rearchitecture Clarification Answers

## 🖥️ Frontend

- **F1** ¿Confirmas mantener Angular 21.1 para implementar las vistas y flujos?
  - answer: Angular 21.1
  - source: user
- **F2** ¿Qué biblioteca visual debemos mantener para las nuevas y adaptadas pantallas?
  - answer: La que sea necesaria, si se puede usar Angular Material, mejor, pero si no es posible mantenerse leal a los diseños de stitch y solo usar angular material, entonces usa otras bibliotecas.
  - source: user
- **F3** ¿Confirmas usar las pantallas Stitch exportadas como referencia y adaptar su estructura al Angular existente, dejando intactos los HTML originales?
  - answer: /home/marce/Descargas/stitch_kipusalud_inca_theme_homepage/ — exportaciones HTML de las vistas del proyecto KipuSalud
  - source: user
- **F4** ¿Confirmas conservar el tema quipu peruano ya implementado y los tokens/estilos actuales como sistema visual base?
  - answer: Mantener el tema quipu peruano existente y sus estilos en frontend/src/styles.scss; integrar las exportaciones Stitch sin alterarlas
  - source: user
- **F5** ¿Qué estándar de accesibilidad debe cumplir la interfaz?
  - answer: WCAG 2.1 AA
  - source: user
- **F6** ¿Qué navegadores se deben soportar?
  - answer: modern evergreen (Chrome, Firefox, Safari, Edge — latest 2 major versions)
  - source: user
- **F7** ¿Qué estrategia de diseño adaptable prefieres para los flujos operativos y públicos?
  - answer: Mobile-first; reutilizar el comportamiento adaptable implementado actualmente
  - source: user
- **F8** ¿Qué idiomas y formatos regionales deben incluirse?
  - answer: Interfaz en español; usar formatos locales del Perú cuando aplique
  - source: user
- **F9** ¿Confirmas conservar el manejo de estado actual con señales Angular/RxJS y servicios HTTP?
  - answer: Conservar el patrón actual de signals, RxJS y servicios Angular
  - source: user
- **F10** ¿Confirmas mantener Angular Router y las rutas actuales, incorporando rutas/guards para los nuevos flujos?
  - answer: Angular Router, preservando las rutas existentes cuando sea compatible
  - source: user

## ⚙️ Backend

- **B1** ¿Confirmas mantener Spring Boot 3.2.3 y Java 17 en los microservicios?
  - answer: Spring Boot 3.2.3 y Java 17
  - source: user
- **B2** ¿Qué política aplicamos a los endpoints ya consumidos por Angular y los nuevos flujos?
  - answer: can break
  - source: user
- **B3** ¿Confirmas migrar la base PostgreSQL existente en el sitio mediante migraciones Flyway versionadas, sin borrar datos ni volúmenes?
  - answer: new schema
  - source: user
- **B4** ¿Confirmas conservar JWT y reforzar la autorización server-side por rol y farmacia, manteniendo los roles del catálogo (administrador principal, gerente, empleado y operador separado)?
  - answer: JWT existente y autorización por rol/tenant
  - source: user
- **B5** ¿Hay objetivos medibles de disponibilidad, latencia o volumen para producción?
  - answer: Reducir en un 70% el tiempo promedio empleado en el registro de ingresos de mercadería y actualización de Kardex, al cabo de 4 semanas de implementado el sistema.

Incrementar en un 70 % la atención de los trabajadores ante los medicamentos que están por vencer mediante el sistema de alertas, evitando posibles pérdidas por falta de atención oportuna, tras dos meses de implementación.

Reducir en un 90% el índice de discrepancia de inventario (variación entre el stock físico y el stock lógico) al finalizar el segundo mes de implementación.

(Esto es parte del informe del proyecto adjuntado numerosas veces en este chat, revisa el resto del informe por favor)
  - source: user

## 📋 General

- **G1** ¿Qué evidencia define que la implementación está completa?
  - answer: Los 15 casos de uso del documento están implementados en UI/API/BD con aislamiento y permisos verificados, integraciones externas no simuladas, migraciones seguras y pruebas automatizadas; frontend y todos los microservicios construyen y los flujos críticos pasan pruebas de integración
  - source: user
- **G2** ¿Qué artefactos o sistemas no debo modificar?
  - answer: No modificar el informe PDF fuente ni las exportaciones HTML originales de Stitch. No afirmar que existe procesamiento de pagos externo hasta integrar y verificar un proveedor real.
  - source: user
- **G3** ¿Qué política se debe aplicar a las pruebas existentes y nuevas?
  - answer: El repositorio no tenía pruebas ejecutables detectadas; agregar pruebas automatizadas por funcionalidad y exigir que las existentes/nuevas pasen
  - source: user
- **G5** Indica cualquier requisito comercial, de cumplimiento u operación adicional que deba respetar, en especial valores iniciales/configurables de planes y moneda, renovación, reembolsos, qué ocurre tras el modo de solo lectura, verificación de correo y si la consola del operador KipuSalud va en esta primera versión. Para los pagos, el documento propone no elegir aún una pasarela: puedes confirmar que implementemos solo una interfaz/adaptador y checkout deshabilitado hasta escoger proveedor, o indicar un proveedor real aprobado y sus requisitos.
  - answer: None beyond the decisions listed in this specification.
  - source: user
