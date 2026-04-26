import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { getUserFromRequest } from "@/lib/supabase/server";

const APP_URL = "https://voice2task-ten.vercel.app";

const PRICE_IDS: Record<string, string> = {
  team: process.env.STRIPE_PRICE_TEAM ?? "",
  business: process.env.STRIPE_PRICE_BUSINESS ?? "",
};

const SEATS: Record<string, number> = {
  team: 5,
  business: 15,
};

const MINUTES_LIMIT: Record<string, number> = {
  team: 300,    // 5 seats × 60 min
  business: 900, // 15 seats × 60 min
};

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = (await req.json()) as { plan: string };
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/?checkout=success`,
    cancel_url: `${APP_URL}/paywall`,
    metadata: {
      user_id: user.id,
      plan,
      seats: String(SEATS[plan]),
      minutes_limit: String(MINUTES_LIMIT[plan]),
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan,
        seats: String(SEATS[plan]),
        minutes_limit: String(MINUTES_LIMIT[plan]),
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
