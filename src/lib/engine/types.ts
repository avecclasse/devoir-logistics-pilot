export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type Tier = "Equity" | "Anchor" | "Steward";

export type TimeWindow = {
  day: Day;
  start: string; // "HH:MM" 24h
  end: string;   // "HH:MM"
};

export type Household = {
  id: string;
  label: string;

  // NEW: tier + deterministic ordering inputs
  tier: Tier;
  submitted_at: string; // ISO string, e.g. "2026-02-28T19:05:00Z"

  preferredDay: Day;
  preferredWindow: { start: string; end: string };
};

export type Location = {
  id: string;
  label: string;
  capacity: number;
  windows: TimeWindow[];
};

export type Violation =
  | "NO_CAPACITY"
  | "DAY_MISMATCH"
  | "NO_WINDOW_OVERLAP";

export type WindowSource = "OVERLAP" | "SUGGESTED";

export type CandidateEval = {
  locationId: string;
  locationLabel: string;
  capacityOk: boolean;
  dayMatch: boolean;
  windowOverlap: boolean;
  loadBefore: number;
  overlapWith?: TimeWindow;
  violations: Violation[];
};

export type Assignment = {
  householdId: string;
  householdLabel: string;

  // NEW: carry-through for auditing
  tier: Tier;
  submitted_at: string;

  assignedLocationId: string;
  assignedLocationLabel: string;
  assignedWindow?: TimeWindow;
  windowSource: WindowSource; // OVERLAP if true overlap, otherwise SUGGESTED
  isException: boolean;       // true when we had to suggest a window (no overlap)

  violations: Violation[];
  trace: {
    preferredDay: Day;
    preferredWindow: { start: string; end: string };
    evaluatedCandidates: CandidateEval[];
    suggestedWindow?: TimeWindow;
    selectedRationale: string;
  };
};

export type Manifest = {
  locationId: string;
  locationLabel: string;
  capacity: number;
  assignedCount: number;
  windowsUsed: Array<{ day: Day; start: string; end: string; count: number }>;
  households: Array<{
    householdId: string;
    householdLabel: string;
    tier: Tier;
    submitted_at: string;
    window?: TimeWindow;
    violations: Violation[];
  }>;
};

// policy/config types
export type EnginePolicy = {
  tiers: Tier[];        // ["Equity","Anchor","Steward"]
  min_reserve: number;  // e.g., 4
};

export type TierCounts = Record<Tier, number>;

export type FulfillmentSnapshot = {
  capacity_total: number;

  tiers: Tier[];
  min_reserve: number;
  effective_reserve: number;     // soft-scaled reserve
  floors_feasible: boolean;      // capacity_total >= tiers.length * min_reserve

  demand_total: number;
  demand_by_tier: TierCounts;

  assigned_total: number;
  assigned_by_tier: TierCounts;

  exceptions_total: number;
  exceptions_by_tier: TierCounts;

  // optional but useful for coordinator page
  exception_rate: number;        // exceptions_total / demand_total
};

export type AssignmentResult = {
  // Keep this for now if your UI expects it,
  // but you may rename it later to "fulfillmentPackage" for clarity.
  bundle: { name: string; contents: string[] };

  // carry policy + snapshot
  policy: EnginePolicy;
  snapshot: FulfillmentSnapshot;

  assignments: Assignment[];
  manifests: Manifest[];

  exceptionQueue: Household[];
};