# ADR-1051: CI gate — run `node test.mjs` on GitHub Actions

Status: implemented (round800, v1.8.077)
Axis: ADR-1048 improvement candidate **P1-a** — *"CI: one GitHub Actions
job running `node test.mjs` — the local gate exists, just run it."*

## Context

The project's entire regression surface is `node test.mjs`: ~3,600
source pins plus behavioural asserts over the single-file app — pure
Node, no browser, no dependencies, ~4s. Yet nothing ran it except the
human/agent on their machine: a commit could break the gate and still
merge, since review habit is "one line + PR URL".

Every weakness this surfaces is process-level: the local gate is only a
gate if someone runs it. A broken pin discovered one round later costs
a bisect across stacked branches.

## Decision

`.github/workflows/test.yml` — a single job:

```yaml
on: {push:, pull_request:}
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: '22'}
      - run: node test.mjs
```

- **All pushes + PRs**: the serial-stack convention pushes every round
  branch and merges via merge commits onto the accumulator — all of
  those events are covered by an unfiltered `push`/`pull_request`.
- **No matrix / cache / lint job**: there is one gate; a second job is
  noise. test.mjs already covers pins+behaviour; adding eslint or a
  matrix is a new capability to justify separately (YAGNI).
- **Node 22**: current LTS; test.mjs uses only stable stdlib.

## Notes

- The workflow runs on `pull_request` targeting any base — stacked PRs
  (base = the accumulator or a round branch) get the check on their
  head branch, which is exactly the diff under review.
- First run activates on the branch that introduces the file; earlier
  open PRs pick it up on their next push after this lands in their
  ancestry.

## Contract

- Keep CI one job running `node test.mjs`; new gates belong inside
  test.mjs first (it is the single gate document).
- If a CI check ever goes red, the failure is real — fix code or fix
  the pin, never skip the job.

## Verification

Source pin in test.mjs reads the workflow file itself and asserts it
contains `node test.mjs` + `actions/checkout` + `actions/setup-node`,
so a refactor that drops the gate fails the local gate too.
