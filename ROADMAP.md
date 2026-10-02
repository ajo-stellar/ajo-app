# Roadmap

What is next for `ajo-app`, in order. Anything not listed as done is
**not implemented**.

## Status

- [x] Repository governance: AGENTS.md, CONTRIBUTING.md, ROADMAP.md, LICENSE,
      .gitignore, .gitattributes (2026-10-01).
- [ ] v0 app from the project's playbook section (screens below).

## Next

- [ ] Vite + React + TypeScript scaffold, strict mode, `.env`-only
      configuration, testnet refusal paths.
- [ ] Pages per `STELLAR-BUILD-PLAYBOOK-v3.md` section 8 (shared app
      prompt in section 4; file present in
      `~/Desktop/Drips/_reference/playbooks/`, confirmed 2026-10-02):
      TESTNET banner on every screen, error mapping from the contract repo's
      `ERRORS.md`, transaction hash and explorer link after every action,
      local wallet icons, Stellar-only wallet kit module set, mobile-first
      accessible markup.
- [ ] Unit tests for pure logic in `src/lib/`; render tests with an automated
      axe-core check (the schoolfees standard).
- [ ] CI (`web.yml`): lint, type-check, tests, production build. Lands with
      the first code that can pass it.

## v0 screens (from playbook section 8)

- Admin: create a circle, see rounds.
- Member: contribute this round, see who has paid and who has not.
- Anyone: settle a round when complete.

Known app gaps, deliberately out of v0: reminders of who still owes
(off-chain), multi-language support, printable circle summary.

## Decisions needed from Tim

1. **Build standard — decided (2026-10-02).** v3 sections 4 and 8 are the
   scope authority for what the app shows; v4 plus the schoolfees repos are
   the standard for how it is built (doc set, AGENTS.md, CI, checkers).
2. **Second reviewer.** Name the second human reviewer required before any funded test.

## Explicitly out of scope

Mainnet, any backend or database, analytics or trackers. Anything the v0
design does not ask for.
