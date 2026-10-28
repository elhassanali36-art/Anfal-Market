# Phase 4 Report — Business Rules, Store Policies, and Operational Readiness

**Version:** 1.4.0  
**Implementation status:** Changes authored; external runtime/integration/browser tests intentionally deferred until the final stage.

## Changes in this phase
- Enforced an explicit order status transition graph to prevent jumping between incompatible states.
- Preserved cancellation as terminal and restricted cancellation after dispatch/completion according to the workflow.
- Added server-side delivery-address validation and rejected unknown payment method identifiers.
- Tightened product create/update validation for name length, price/stock bounds, category existence, product IDs, and safe image URL schemes.
- Required a non-empty store name/currency and at least one enabled payment method before saving settings.
- Added a generic JSON error handler for oversized/malformed request bodies and unexpected API errors.
- Added periodic cleanup for expired in-memory throttle entries and basic public order-request rate limiting.
- Prevented delivery-fee changes on cancelled orders.
- Added opt-in reverse-proxy trust configuration for HTTPS cookie deployments.
- Added a consistent SQLite backup command (`npm run backup`) and documented backup/restore requirements.
- Added linked Arabic privacy, terms, delivery, and returns/refunds policy templates with clear placeholder warnings.
- Updated release/deployment documentation and version metadata.

## Verification boundary
- No unit, integration, browser, runtime, or dependency-install tests were run during this implementation phase, per project-owner instruction.
- The next test pass must occur in the final external environment after the implementation is frozen. It must include syntax/startup, API integration, mobile/desktop browser, security, order lifecycle, and backup/restore tests.
- These policy pages are templates and must be customized and reviewed before public launch.

## Remaining known limits
- Manual distance input only; no GPS/maps routing integration.
- No payment-provider API integration or digital payment verification.
- One store per deployment/database; no shared multi-tenant isolation.
- SQLite is for a persistent single-instance deployment, not ephemeral/serverless storage.
