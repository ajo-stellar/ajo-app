# App verification — local, 2026-10-08

- npm run typecheck: PASS.
- npm run lint: PASS.
- npm test -- --maxWorkers=1: 33 tests in 6 files PASS.
- npm run build: PASS (Vite8.3.1); largest JavaScript chunk776.99kB/182.53kBgzip. The500kB chunk warning remains.
- npm audit --package-lock-only: 19 unresolved advisories (13low,6moderate,0high,0critical). Raw report in docs/npm-audit.json. No forced dependency upgrades were made.
- Parent browser review: configured full shell at320/390/1280px, no horizontal overflow or automated axe WCAG violations. Synthetic public configuration only; no RPC writes or real wallet used.

Tests cover exact integer inputs, unique bounded members, ABI member-vector encoding, amount/duration overflow, canonical error-table wording, testnet refusal, wrong RPC network, stale post-sign session, ambiguous submission hash retention without retries, initial accessibility and delayed disconnect/unmount.

Local dependency installation stalled; its partial downloads are retained in ignored .dependency-download-incomplete/. An ignored node_modules junction reuses the existing SchoolFees dependency tree with the same manifest and lockfile dependencies. TypeScript caches live in this repository .cache/. CI uses npm ci with this repository lockfile; no global install or dependency-tree mutation through the junction was performed.

No deployment, live-wallet/deployed-contract end-to-end run, pilot or independent custody review has happened. Automated accessibility checks do not replace manual keyboard, screen-reader and real-device review.
