// PayPal REST client: OAuth, Orders v2 (human checkout), Vault v3 (saved method
// the agent can charge later, inside the mandate). Talks to the sandbox by default.
//
// With no credentials configured, PAYPAL_MODE=mock simulates the same responses
// so the rest of the app can be explored offline. The dashboard labels mock mode.

import crypto from "node:crypto";

const BASES = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

export function paypalMode() {
  if (process.env.PAYPAL_MODE === "mock") return "mock";
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return "mock";
  return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
}

let cachedToken = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${BASES[paypalMode()]}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new PayPalError("oauth", res.status, await res.text());
  const body = await res.json();
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

export class PayPalError extends Error {
  constructor(op, status, detail) {
    super(`PayPal ${op} failed (${status}): ${String(detail).slice(0, 400)}`);
    this.status = status;
    this.detail = detail;
  }
}

async function call(op, method, path, body, requestId) {
  const res = await fetch(`${BASES[paypalMode()]}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      // Idempotency: a retried agent charge must never double-bill.
      "PayPal-Request-Id": requestId || crypto.randomUUID(),
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new PayPalError(op, res.status, text);
  return json;
}

const link = (resource, rel) => resource.links?.find((l) => l.rel === rel)?.href;
const money = (usd) => ({ currency_code: "USD", value: usd.toFixed(2) });

function purchaseUnit(amountUsd, description, customId) {
  return { amount: money(amountUsd), description, custom_id: customId };
}

// ---- Human checkout (Orders v2) -------------------------------------------

export async function createCheckoutOrder({ amountUsd, returnUrl, cancelUrl, description, customId }) {
  if (paypalMode() === "mock") {
    const id = `MOCK-ORDER-${crypto.randomUUID().slice(0, 8)}`;
    return { id, approveUrl: `${returnUrl}?token=${id}&mock=1` };
  }
  const order = await call("create order", "POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [purchaseUnit(amountUsd, description, customId)],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "ContextPay",
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      },
    },
  });
  return { id: order.id, approveUrl: link(order, "payer-action") || link(order, "approve") };
}

export async function captureOrder(orderId) {
  if (paypalMode() === "mock") return { id: orderId, status: "COMPLETED", captureId: `MOCK-CAP-${orderId.slice(-8)}` };
  const order = await call("capture order", "POST", `/v2/checkout/orders/${orderId}/capture`, {}, `capture-${orderId}`);
  return summarizeOrder(order);
}

function summarizeOrder(order) {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  return { id: order.id, status: order.status, captureId: capture?.id, captureStatus: capture?.status };
}

// ---- Vault: save a PayPal wallet for agent-initiated charges (Vault v3) ------

export async function createVaultSetupToken({ returnUrl, cancelUrl }) {
  if (paypalMode() === "mock") {
    const id = `MOCK-SETUP-${crypto.randomUUID().slice(0, 8)}`;
    return { id, approveUrl: `${returnUrl}?approval_token_id=${id}&mock=1` };
  }
  const setup = await call("create vault setup token", "POST", "/v3/vault/setup-tokens", {
    payment_source: {
      paypal: {
        description: "ContextPay: lets your coding agent top up compression credits within your limits",
        usage_type: "MERCHANT",
        customer_type: "CONSUMER",
        permit_multiple_payment_tokens: false,
        experience_context: {
          brand_name: "ContextPay",
          return_url: returnUrl,
          cancel_url: cancelUrl,
          shipping_preference: "NO_SHIPPING",
          vault_instruction: "ON_PAYER_APPROVAL",
        },
      },
    },
  });
  return { id: setup.id, approveUrl: link(setup, "approve") };
}

export async function createPaymentToken(setupTokenId) {
  if (paypalMode() === "mock") {
    return { id: `MOCK-VAULT-${setupTokenId.slice(-8)}`, payerEmail: "sandbox-buyer@example.com" };
  }
  const token = await call("create payment token", "POST", "/v3/vault/payment-tokens", {
    payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } },
  }, `vault-${setupTokenId}`);
  return { id: token.id, payerEmail: token.payment_source?.paypal?.email_address || null };
}

// Merchant-initiated charge against the vaulted wallet. No buyer present:
// this is the call the agent's planner triggers, so the server checks the
// mandate before it is ever reached (see mandate.js).
export async function chargeVault({ paymentTokenId, amountUsd, description, customId, requestId }) {
  if (paypalMode() === "mock") {
    return { id: `MOCK-ORDER-${requestId.slice(0, 8)}`, status: "COMPLETED", captureId: `MOCK-CAP-${requestId.slice(-8)}` };
  }
  const order = await call("vault charge", "POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [purchaseUnit(amountUsd, description, customId)],
    payment_source: {
      paypal: {
        vault_id: paymentTokenId,
        stored_credential: {
          payment_initiator: "MERCHANT",
          payment_type: "UNSCHEDULED",
          usage: "SUBSEQUENT",
        },
      },
    },
  }, requestId);
  // Vaulted PayPal orders usually complete on create; capture if they don't.
  if (order.status === "COMPLETED") return summarizeOrder(order);
  return captureOrder(order.id);
}
