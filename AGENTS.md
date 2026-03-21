# AGENTS.md

## Purpose

This file gives repo-specific instructions to automated coding agents working in this project.

## Dependency Maintenance Policy

- Do not solve routine dependency maintenance or audit findings with `pnpm.overrides`, `resolutions`, or lockfile-only transitive pinning.
- Prefer upgrading the direct package that owns the vulnerable dependency path.
- Treat overrides as a last-resort temporary containment measure only when there is no viable upstream/direct-package fix. If that ever happens, call it out explicitly and explain why.
- Do not hide audit issues by muting, ignoring, or suppressing them unless the user explicitly asks for that and understands the tradeoff.
- After changing dependency versions, update the lockfile through the package manager rather than editing it manually.

## Audit Fix Workflow

- Start by identifying the exact vulnerable path from the audit output.
- Trace the vulnerable package back to the direct dependency that introduced it.
- Upgrade the smallest sensible direct package set that removes the vulnerable path.
- Prefer ecosystem-aligned upgrades over clever one-off fixes.
- If a major-version upgrade is needed, verify the app still builds and note any follow-up work clearly.

## Verification Requirements

- After dependency changes, rerun the audit and confirm the vulnerability count is actually zero or otherwise improved as expected.
- Run the relevant build(s) after dependency changes.
- Run the relevant lint/test command when the changed toolchain affects linting, bundling, transpilation, or test execution.
- If verification fails because the newer toolchain exposes pre-existing issues, report that separately from the audit fix. Do not blur the two together.

## Frontend Tooling Notes

- This repo's frontend ESLint config imports packages directly in `frontend/eslint.config.js`. If that config imports a package, make sure it is declared in `frontend/package.json`.
- When upgrading Vite, also check its `esbuild` peer/dependency expectations and align the installed version if needed.
- Toolchain upgrades can surface stricter React and TypeScript lint rules. Treat those as follow-up code quality issues unless they directly block the requested security fix.

## Change Hygiene

- Keep fixes targeted. Do not mix unrelated refactors into dependency maintenance work.
- Explain which direct packages were upgraded and why.
- If a change introduces new warnings or exposes old lint errors, say so plainly.
- Do not leave temporary policy workarounds behind without documenting them.
