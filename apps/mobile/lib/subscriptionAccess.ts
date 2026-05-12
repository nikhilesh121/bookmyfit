export type ActiveSubscriptionAccess = {
  gymIds: Set<string>;
  byGymId: Map<string, any>;
  hasMultiGym: boolean;
  multiGymSub: any | null;
};

export function normalizeSubscriptionList(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.subscriptions)) return data.subscriptions;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function endOfDayMs(value: any): number | null {
  if (!value) return null;
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T23:59:59.999`)
    : new Date(text);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isActiveSubscription(sub: any, now = Date.now()) {
  const status = String(sub?.status || '').toLowerCase();
  if (status && status !== 'active') return false;
  const endMs = endOfDayMs(sub?.endDate || sub?.validUntil);
  return endMs == null || endMs >= now;
}

export function subscriptionPlanType(sub: any) {
  return String(sub?.planType || sub?.plan?.planType || sub?.type || '').toLowerCase();
}

export function subscriptionGymIds(sub: any): string[] {
  const ids = Array.isArray(sub?.gymIds) ? sub.gymIds : [];
  const primary = sub?.primaryGymId || sub?.gymId || sub?.gym?.id || sub?.gym?._id || ids[0];
  return Array.from(new Set(ids.concat(primary ? [primary] : []).filter(Boolean).map((id: any) => String(id))));
}

export function getActiveSubscriptionAccess(subs: any[]): ActiveSubscriptionAccess {
  const gymIds = new Set<string>();
  const byGymId = new Map<string, any>();
  let hasMultiGym = false;
  let multiGymSub: any | null = null;

  subs.forEach((sub) => {
    if (!isActiveSubscription(sub)) return;
    const planType = subscriptionPlanType(sub);

    if (planType === 'multi_gym') {
      hasMultiGym = true;
      multiGymSub = multiGymSub || sub;
      return;
    }

    if (planType === 'same_gym' || planType === 'day_pass') {
      subscriptionGymIds(sub).forEach((gymId) => {
        gymIds.add(gymId);
        if (!byGymId.has(gymId)) byGymId.set(gymId, sub);
      });
    }
  });

  return { gymIds, byGymId, hasMultiGym, multiGymSub };
}

export function accessLabelForSubscription(sub: any, hasMultiGym = false) {
  if (hasMultiGym) return 'Multi-gym active';
  const planType = subscriptionPlanType(sub);
  if (planType === 'day_pass') return 'Day pass active';
  return 'Subscribed';
}
