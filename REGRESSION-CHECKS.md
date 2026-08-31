# Regression checks

Each entry is a bug that shipped, what caused it, and the check that catches it.
Several were caused by fixing something else — the pattern to watch for.

| # | Bug that shipped | Root cause | Check before shipping |
|---|---|---|---|
| 1 | `window.esc=esc; (share, alerts…)` threw on load | A string replace split a comment; the tail became live code | AST scan for **undefined identifier references**, not just calls. `node --check` does NOT catch this |
| 2 | Cache warming never ran | Functions were IIFE-private but called from global scope, guarded by `typeof` so it failed silently | Same AST scan; `typeof` guards hide the failure |
| 3 | Scoring took 5 minutes | ONE global proxy flag — a geo-blocked Binance flipped every host into slow proxy mode | Simulate one provider blocked; total run must stay under the budget |
| 4 | Ticker search said "No coin found matching BTC" | Fixing #3 introduced permanent per-host quarantine with **no recovery path** | Fail a host 3×, wait, confirm it is retried. Never quarantine forever |
| 5 | Scores changed between runs seconds apart | Slow provider caused a category to be DELETED, so weights renormalised | Score the same coin 6× with providers dropping out; spread must be 0.00 |
| 6 | Table showed 5.0 while the card said "Not scored yet" | Display and export layers read `c.scores` directly, bypassing `_unscored` | Never-scored candidate: dash on screen, empty CSV cell, null in radar |
| 7 | Terms and Privacy pages blank | Line-based replacement ate a closing `</div>` | Balance-check every `.page` container after any structural edit |
| 8 | Chart.js 404'd on every load | Version 4.4.4 was never published to cdnjs | Verify every CDN URL returns 200 before shipping it |

## The pattern

Bugs 3→4 and 5 were **caused by fixing something else**. Speed fixes traded away
availability; the availability fix traded away consistency. Before shipping a fix, ask
what it makes worse, and re-run the checks for the neighbouring failure modes.

## Minimum pre-ship checks

```bash
# 1. Syntax
node --check main.js

# 2. Undefined identifiers (catches bug 1 and 2 — node --check does not)
#    Walk the AST, resolve EVERY Identifier against scope + window assignments.

# 3. Page structure (catches bug 7)
#    For each .page container, count <div> vs </div> to zero.

# 4. Score integrity (catches bug 6)
#    Never-scored candidate must render "—", export "", and plot null.

# 5. Score stability (catches bug 5)
#    Same coin, 6 runs, providers dropping out. Spread must be 0.00.

# 6. Host recovery (catches bug 4)
#    Fail a host past the threshold, advance the clock, confirm it is retried.
```
