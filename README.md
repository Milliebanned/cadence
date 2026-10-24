# Cadence

Private autopay subscriptions for shielded Zcash.

Zcash has no pull payments, so a subscription normally means the payer must remember to pay.
Cadence adds autopay without giving the merchant any spending power:

- The **subscriber** signs a mandate: merchant key, exact amount, period, cycle limit, expiry.
- The **merchant** issues one signed invoice per cycle, each with a fresh shielded address.
- The **agent** pays an invoice only if every rule in the mandate holds, at a random time inside
  a jitter window, shielded-to-shielded, with a fixed memo. Anything else is refused and logged.
- The merchant side only needs a viewing key, so it can see payments but never move funds.

Status: policy engine, signed invoices, scheduler, write-ahead send guard and hash-chained audit
log are implemented and tested. Wallet integration (send, viewing-key scan) is in progress.

```
npm test      # Node 24 or newer, no dependencies
```
