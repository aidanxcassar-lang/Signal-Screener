# Score-change alerts — setup

The alert backend is written and deployed with the site. It stays dormant until you add
three environment variables. Until then, subscriptions are stored but no email is sent.

## 1. Enable Netlify Blobs
Nothing to install. Blobs is available on your plan and the functions use it automatically
to store subscriptions. No database to run.

## 2. Get an email sender
Create a free account at **resend.com** (3,000 emails/month free), verify a domain or use
their test sender, and copy the API key.

Any provider works — swap the `fetch` call in `sendAlert()` if you prefer another.

## 3. Add environment variables
Netlify dashboard → Site configuration → Environment variables:

| Variable | Value | Required |
|---|---|---|
| `RESEND_API_KEY` | your Resend API key | yes |
| `ALERT_FROM_EMAIL` | `alerts@signalscreener.app` | yes |
| `REPLY_TO_EMAIL` | `hello@signalscreener.app` | no (defaults to this) |
| `SITE_URL` | `https://www.signalscreener.app` | yes |
| `COINGECKO_API_KEY` | paid CoinGecko key | only if you charge money |

Redeploy after adding them.

## 4. Test before trusting it
1. Set an alert in the app. You should get a confirmation email.
2. Click the confirm link.
3. Netlify dashboard → Functions → `check-alerts` → **Run now**.
4. It returns `{ok:true, subscribers, checked, emails}`. `emails: 0` is correct when
   nothing has moved by a full point.
5. To force an email, edit the stored baseline or lower `THRESHOLD` in `check-alerts.js`
   temporarily.

## How it behaves
- **Double opt-in.** No email is sent until the address is confirmed. This prevents someone
  subscribing an address they do not own, which is both abuse and a GDPR problem.
- **Threshold of 1.0.** A score must move a full point. Without this the job would email on
  rounding wobble and get unsubscribed from within a week.
- **3-day cooldown** per asset per subscriber.
- **Silent on provider outages.** If data cannot be fetched, nothing is sent rather than a
  false alarm.
- **One fetch per ticker** per run, however many subscribers track it.
- **Unsubscribe link in every email**, plus a `List-Unsubscribe` header. One click, no login,
  deletes the address entirely.

## Keeping the scoring in sync
`netlify/functions/_lib/scoring.js` duplicates the tier tables from `index.html`, because
the server has to score without a browser. **If you change a threshold in one, change it in
the other**, or the emailed score will not match what the app shows.

## Before charging for this
- CoinGecko's free tier is non-commercial. Add `COINGECKO_API_KEY` with a paid plan.
- Paid plans need billing terms, a 14-day EU withdrawal right, and a lawyer's review.
- Entitlements must be checked server-side. A `localStorage` flag is not a paywall.
