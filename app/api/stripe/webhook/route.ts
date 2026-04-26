import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import stripe from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};
      const userId = meta.user_id;
      const plan = meta.plan;
      const seats = Number(meta.seats ?? 1);
      const minutesLimit = Number(meta.minutes_limit ?? 60);
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!userId || !plan) break;

      // Get or create org for this user
      let orgId: string;
      const { data: existingMembership } = await supabase
        .from("memberships")
        .select("org_id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (existingMembership) {
        orgId = existingMembership.org_id;
      } else {
        const { data: newOrg } = await supabase
          .from("organizations")
          .insert({ name: "My Organization", owner_id: userId })
          .select("id")
          .single();
        if (!newOrg) break;
        orgId = newOrg.id;
        await supabase.from("memberships").insert({ user_id: userId, org_id: orgId, role: "admin" });
      }

      // current_period_end is now on subscription items (Stripe API 2026+)
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
      const firstItem = stripeSub.items.data[0];
      const periodEnd = firstItem
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null;

      await supabase.from("subscriptions").upsert(
        {
          org_id: orgId,
          plan,
          status: "active",
          seats,
          minutes_limit: minutesLimit,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          current_period_end: periodEnd,
        },
        { onConflict: "org_id" }
      );
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const status =
        sub.status === "active" ? "active"
        : sub.status === "past_due" ? "past_due"
        : sub.status === "canceled" ? "canceled"
        : "inactive";

      const firstItem = sub.items.data[0];
      const periodEnd = firstItem
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null;

      await supabase
        .from("subscriptions")
        .update({ status, ...(periodEnd ? { current_period_end: periodEnd } : {}) })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
