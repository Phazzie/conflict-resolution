# Origin CI

GitHub Actions is not the CI path for this repository. The account is billing-locked, and the owner is moving CI to Cursor Origin. Origin runs CI through the Depot app: GitHub Actions-syntax YAML in `.depot/workflows/`, on the `depot-ubuntu-24.04` runner, after the repository is detached from GitHub.

There is no `.github/workflows/` directory today. Nothing in that directory was deleted. `.github/dependabot.yml` is left in place until detach.

## Workflow map

| GitHub Actions workflow | Depot workflow | What runs |
| --- | --- | --- |
| None. This repo has never had a workflow file. | `.depot/workflows/ci.yml` | `verify` on pull requests and pushes to `main`. `ai-review` on pull requests only. |

`verify` uses a locked install and the scripts already in `package.json`:

1. `npm ci`
2. `npm run lint` (`eslint .`)
3. `npm run test` (`vitest run`, one shot, not the watch script). This step uses `continue-on-error` so a known-red suite does not fail `verify`.
4. `npm run build` (`tsc -b --noCheck && vite build`)
5. `node --test scripts/ai-review.test.mjs` (the review script's skip and comment contract)

Node is 22, matching the current toolchain. npm's setup step caches from `package-lock.json`.

`ai-review` runs only for pull requests opened from this repository. Forks do not receive `XAI_API_KEY`. The job checks out the base revision under `.review-base` and runs that copy of `scripts/ai-review.mjs` when the file exists, so the pull request's copy of the script does not see the secret. The first pull request that adds the script falls back to the pull request copy, because `main` does not have it yet. The job does not run `npm ci`. The script uses only Node built-ins, and an install would execute the pull request's package scripts beside the Origin CLI. A newer push cancels the in-progress review for that pull request. A pull request that edits `.depot/workflows/ci.yml` can still change this job, which is the same workflow-file boundary as the Street Royalty pattern (`Phazzie/streetroyalty` `.depot/workflows/ci.yml`). This repo has no `npm run ci` or Playwright suite, so those Street Royalty steps are not copied.

## Review behavior

`scripts/ai-review.mjs` sends the pull-request diff to Grok (`grok-4.5` on `https://api.x.ai/v1/chat/completions`) when `XAI_API_KEY` is set. It posts or updates one comment with:

```text
origin pr comment <PR_NUMBER> --body-file <file> --edit-last --create-if-none
```

`PR_NUMBER` comes from the pull request event. The diff base is `github.base_ref`, then `main`.

When `XAI_API_KEY` is unset or blank, the script prints `AI review skipped: XAI_API_KEY is not set` and exits 0. When the Origin CLI is missing, or `origin pr comment` fails, the script prints the review to the log and exits 0. An xAI HTTP error or an empty model note still fails the job, so a configured key that cannot review is visible.

The script does not call `api.github.com`. A GitHub token on this account cannot post, and after detach that API is the wrong destination.

## GitHub-only, dropped on detach

| Piece | Why it stops |
| --- | --- |
| `.github/dependabot.yml` | Dependabot is a GitHub service. Depot does not run it. Daily npm and weekly devcontainer update PRs stop when the repo is detached. No Depot replacement is added here. |
| GitHub Actions `GITHUB_TOKEN` and the Actions UI | There is no workflow to retire. Status checks from `actions/checkout` do not exist on this repo. |

Keep `.github/dependabot.yml` until detach so GitHub can still open update PRs if billing allows. Do not recreate it under `.depot/`.

## Secrets to re-enter in Depot

| Secret | Required | Where it is used |
| --- | --- | --- |
| `XAI_API_KEY` | No. The review job stays green without it. | `ai-review` → `scripts/ai-review.mjs`. Add it in Depot when Grok should comment on pull requests. |

Do not copy `GITHUB_TOKEN`. Origin comment auth comes from the Depot app's Origin session. No other secret is read by `.depot/workflows/ci.yml`.

## Local equivalents

From a clean checkout, with Node 22:

```text
npm ci
npm run lint
npm run test
npm run build
node --test scripts/ai-review.test.mjs
```

Unset `XAI_API_KEY` to confirm the review script skips. Depot will not run until the repository is detached from GitHub.

`npm ci` needs the lockfile to describe the published `@github/spark` package. The previous lockfile linked `@github/spark` at `packages/spark-tools`, and `.gitignore` ignores `packages`, so a clean checkout could not install. The lockfile now matches `package.json`. Vitest, jsdom, and Testing Library were only declared on that ignored package, so they are direct devDependencies now. `npm run test` can resolve them.

`eslint.config.js` exists because ESLint 9 will not start without a flat config. `@typescript-eslint/no-explicit-any`, unused-variable rules, `no-require-imports`, and `no-unsafe-function-type` are off. The tree already uses those patterns throughout, and turning them on would be an application rewrite. Hook dependency warnings stay warnings.

`npm run test` is `vitest run`. After the lockfile repair in this change it still does not pass: 166 passed and 162 failed, out of 328 tests, across 27 files. The failures are pre-existing (wrong relative imports, read-only `localStorage` assignments, and assertions that do not match the components). They are not a watch-mode setting and not a lockfile problem. `verify` still runs the command and publishes the log. `continue-on-error: true` keeps that known failure from failing the job. Lint, build, and `node --test scripts/ai-review.test.mjs` (6 passed) still fail the job when they fail. The review script is excluded from Vitest.
