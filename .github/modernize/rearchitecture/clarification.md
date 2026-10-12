---
schema: clarification/v1
generated_at: "2026-10-07T19:26:00Z"
scope:
  - frontend
  - backend
  - generic
clarity_score: 1.00
rounds: 1
gaps: []
blocking_gaps: []
---

# Scenario Clarification

## Frontend

- **Target framework**: Angular 21.1.
- **Component library**: Use Angular Material where it can represent the Stitch designs faithfully; other libraries or custom components are allowed where necessary.
- **Screenshots**: Treat `/home/marce/Descargas/stitch_kipusalud_inca_theme_homepage/` exports as visual references; leave originals unchanged.
- **Design system**: Preserve the existing Peruvian quipu theme and integrate the Stitch views without editing their raw exports.
- **Accessibility**: WCAG 2.1 AA.
- **Browser targets**: Chrome, Firefox, Safari, and Edge, latest two major versions.
- **Responsive strategy**: Mobile-first; reuse existing responsive behavior.
- **i18n locales**: Spanish UI; use Peruvian locale conventions where applicable.
- **State management**: Preserve Angular signals, RxJS, and existing Angular services.
- **Routing**: Preserve Angular Router routes where compatible; add routes and guards as needed.

## Backend

- **Target framework**: Spring Boot 3.2.3 and Java 17.
- **API contract preservation**: Breaking changes are allowed.
- **Data migration strategy**: New schema.
- **Auth framework**: Preserve JWT and implement backend authorization by role and pharmacy.
- **SLA targets**:
  - Reduce mean goods-receipt and Kardex update time by 70% after four weeks of implementation.
  - Increase timely staff attention to near-expiry medication alerts by 70% after two months.
  - Reduce physical-to-logical inventory discrepancy by 90% by the end of the second month.

## Generic

- **Success definition**: All 15 use cases implemented across UI/API/database; pharmacy isolation and permissions verified; external integrations are not simulated; safe migrations and automated tests exist; frontend and microservices build and critical integration flows pass.
- **Out of scope**: Do not modify the source report PDF or original Stitch HTML exports. Do not claim external payment processing before a real provider is integrated and verified.
- **Existing test posture**: Add automated tests for each feature and require existing and new tests to pass.
- **Additional constraints**: No additional requirements beyond the use cases and decisions in the specification.

## Gaps & Defaults Applied

No gaps or defaults applied.

## Downstream Usage Notes

- Breaking API changes are permitted, but update all in-repository callers together.
- “New schema” must be treated as a separately versioned schema/data design. Do not discard, reset, or silently migrate existing persisted data; define a safe migration/cutover path before production use.
- The report PDF, pages 18–20, defines the measurable operational objectives and limits the stated release scope to medicine catalog, inventory, automatic batch/expiry control, and sales. It explicitly defers POS hardware and SUNAT e-invoicing integration.
- Payment provider, subscription commercial values, renewal, refunds, email verification, post-read-only lifecycle, and platform operator console were not specified beyond the existing use-case document. Keep provider-dependent checkout disabled and avoid invented commercial policies until separately approved.
