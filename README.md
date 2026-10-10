# Payment Integration Service (Node.js — Layered Architecture)

Reusable payment layer for **Stripe, Razorpay, PayPal, PayU Money, Paytm, PhonePe**.
Copy this whole folder into any project, `npm install`, drop in your keys, done.

## Folder Structure (Layered)

```
src/
  config/            -> env.js, gateways.config.js  (ONLY place you touch to switch demo/live keys)
  providers/         -> one class per gateway, all implement the same interface
    base/PaymentProvider.js     (the contract: createOrder, verifyPayment, handleWebhook, refund)
    stripe/StripeProvider.js
    razorpay/RazorpayProvider.js
    paypal/PaypalProvider.js
    payu/PayuProvider.js
    paytm/PaytmProvider.js
    phonepe/PhonepeProvider.js
  factory/PaymentFactory.js     -> gives you the right provider by name: PaymentFactory.getProvider('stripe')
  services/payment.service.js   -> business logic, gateway-agnostic, saves transactions
  controllers/payment.controller.js
  routes/payment.routes.js
  models/Transaction.model.js   -> in-memory now, swap for Mongoose/Postgres later (see comments inside)
  middlewares/errorHandler.js
  utils/
app.js
server.js
```

Why this shape works well for future DB migration: **only `Transaction.model.js` talks to storage.**
Service/Controller/Routes never touch a DB directly — so tomorrow when you add MongoDB/Postgres,
you rewrite 4 methods in one file (`save`, `findByOrderId`, `updateStatus`, `findAll`) and everything
else keeps working exactly as-is.

## Quick Start (copy-paste into any new project)

1. Copy the whole `payment-integration-service` folder in, or just copy `src/` into your existing `src/`.
2. `npm install`
3. `cp .env.example .env` and fill in your sandbox keys (see table below for where to get them).
4. `npm run dev` (or `node server.js`)
5. Test: `GET http://localhost:5000/api/payments/gateways`

## API Endpoints (same shape for every gateway)

| Method | Endpoint                                   | Purpose                                   |
|--------|---------------------------------------------|--------------------------------------------|
| GET    | `/api/payments/gateways`                    | List supported gateways                    |
| POST   | `/api/payments/:gateway/create-order`       | Create order/intent (stripe/razorpay/paypal/payu/paytm/phonepe) |
| POST   | `/api/payments/:gateway/verify`             | Verify payment after checkout             |
| POST   | `/api/payments/:gateway/webhook`            | Server-to-server webhook (stripe/razorpay/paypal) |
| POST   | `/api/payments/:gateway/refund`             | Refund a payment                           |
| GET    | `/api/payments/transaction/:orderId`        | Fetch one transaction                      |
| GET    | `/api/payments/transactions`                | List all transactions                      |

PayU / Paytm / PhonePe additionally use dedicated redirect routes (`/payu/success`, `/paytm/callback`,
`/phonepe/callback`) because those gateways POST the result back as a form, not a JSON webhook.

### Example: create a Razorpay order
```bash
curl -X POST http://localhost:5000/api/payments/razorpay/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 499, "currency": "INR", "receipt": "order_101"}'
```

### Example: create a Stripe intent
```bash
curl -X POST http://localhost:5000/api/payments/stripe/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 9.99, "currency": "usd"}'
```

## Adding this to a new project in the future

Because everything routes through `PaymentFactory.getProvider(gatewayName)`, your frontend/other
services never need gateway-specific code — just call `/api/payments/<gateway>/create-order` with
that gateway's expected fields (see each Provider file's JSDoc comment on top of `createOrder`).

If a new project only needs 2 of these 6 gateways, just delete the unused provider files and remove
their `require` line in `PaymentFactory.js` — nothing else breaks.

---

## Demo (Sandbox) vs Live — what actually changes

**Good news: with this architecture, going live is a config change, not a code change**, for every
gateway except PayU/Paytm which need a base-URL flip that's already handled via `.env`.

| Gateway | Demo/Sandbox | Live | What YOU change to go live |
|---|---|---|---|
| **Stripe** | Keys start with `sk_test_...` | Keys start with `sk_live_...` | Just replace `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` in `.env` with live-mode values from Stripe Dashboard. Complete Stripe's business verification (KYC) first — live keys are blocked until that's done. |
| **Razorpay** | Keys start with `rzp_test_...` | Keys start with `rzp_live_...` | Replace `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/webhook secret. Live mode needs your Razorpay account fully KYC-activated (PAN, bank details, business docs). |
| **PayPal** | `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com` + sandbox app credentials | `PAYPAL_BASE_URL=https://api-m.paypal.com` + live app credentials | Create a **live** app in PayPal Developer Dashboard, swap client id/secret, and flip the base URL env var. Business account must be verified. |
| **PayU** | `PAYU_BASE_URL=https://test.payu.in` + test key/salt (`gtKFFx` / `eCwWELxi` — PayU's public test credentials) | `PAYU_BASE_URL=https://secure.payu.in` + your real merchant key/salt | Sign up for a live PayU merchant account (business KYC + bank account), then swap `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, and the base URL. |
| **Paytm** | `PAYTM_BASE_URL=https://securegw-stage.paytm.in`, `PAYTM_WEBSITE=WEBSTAGING` | `PAYTM_BASE_URL=https://securegw.paytm.in`, `PAYTM_WEBSITE=DEFAULT` (or your assigned live website name) | Get live MID + merchant key from Paytm Business Dashboard after KYC, update `.env`, change `PAYTM_WEBSITE` to the live value Paytm assigns you. |
| **PhonePe** | `PHONEPE_BASE_URL=https://api-preprod.phonepe.com/apis/pg-sandbox`, test MID `PGTESTPAYUAT` | `PHONEPE_BASE_URL=https://api.phonepe.com/apis/hermes` | Apply for PhonePe merchant onboarding, get live `PHONEPE_SALT_KEY`/`PHONEPE_MERCHANT_ID`, swap base URL. |

### Other things to do before going live (all gateways)
1. **HTTPS is mandatory** — no gateway will accept a plain `http://` callback/webhook/redirect URL in live mode. Deploy behind SSL (or use a service like Render/Railway/Vercel that gives HTTPS by default).
2. Update `BASE_URL` in `.env` to your real production domain — this auto-builds all the PayU/Paytm/PhonePe callback URLs.
3. Re-register webhook URLs in each gateway's live dashboard (Stripe/Razorpay/PayPal webhooks are dashboard-configured separately from sandbox ones).
4. Swap `Transaction.model.js` from the in-memory Map to a real DB (Mongoose code is already written as a comment inside that file — just uncomment + `npm i mongoose`) so transactions survive server restarts.
5. Never commit `.env` — only commit `.env.example`.
6. Double check amount-unit differences: Stripe/PayPal/PhonePe/Razorpay all want the **smallest currency unit** (paise/cents) — already handled inside each provider — while PayU/Paytm want the **decimal amount** (e.g. `499.00`) — also already handled. You don't need to touch this, just know it's why the code multiplies by 100 in some files and not others.

## Notes on current implementation
- **PayU refund** is left as a stub (`throw new Error(...)`) since PayU's refund API needs a separate live-only auth flow — wire it up once you have live merchant refund access.
- **Paytm checksum** is implemented natively with Node's built-in `crypto` (AES-128-CBC) so you're not dependent on Paytm's old, loosely-maintained `paytmchecksum` npm package.
- **PhonePe** status-check is used for verification (server-to-server) rather than trusting the redirect alone — this is PhonePe's recommended pattern.
- All 4 provider methods (`createOrder`, `verifyPayment`, `handleWebhook`, `refund`) are consistent across every gateway so your controller code never has gateway-specific branching.
