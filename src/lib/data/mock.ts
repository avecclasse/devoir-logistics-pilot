import { Household, Location } from "@/lib/engine/types";

export const bundle = {
  name: "Produce Bundle",
  contents: ["Potatoes", "Onions", "Broccoli", "Lettuce"],
};

/**
 * Notes:
 * - submitted_at is ISO with "Z" to prevent local timezone drift.
 * - Include a couple timestamp collisions to test deterministic tie-breaking by id.
 * - Tier mix is intentional: enough to satisfy floors (4 per tier) in the feasible scenario.
 */
export const households: Household[] = [
  { id: "H01", label: "Household 01", tier: "Equity",  submitted_at: "2026-02-28T14:00:00Z", preferredDay: "Mon", preferredWindow: { start: "16:00", end: "18:00" } },
  { id: "H02", label: "Household 02", tier: "Anchor",  submitted_at: "2026-02-28T14:01:00Z", preferredDay: "Mon", preferredWindow: { start: "17:00", end: "19:00" } },
  { id: "H03", label: "Household 03", tier: "Steward", submitted_at: "2026-02-28T14:02:00Z", preferredDay: "Tue", preferredWindow: { start: "12:00", end: "14:00" } },
  { id: "H04", label: "Household 04", tier: "Equity",  submitted_at: "2026-02-28T14:03:00Z", preferredDay: "Tue", preferredWindow: { start: "18:00", end: "20:00" } },

  { id: "H05", label: "Household 05", tier: "Anchor",  submitted_at: "2026-02-28T14:04:00Z", preferredDay: "Wed", preferredWindow: { start: "15:00", end: "17:00" } },
  { id: "H06", label: "Household 06", tier: "Steward", submitted_at: "2026-02-28T14:05:00Z", preferredDay: "Wed", preferredWindow: { start: "10:00", end: "12:00" } },
  { id: "H07", label: "Household 07", tier: "Equity",  submitted_at: "2026-02-28T14:06:00Z", preferredDay: "Thu", preferredWindow: { start: "16:00", end: "18:00" } },
  { id: "H08", label: "Household 08", tier: "Anchor",  submitted_at: "2026-02-28T14:07:00Z", preferredDay: "Thu", preferredWindow: { start: "11:00", end: "13:00" } },

  // Timestamp collision pair (same submitted_at, different ids) to validate id tie-breaker
  { id: "H09", label: "Household 09", tier: "Steward", submitted_at: "2026-02-28T14:08:00Z", preferredDay: "Fri", preferredWindow: { start: "14:00", end: "16:00" } },
  { id: "H10", label: "Household 10", tier: "Equity",  submitted_at: "2026-02-28T14:08:00Z", preferredDay: "Fri", preferredWindow: { start: "17:00", end: "19:00" } },

  { id: "H11", label: "Household 11", tier: "Anchor",  submitted_at: "2026-02-28T14:09:00Z", preferredDay: "Sat", preferredWindow: { start: "09:00", end: "11:00" } },
  { id: "H12", label: "Household 12", tier: "Steward", submitted_at: "2026-02-28T14:10:00Z", preferredDay: "Sat", preferredWindow: { start: "12:00", end: "14:00" } },
  { id: "H13", label: "Household 13", tier: "Equity",  submitted_at: "2026-02-28T14:11:00Z", preferredDay: "Sun", preferredWindow: { start: "13:00", end: "15:00" } },
  { id: "H14", label: "Household 14", tier: "Anchor",  submitted_at: "2026-02-28T14:12:00Z", preferredDay: "Sun", preferredWindow: { start: "16:00", end: "18:00" } },

  { id: "H15", label: "Household 15", tier: "Steward", submitted_at: "2026-02-28T14:13:00Z", preferredDay: "Mon", preferredWindow: { start: "12:00", end: "14:00" } },
  { id: "H16", label: "Household 16", tier: "Equity",  submitted_at: "2026-02-28T14:14:00Z", preferredDay: "Wed", preferredWindow: { start: "18:00", end: "20:00" } },
];

/**
 * FEASIBLE scenario: total capacity = 16 (5+4+4+3).
 * Floors (3 tiers * 4 = 12) are feasible.
 */
export const locations: Location[] = [
  {
    id: "L1",
    label: "Cathedral Kitchen Pickup",
    capacity: 5,
    windows: [
      { day: "Mon", start: "16:00", end: "18:00" },
      { day: "Wed", start: "15:00", end: "17:00" },
      { day: "Sat", start: "09:00", end: "12:00" },
    ],
  },
  {
    id: "L2",
    label: "Library Partner Pickup",
    capacity: 4,
    windows: [
      { day: "Tue", start: "12:00", end: "14:00" },
      { day: "Thu", start: "16:00", end: "18:00" },
      { day: "Sun", start: "13:00", end: "15:00" },
    ],
  },
  {
    id: "L3",
    label: "Community Center Pickup",
    capacity: 4,
    windows: [
      { day: "Mon", start: "17:00", end: "19:00" },
      { day: "Fri", start: "14:00", end: "16:00" },
      { day: "Sat", start: "12:00", end: "14:00" },
    ],
  },
  {
    id: "L4",
    label: "Church Partner Pickup",
    capacity: 3,
    windows: [
      { day: "Tue", start: "18:00", end: "20:00" },
      { day: "Wed", start: "10:00", end: "12:00" },
      { day: "Sun", start: "16:00", end: "18:00" },
    ],
  },
];

/**
 * INFEASIBLE capacity scenario to force soft scaling:
 * total capacity = 10 (4+2+2+2) which is < 12 floors.
 * effective_reserve should become floor(10 / 3) = 3.
 */
export const locationsInfeasible: Location[] = [
  {
    id: "L1",
    label: "Cathedral Kitchen Pickup (Reduced)",
    capacity: 4,
    windows: [
      { day: "Mon", start: "16:00", end: "18:00" },
      { day: "Wed", start: "15:00", end: "17:00" },
      { day: "Sat", start: "09:00", end: "12:00" },
    ],
  },
  {
    id: "L2",
    label: "Library Partner Pickup (Reduced)",
    capacity: 2,
    windows: [
      { day: "Tue", start: "12:00", end: "14:00" },
      { day: "Thu", start: "16:00", end: "18:00" },
      { day: "Sun", start: "13:00", end: "15:00" },
    ],
  },
  {
    id: "L3",
    label: "Community Center Pickup (Reduced)",
    capacity: 2,
    windows: [
      { day: "Mon", start: "17:00", end: "19:00" },
      { day: "Fri", start: "14:00", end: "16:00" },
      { day: "Sat", start: "12:00", end: "14:00" },
    ],
  },
  {
    id: "L4",
    label: "Church Partner Pickup (Reduced)",
    capacity: 2,
    windows: [
      { day: "Tue", start: "18:00", end: "20:00" },
      { day: "Wed", start: "10:00", end: "12:00" },
      { day: "Sun", start: "16:00", end: "18:00" },
    ],
  },
];