"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/app/components/AuthProvider";

export type Plan = "personal" | "team" | "business";
export type SubscriptionStatus = "active" | "inactive" | "past_due" | "canceled";

export interface Subscription {
  orgId: string;
  plan: Plan;
  status: SubscriptionStatus;
  seats: number;
  minutesLimit: number;
  currentPeriodEnd: string | null;
  role: "admin" | "member";
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    supabase
      .from("memberships")
      .select("org_id, role, organizations(subscriptions(plan, status, seats, minutes_limit, current_period_end))")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }

        type OrgRow = {
          org_id: string;
          role: string;
          organizations: { subscriptions: { plan: string; status: string; seats: number; minutes_limit: number; current_period_end: string | null }[] } | null;
        };

        const activeSub = (data as unknown as OrgRow[])
          .flatMap((m) =>
            (m.organizations?.subscriptions ?? []).map((s) => ({
              orgId: m.org_id,
              role: m.role as "admin" | "member",
              plan: s.plan as Plan,
              status: s.status as SubscriptionStatus,
              seats: s.seats,
              minutesLimit: s.minutes_limit,
              currentPeriodEnd: s.current_period_end,
            }))
          )
          .find((s) => s.status === "active") ?? null;

        setSubscription(activeSub);
        setLoading(false);
      });
  }, [user]);

  const isActive = subscription?.status === "active";

  return { subscription, isActive, loading };
}
