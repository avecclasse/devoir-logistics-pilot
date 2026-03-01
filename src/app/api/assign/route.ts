import { NextResponse } from "next/server";
import { runAssignment } from "@/lib/engine/assign";
import type { EnginePolicy } from "@/lib/engine/types";
import {
  bundle,
  households,
  locations,
  locationsInfeasible,
} from "@/lib/data/mock";

const POLICY: EnginePolicy = {
  tiers: ["Equity", "Anchor", "Steward"],
  min_reserve: 4,
};

type Scenario = "feasible" | "infeasible";

function getScenario(req: Request): Scenario {
  const value = new URL(req.url).searchParams.get("scenario");
  return value === "infeasible" ? "infeasible" : "feasible";
}

export async function GET(req: Request) {
  const scenario = getScenario(req);

  const chosenLocations =
    scenario === "infeasible" ? locationsInfeasible : locations;

  const result = runAssignment(households, chosenLocations, bundle, POLICY);

  return NextResponse.json(result);
}