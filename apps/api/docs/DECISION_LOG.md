# Implementation decisions — 5 October 2026

1. **Keep the product boundary.** Projects.docx contains several project ideas and a staged CMS plan. This repository implements the multi-tenant CMS plan. An LLM gateway, token billing, accounting, inventory, and Kubernetes are not silently added as unrelated ERP modules.
2. **Preserve the theme.** Keep the existing neutral light/dark tokens, restrained borders, compact controls, and sidebar structure. Use locally bundled Inter to avoid an external font dependency at build time.
3. **Make operational data real.** Replace fake growth, capacity, online status, sample team members, and sample activity with database-derived content and workspace counts.
4. **Use shareable invitations.** Generate a recipient-bound invitation link; do not pretend an email was sent when no mail service exists.
5. **Remove unsupported controls.** Do not display fake subscription pricing, public-access switches, simulated recovery email, or an archive status unsupported by the database.
6. **Treat storage as private.** Protect both metadata and binary downloads. Encrypt new media, avatars, and audit archives. Keep legacy migration behavior explicit.
7. **Protect existing environments.** Run tests against separate services and databases. Test helpers refuse destructive cleanup unless the database name contains test or review.
8. **Report evidence precisely.** Build/test completion is distinct from remote CI execution, production deployment, certificate issuance, benchmarks at target scale, and GitHub publication.
