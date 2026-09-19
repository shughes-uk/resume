# AGENTS.md

Static React + Vite resume site on S3 + CloudFront at samanthahughes.me. No backend — the old Django API was deleted; don't resurrect it.

## Commands

Everything runs through pixi; there is no system `terraform`, `node` or `npm`.

- `pixi run frontend-dev` / `frontend-build` / `frontend-lint` / `frontend-format`
- `pixi run terraform-plan` / `terraform-apply` (Terraform 1.16, pinned)
- `pixi run checks` runs every pre-commit hook; `pixi run frontend-preview` serves the built site
- After cloning or a Python bump: `pixi run setup` (deps + git hook), or commits fail with "`pre-commit` not found"

## Rules

- **Terraform**: state is in S3 with native locking. Plans run in CI on PRs; applies are local. Use `-target` when config and live infrastructure disagree — an untargeted apply once rebuilt the deleted backend.
- **README.md** is the owner's: only remove stale content or fix something factually wrong. Explain changes in the PR instead.
- **Lint** is oxlint. TypeScript 7 provides `tsc`.

## Deploy (`scripts/deploy_frontend.py`)

`main` deploys automatically. Order matters, so keep it:

1. fingerprinted `assets/` first (immutable cache), then other files, then `index.html` last (`no-cache`)
2. invalidate CloudFront and **wait** for it
3. only then delete objects missing from the build
4. smoke-test the live URL

Any failed upload must fail the deploy — never swallow those errors.

## Previews

Every same-repo PR deploys to `https://pr-<N>.preview.samanthahughes.me` from a separate bucket, distribution and role, and is deleted when the PR closes. Fork PRs are skipped: they get no OIDC token.
