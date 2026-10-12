// Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
// The script is loaded on demand, only when someone actually pays.

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", cb: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loading = null;
        reject(new Error("Couldn't load Razorpay. Check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return loading;
}

/** Opens Checkout and resolves with the signed result, or null if the user
 * closed it. A failed attempt keeps Checkout open for a retry; it only
 * rejects if they then close it. */
export async function openCheckout(
  options: Omit<RazorpayOptions, "handler" | "modal">
): Promise<RazorpaySuccess | null> {
  await loadCheckout();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Couldn't load Razorpay.");
  return new Promise((resolve, reject) => {
    let lastError: string | null = null;
    const checkout = new Razorpay({
      ...options,
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => (lastError ? reject(new Error(lastError)) : resolve(null)),
      },
    });
    checkout.on("payment.failed", (response) => {
      lastError = response.error?.description || "Payment failed.";
    });
    checkout.open();
  });
}
