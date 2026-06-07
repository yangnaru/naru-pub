import { randomUUID } from "crypto";

const TOSS_API = "https://api.tosspayments.com";

export type BillingInterval = "month" | "year";

// Authoritative server-side amounts (KRW). Never trust client-sent amounts.
export const PLAN_AMOUNTS: Record<BillingInterval, number> = {
  month: 1000,
  year: 10000,
};

export const PLAN_ORDER_NAMES: Record<BillingInterval, string> = {
  month: "나루 후원 (월간)",
  year: "나루 후원 (연간)",
};

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year";
}

export class TossApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "TossApiError";
  }
}

function authHeader(): string {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) {
    throw new Error("TOSS_SECRET_KEY is not configured.");
  }
  // Toss uses HTTP Basic auth with the secret key as username and empty password.
  return "Basic " + Buffer.from(`${secret}:`).toString("base64");
}

async function tossRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${TOSS_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new TossApiError(
      (data?.message as string) ?? `Toss API request failed (${res.status})`,
      res.status,
      data?.code as string | undefined
    );
  }
  return data as T;
}

export type TossBillingKeyResult = {
  billingKey: string;
  customerKey: string;
};

// Exchanges the authKey from requestBillingAuth for a reusable billing key.
export function issueBillingKey(authKey: string, customerKey: string) {
  return tossRequest<TossBillingKeyResult>(
    "/v1/billing/authorizations/issue",
    { authKey, customerKey }
  );
}

export type TossPaymentResult = {
  paymentKey: string;
  orderId: string;
  status: string; // "DONE" on success
  totalAmount: number;
  approvedAt?: string;
  [key: string]: unknown;
};

// Charges a stored billing key for one period.
export function chargeBillingKey(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}) {
  const { billingKey, ...body } = params;
  return tossRequest<TossPaymentResult>(`/v1/billing/${billingKey}`, body);
}

export function addInterval(from: Date, interval: BillingInterval): Date {
  const d = new Date(from);
  if (interval === "month") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

export function newOrderId(): string {
  return `naru_${randomUUID().replace(/-/g, "")}`;
}
