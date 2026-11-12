---
title: Origin Depot CI - Plan
type: feat
date: 2026-11-12
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Origin Depot CI - Plan

## Goal Capsule

Objective: A pull request or a push to the default branch can be checked with the same lint, test, and build commands a developer runs locally, and a pull request can receive one Grok review comment, even though GitHub Actions cannot run.

Means: Depot workflow YAML on `depot-ubuntu-24.04` plus an Origin comment script, following the Street Royalty CI files and this repo's existing npm scripts (KTD1, KTD2).

Authority: The request's file list, commands, skip rules, and merge instruction outrank the reference repo where they differ. The reference outranks new design. Do not rewrite the application to make CI green.

Stop when: local `npm ci`, `npm run lint`, `npm run test`, `npm run build`, and `node --test scripts/ai-review.test.mjs` have been run and their exit codes recorded. If those pass, open the PR and merge it. If merge is blocked, leave the branch green and name the block.

Finish and ship: this session, on branch `cursor/origin-depot-ci-7d1b`, into `main`.

## Product Contract

### Summary

Add Cursor Origin CI for a React and Vite app whose GitHub Actions billing is locked. Keep the unused GitHub workflow location available, document what will not survive detach, and name the one Depot secret.

### Problem Frame

Operators cannot see a green check from GitHub Actions. The owner is moving every CI job to Depot, which runs GitHub Actions-syntax files under `.depot/workflows/` after the repo is detached from GitHub. Until that detach, the workflow still has to be correct, and the only available proof is a local run of the same commands.

### Requirements

Verification

- R1. `.depot/workflows/ci.yml` runs on pull requests and on pushes to the default branch `main`, on `depot-ubuntu-24.04`.
- R2. The verify job installs with `npm ci` and then runs this repo's real commands: `npm run lint`, `npm run test` (`vitest run`), and `npm run build`.
- R3. Those commands pass locally before the pull request is merged. Fix only trivial breakages (a watch-mode test script, lockfile drift, lint errors). Do not rewrite the app.

Review

- R4. Pull requests run an AI review job that calls Grok with `XAI_API_KEY` and posts with `origin pr comment <PR_NUMBER> --body-file <file> --edit-last --create-if-none`.
- R5. If `XAI_API_KEY` is missing, or the Origin CLI is missing, or the comment command fails, the job prints the reason or the review to the log and exits 0.

Migration notes

- R6. Existing `.github/workflows` files stay. This repo has none. Do not add a GitHub Actions workflow.
- R7. `docs/origin-ci.md` maps each GitHub workflow to its Depot equivalent, lists GitHub-only pieces that detach will drop, and lists secrets to re-enter in Depot.

### Actors

- A1. The owner, who adds `XAI_API_KEY` in Depot when reviews should post.
- A2. A pull-request author, who reads the Origin comment or the job log.

### Flows

- F1. Push to `main` or open a pull request. Depot runs verify. The job is green only when lint, test, and build exit 0.
- F2. Open a pull request with `XAI_API_KEY` set and the Origin CLI present. One comment is created or the previous review comment is edited.
- F3. Open a pull request with no key, or with no Origin CLI. The review job logs the skip or the note and stays green.

### Acceptance Examples

- AE1. Covers R5. `XAI_API_KEY` unset. The process prints `AI review skipped: XAI_API_KEY is not set` and exits 0. It does not call xAI.
- AE2. Covers R4. Key set, diff non-empty, Origin CLI accepts the comment. The argv is `pr comment <number> --body-file <file> --edit-last --create-if-none`.
- AE3. Covers R5. Key set, Origin invocation throws. The review text is printed and the process still returns success.

### Success Criteria

A reader of `docs/origin-ci.md` can see the Depot jobs, the GitHub-only Dependabot file, and the single optional secret without opening the workflow.

### Scope Boundaries

In scope: the workflow, the review script and its node:test file, the Origin CI doc, and trivial fixes required for R3.

Out of scope: deleting `.github/dependabot.yml`, adding a Dependabot replacement, a Playwright or `npm run ci` script this repo does not have, and product changes in `src/`.

### Assumptions

- The default branch remains `main`.
- Depot supplies `github.event_name`, `github.event.pull_request.number`, `github.base_ref`, and `secrets.XAI_API_KEY` using GitHub Actions syntax, which is what the named reference workflow uses.
- Origin comment authentication is the Depot app session, not `GITHUB_TOKEN`.
- `vitest`, `jsdom`, and Testing Library are present in `package-lock.json` as installable packages even though they are not direct `package.json` entries. If `npm run test` cannot resolve them, add the missing direct devDependencies and refresh the lockfile. That is lockfile repair, not an app rewrite.
- ESLint 9 is declared and no flat config file exists. If `npm run lint` fails for that reason, add the smallest flat config that uses the plugins already declared, and fix only the errors that config reports when they are mechanical. If the config would require an application rewrite, stop and record the failure instead of weakening the app.

## Planning Contract

### Key Technical Decisions

- KTD1. Copy the Street Royalty job shape (checkout, `actions/setup-node@v4` with Node 22 and `cache: npm`, `npm ci`, then the repo command) and replace `npm run ci` with this repo's lint, test, and build scripts. Rejected a new `npm run ci` aggregator, because the request says to use the real commands.
- KTD2. Post reviews only through the Origin CLI. Rejected the reference script's `api.github.com` comment path. GitHub Actions is billing-locked, and after detach that API is the wrong host. A thrown GitHub comment error would fail the job, which violates R5.
- KTD3. Keep the reference model `grok-4.5`, the 14_000 character diff cap, the 45 second timeout, and edit-last-or-create comment flags. The prompt names this conflict-resolution session app instead of Street Royalty.
- KTD4. Prove the skip and comment contract with `node --test`, not Vitest, so the new script does not depend on the app test runner. The verify job runs that file after the app commands.
- KTD5. Leave `.github/dependabot.yml` documented as GitHub-only. Rejected moving it under `.depot/`, because Depot does not run Dependabot.

### High-Level Technical Design

```text
pull_request or push to main
        |
        v
   verify @ depot-ubuntu-24.04
   npm ci -> lint -> test -> build -> node --test scripts/ai-review.test.mjs
        |
        | pull_request only
        v
   ai-review
   npm ci -> node scripts/ai-review.mjs
        |
        +-- no XAI_API_KEY -------- log skip, exit 0
        +-- empty diff ------------ log skip, exit 0
        +-- xAI error ------------- exit 1
        +-- origin pr comment ok -- exit 0
        +-- origin missing/fail --- print review, exit 0
```

### Sequencing

U1 before U2, because the doc names the files U1 adds. U3 is the local proof and any trivial repair, and it blocks the pull request.

## Implementation Units

### U1. Depot workflow and review script

Goal: Depot can run the app checks and the Grok review.

Requirements: R1, R2, R4, R5.

Files: `.depot/workflows/ci.yml`, `scripts/ai-review.mjs`, `scripts/ai-review.test.mjs`.

Approach: Follow `Phazzie/streetroyalty` `.depot/workflows/ci.yml` and `scripts/ai-review.mjs`, with the deltas in KTD1–KTD4. The marker is `<!-- conflict-resolution-ai-review -->`.

Test scenarios:

- Missing or blank `XAI_API_KEY` returns skip and the spawned process exits 0 with the skip line. No fetch.
- A diff longer than 14_000 characters is clipped and marked truncated.
- `commentArgs` is `pr`, `comment`, the number, `--body-file`, the file, `--edit-last`, `--create-if-none`.
- `publish` with a throwing runner prints the body and returns `{ posted: false }`.
- `main` with an empty diff does not call fetch.
- `main` with a key, a non-empty diff, and a successful runner invokes `origin` with those flags.

Verification: `node --test scripts/ai-review.test.mjs` exits 0.

### U2. Origin CI document

Goal: An operator can see the mapping, the drop list, and the secret without reading the YAML.

Requirements: R6, R7.

Files: `docs/origin-ci.md`.

Approach: One table from "no GitHub workflow" to `.depot/workflows/ci.yml`. A second table for Dependabot. A third for `XAI_API_KEY`, marked optional. State that `GITHUB_TOKEN` is not copied.

Test expectation: none. The doc is the check. Read it against R6 and R7.

Verification: The doc names `verify`, `ai-review`, `.github/dependabot.yml`, and `XAI_API_KEY`.

### U3. Local command proof and trivial repairs

Goal: The commands named in the workflow exit 0 on this checkout.

Requirements: R3.

Files: only files a trivial repair must touch (`package.json`, `package-lock.json`, an ESLint flat config, or a lint-only edit). No `src/` behavior change unless a lint autofix is mechanical and the tests still pass.

Approach: Run the five commands. Repair watch mode (already `vitest run`), lockfile resolution, or lint. Stop rather than rewrite the app.

Test scenarios:

- `npm ci` exits 0.
- `npm run lint` exits 0.
- `npm run test` exits 0 and does not start a watcher.
- `npm run build` exits 0.
- The review test file exits 0.

Verification: Record each exit code from a fresh run after the last repair.

## Verification Contract

Run from the repo root on Node 22, after the last code change:

```text
npm ci
npm run lint
npm run test
npm run build
node --test scripts/ai-review.test.mjs
```

Each must exit 0. A watcher that does not exit fails R3.

## Definition of Done

- U1, U2, and U3 are present on `cursor/origin-depot-ci-7d1b`.
- The five commands above have been run after the last edit and exited 0, or the pull request stays unmerged and the report names the failing command.
- The pull request is merged when those commands pass and the host allows the merge. A protection rule, a missing status check, or a permissions error is reported instead of forced.

## Risks

- `npm run test` can fail for product bugs. Mitigation: fix only setup and lockfile issues. If the suite fails for behavior, do not merge on a red test command.
- `XAI_API_KEY` in the Depot log must stay in the secret mask. The workflow passes it as `secrets.XAI_API_KEY` and the script never prints the key.
- Depot will not execute this YAML until GitHub detach. Local command parity is the proof available now.
