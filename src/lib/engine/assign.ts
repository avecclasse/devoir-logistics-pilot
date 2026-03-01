import {
  Assignment,
  AssignmentResult,
  CandidateEval,
  Manifest,
  TimeWindow,
  Tier,
  EnginePolicy,
  FulfillmentSnapshot,
  Violation,
  WindowSource,
  Household,
  Location,
} from "@/lib/engine/types";

/* ---------- Utility Helpers ---------- */

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(pref: { start: string; end: string }, window: TimeWindow) {
  const prefStart = timeToMinutes(pref.start);
  const prefEnd = timeToMinutes(pref.end);
  const winStart = timeToMinutes(window.start);
  const winEnd = timeToMinutes(window.end);
  return prefStart < winEnd && winStart < prefEnd;
}

const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function dayDistance(a: string, b: string) {
  const ai = dayOrder.indexOf(a as any);
  const bi = dayOrder.indexOf(b as any);
  return Math.abs(ai - bi);
}

function windowMidpointMinutes(w: { start: string; end: string }) {
  return (timeToMinutes(w.start) + timeToMinutes(w.end)) / 2;
}

function pickClosestWindow(
  locationWindows: TimeWindow[],
  preferredDay: string,
  preferredWindow: { start: string; end: string }
) {
  const prefMid = windowMidpointMinutes(preferredWindow);

  const sorted = [...locationWindows].sort((w1, w2) => {
    const d1 = dayDistance(w1.day, preferredDay);
    const d2 = dayDistance(w2.day, preferredDay);
    if (d1 !== d2) return d1 - d2;

    const t1 = Math.abs(windowMidpointMinutes(w1) - prefMid);
    const t2 = Math.abs(windowMidpointMinutes(w2) - prefMid);
    if (t1 !== t2) return t1 - t2;

    const o1 = dayOrder.indexOf(w1.day as any);
    const o2 = dayOrder.indexOf(w2.day as any);
    if (o1 !== o2) return o1 - o2;

    return timeToMinutes(w1.start) - timeToMinutes(w2.start);
  });

  return sorted[0];
}

/* ---------- Tier + FIFO Helpers ---------- */

function sortBySubmittedThenId(a: Household, b: Household) {
  const ta = Date.parse(a.submitted_at);
  const tb = Date.parse(b.submitted_at);
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
}

function zeroTierCounts(tiers: Tier[]) {
  return tiers.reduce((acc, t) => {
    acc[t] = 0;
    return acc;
  }, {} as Record<Tier, number>);
}

/**
 * Decide which households are admitted into this run (capacity-gated),
 * using soft-scaled tier floors + deterministic FIFO.
 */
function selectHouseholdsForRun(
  allHouseholds: Household[],
  capacityTotal: number,
  policy: EnginePolicy
) {
  const tiers = policy.tiers;
  const minReserve = policy.min_reserve;

  const floorsRequired = tiers.length * minReserve;
  const floorsFeasible = capacityTotal >= floorsRequired;

  const effectiveReserve = floorsFeasible
    ? minReserve
    : Math.floor(capacityTotal / tiers.length); // soft scaling

  // Group by tier
  const byTier: Record<Tier, Household[]> = {
    Equity: [],
    Anchor: [],
    Steward: [],
  };

  for (const h of allHouseholds) byTier[h.tier].push(h);

  // Sort within each tier FIFO
  for (const t of tiers) byTier[t].sort(sortBySubmittedThenId);

  const selected: Household[] = [];
  const selectedIds = new Set<string>();

  // Phase 1: floor allocation (may be 0)
  if (effectiveReserve > 0) {
    for (const t of tiers) {
      const take = Math.min(effectiveReserve, byTier[t].length);
      for (let i = 0; i < take; i++) {
        const h = byTier[t][i];
        selected.push(h);
        selectedIds.add(h.id);
      }
    }
  }

  // Phase 2: remainder allocation globally FIFO
  const remainingCapacity = Math.max(0, capacityTotal - selected.length);

  if (remainingCapacity > 0) {
    const remainder = allHouseholds
      .filter((h) => !selectedIds.has(h.id))
      .sort(sortBySubmittedThenId);

    for (let i = 0; i < Math.min(remainingCapacity, remainder.length); i++) {
      const h = remainder[i];
      selected.push(h);
      selectedIds.add(h.id);
    }
  }

  const exceptionQueue = allHouseholds
    .filter((h) => !selectedIds.has(h.id))
    .sort(sortBySubmittedThenId);

  return { selected, exceptionQueue, floorsFeasible, effectiveReserve };
}

/* ---------- Deterministic Engine ---------- */

export function runAssignment(
  households: Household[],
  locations: Location[],
  bundle: { name: string; contents: string[] },
  policy: EnginePolicy = { tiers: ["Equity", "Anchor", "Steward"], min_reserve: 4 }
): AssignmentResult {
  const capacityTotal = locations.reduce((sum, l) => sum + l.capacity, 0);

  const { selected, exceptionQueue, floorsFeasible, effectiveReserve } =
    selectHouseholdsForRun(households, capacityTotal, policy);

  // Load tracker
  const load: Record<string, number> = {};
  locations.forEach((l) => (load[l.id] = 0));

  const assignments: Assignment[] = [];

  // Only assign selected households (capacity-gated upstream)
  for (const household of selected) {
    const candidateEvals: CandidateEval[] = [];

    for (const location of locations) {
      const capacityOk = load[location.id] < location.capacity;

      const sameDayWindows = location.windows.filter(
        (w) => w.day === household.preferredDay
      );

      const overlapWindow = sameDayWindows.find((w) =>
        overlaps(household.preferredWindow, w)
      );

      const dayMatch = sameDayWindows.length > 0;
      const windowOverlap = !!overlapWindow;

      const violations: Violation[] = [];
      if (!capacityOk) violations.push("NO_CAPACITY");
      if (!dayMatch) violations.push("DAY_MISMATCH");
      if (dayMatch && !windowOverlap) violations.push("NO_WINDOW_OVERLAP");

      candidateEvals.push({
        locationId: location.id,
        locationLabel: location.label,
        capacityOk,
        dayMatch,
        windowOverlap,
        loadBefore: load[location.id],
        overlapWith: overlapWindow,
        violations,
      });
    }

    // Deterministic ranking:
    // 1) capacity
    // 2) day match
    // 3) window overlap
    // 4) lowest load
    const sorted = [...candidateEvals].sort((a, b) => {
      if (a.capacityOk !== b.capacityOk) return a.capacityOk ? -1 : 1;
      if (a.dayMatch !== b.dayMatch) return a.dayMatch ? -1 : 1;
      if (a.windowOverlap !== b.windowOverlap) return a.windowOverlap ? -1 : 1;
      return a.loadBefore - b.loadBefore;
    });

    const selectedCandidate = sorted[0];

    // Only increment load if we truly had capacity at the chosen location.
    // (With upstream gating + capacity-first ranking, this should hold.)
    if (selectedCandidate.capacityOk) {
      load[selectedCandidate.locationId] += 1;
    }

    const selectedLocation = locations.find(
      (l) => l.id === selectedCandidate.locationId
    )!;

    const finalWindow =
      selectedCandidate.overlapWith ??
      pickClosestWindow(
        selectedLocation.windows,
        household.preferredDay,
        household.preferredWindow
      );

    const windowSource: WindowSource = selectedCandidate.overlapWith
      ? "OVERLAP"
      : "SUGGESTED";
    const isException = windowSource === "SUGGESTED"; // window exception (not capacity)

    assignments.push({
      householdId: household.id,
      householdLabel: household.label,
      tier: household.tier,
      submitted_at: household.submitted_at,

      assignedLocationId: selectedCandidate.locationId,
      assignedLocationLabel: selectedCandidate.locationLabel,
      assignedWindow: finalWindow,
      windowSource,
      isException,

      violations: selectedCandidate.violations,
      trace: {
        preferredDay: household.preferredDay,
        preferredWindow: household.preferredWindow,
        evaluatedCandidates: candidateEvals,
        selectedRationale:
          "Ranked by capacity → day → overlap → lowest load (deterministic)",
        suggestedWindow: isException ? finalWindow : undefined,
      },
    });
  }

  const manifests: Manifest[] = locations.map((location) => {
    const assigned = assignments.filter((a) => a.assignedLocationId === location.id);

    const windowUsage: Record<string, number> = {};
    assigned.forEach((a) => {
      if (!a.assignedWindow) return;
      const key = `${a.assignedWindow.day}-${a.assignedWindow.start}-${a.assignedWindow.end}`;
      windowUsage[key] = (windowUsage[key] || 0) + 1;
    });

    return {
      locationId: location.id,
      locationLabel: location.label,
      capacity: location.capacity,
      assignedCount: assigned.length,
      windowsUsed: Object.entries(windowUsage).map(([key, count]) => {
        const [day, start, end] = key.split("-");
        return { day: day as any, start, end, count };
      }),
      households: assigned.map((a) => ({
        householdId: a.householdId,
        householdLabel: a.householdLabel,
        tier: a.tier,
        submitted_at: a.submitted_at,
        window: a.assignedWindow,
        violations: a.violations,
      })),
    };
  });

  // Snapshot (capacity exception queue is separate from window exceptions)
  const demandByTier = zeroTierCounts(policy.tiers);
  households.forEach((h) => (demandByTier[h.tier] += 1));

  const assignedByTier = zeroTierCounts(policy.tiers);
  assignments.forEach((a) => (assignedByTier[a.tier] += 1));

  const exceptionsByTier = zeroTierCounts(policy.tiers);
  exceptionQueue.forEach((h) => (exceptionsByTier[h.tier] += 1));

  const snapshot: FulfillmentSnapshot = {
    capacity_total: capacityTotal,

    tiers: policy.tiers,
    min_reserve: policy.min_reserve,
    effective_reserve: effectiveReserve,
    floors_feasible: floorsFeasible,

    demand_total: households.length,
    demand_by_tier: demandByTier,

    assigned_total: assignments.length,
    assigned_by_tier: assignedByTier,

    exceptions_total: exceptionQueue.length,
    exceptions_by_tier: exceptionsByTier,

    exception_rate: households.length ? exceptionQueue.length / households.length : 0,
  };

  return {
    bundle,
    policy,
    snapshot,
    assignments,
    manifests,
    exceptionQueue,
  };
}