# ADR-0829: comment-tail sweep #2 — ~1.3KB reclaimed

- Status: Accepted (2026-09-28, v1.7.855)

## Problem

Budget at 6B after round576; no room for further fixes. Prior trims
left ~140 comment lines ending in an unclosed `(` — mid-word
truncated tails.

## Fix

On pure-comment lines longer than 60 chars, cut the trailing
unclosed-`(` fragment to `…`. 64 lines → ~1.3KB reclaimed (now
~1.3KB headroom). Remaining unclosed parens are legitimate
multi-line comment continuations.
