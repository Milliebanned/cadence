# Demo video script (about 2 minutes 45 seconds)

Record the screen at 1440×900 or larger, with the live demo running. Speak calmly; every
section names what is on screen. Times are targets, not limits.

---

## 0:00 – 0:20 · The problem (landing page, hero)

**Screen:** the Cadence landing page, the halftone light beam moving.

**Say:**
> Zcash can't pull money from your wallet. That's great for privacy, but it means every
> subscription — a VPN, hosting, a newsletter, rent — depends on you remembering to pay.
> Cadence fixes that: approve a subscription once, with limits you sign, and it pays every
> period for you, shielded end to end.

## 0:20 – 0:35 · Your Cadence (open the app)

**Screen:** click **Open your Cadence**. Show the shielded balance and the empty state.

**Say:**
> This is Cadence on my own machine. My keys stay here. Right now it holds a shielded balance
> and no subscriptions.

## 0:35 – 1:05 · Subscribe from a merchant (checkout → approval)

**Screen:** open the **Private VPN** checkout. Click **Subscribe with Zcash**. The approval
sheet opens. Pause on it.

**Say:**
> Here's a merchant's checkout. I click Subscribe with Zcash, and my own Cadence shows exactly
> what I'm agreeing to: at most 0.25 ZEC every period, at most twelve payments, three ZEC in
> total, an end date. And what the merchant can never do: charge more or earlier, see my
> balance, or take anything after I revoke.

**Screen:** click **Approve**.

## 1:05 – 1:30 · First payment lands (checkout flips, app updates)

**Screen:** switch back to the checkout tab: it changes to **"You're subscribed. First
payment received."** Switch to the app: the subscription card, payment 1 of 12, the activity
line with the transaction id.

**Say:**
> The checkout confirms on its own — Cadence paid the first period. Each payment goes to a
> fresh shielded address the merchant issued and signed, and my agent checks the signature,
> amount and schedule before sending.

## 1:30 – 1:55 · The merchant can't spend (dashboard)

**Screen:** open the **merchant dashboard**. Point at the **View-only · cannot spend** badge,
the received total, the subscriber in Upcoming renewals.

**Say:**
> This is the merchant's side. Every number comes from a viewing key. The server can see
> that my subscription is paid — it cannot spend a single zatoshi, so a breach can't move
> funds.

## 1:55 – 2:20 · Prove the privacy (terminal)

**Screen:** a terminal running the proof command; scroll to **ALL CHECKS PASS** and the
control section.

**Say:**
> Don't take my word for it. This reads every payment back from the chain: zero transparent
> inputs or outputs, the amount appears nowhere public, every cycle a different address. And
> the same checks run on a known-leaky transaction, which they catch — so the checker isn't
> just printing PASS.

## 2:20 – 2:35 · Revoke (app)

**Screen:** in the app, click **Revoke**, then **Confirm revoke**. The card moves to
Finished.

**Say:**
> And if I change my mind, one click. The next renewal is refused. Nothing else can be taken.

## 2:35 – 2:45 · Close (landing page)

**Screen:** back to the landing page.

**Say:**
> Cadence: private autopay for Zcash. Approve once, stay private. It's open source, and the
> live demo link is in the submission.

---

## Before recording

- Start from a fresh demo so the Private VPN card is empty: `npm run demo -- --reset`.
- Open Cadence once from the landing page first, so the checkout button can hand off to it.
- Have the proof command ready in a terminal:
  `node src/cli.ts agent proof --config ~/.cadence-demo/agent/agent.json --rpc http://127.0.0.1:18232`
- The VPN plan renews every two minutes, so a second payment may appear while recording. That
  is fine; mention it if it happens.
