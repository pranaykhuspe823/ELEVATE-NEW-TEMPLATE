import { Router, raw } from "express";
import { verifyWebhookSignature } from "../lib/razorpay";
import { applyPaidOrder } from "../services/billing";
import { prisma } from "../lib/prisma";

export const webhooksRouter = Router();

/** Razorpay webhook (Dashboard -> Webhooks, events: payment.captured,
 * payment.failed, order.paid). Backs up the Checkout callback: if the admin
 * closes the tab after paying, the plan still activates. Needs the raw body
 * for the signature check, so it's mounted before express.json(). */
webhooksRouter.post("/razorpay", raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const signature = req.header("x-razorpay-signature") || "";
  if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
    res.status(400).json({ error: "Invalid signature." });
    return;
  }

  let event: any;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    res.status(400).json({ error: "Malformed body." });
    return;
  }

  try {
    const payment = event?.payload?.payment?.entity;
    if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id) {
      await applyPaidOrder(payment.order_id, payment.id);
    } else if (event.event === "payment.failed" && payment?.order_id) {
      await prisma.payment.updateMany({
        where: { razorpayOrderId: payment.order_id, status: "created" },
        data: { status: "failed" },
      });
    }
  } catch (err) {
    // 5xx makes Razorpay retry later.
    console.error("[razorpay] webhook", err);
    res.status(500).json({ error: "Processing failed." });
    return;
  }
  res.json({ ok: true });
});
