"use client";

import { useMemo, useState } from "react";

type Result = any;

export default function Page() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTrace, setShowTrace] = useState(true);

  // scenario toggle to run infeasible capacity case without code edits
  const [scenario, setScenario] = useState<"feasible" | "infeasible">("feasible");

  const assignments = result?.assignments ?? [];
  const windowExceptions = useMemo(
    () => assignments.filter((a: any) => a.isException),
    [assignments]
  );
  const normal = useMemo(
    () => assignments.filter((a: any) => !a.isException),
    [assignments]
  );

  // Capacity-gated exception queue (unadmitted households)
  const capacityExceptionQueue = result?.exceptionQueue ?? [];

  // Prefer snapshot as the single source of truth for metrics
  const snapshot = result?.snapshot;

  const totalDemand = snapshot?.demand_total ?? assignments.length ?? 0;
  const assignedTotal = snapshot?.assigned_total ?? assignments.length ?? 0;
  const capacityTotal = snapshot?.capacity_total ?? 0;

  const exceptionsTotal = snapshot?.exceptions_total ?? capacityExceptionQueue.length ?? 0;
  const exceptionRatePct =
    snapshot?.exception_rate != null
      ? (snapshot.exception_rate * 100).toFixed(1)
      : totalDemand > 0
        ? ((exceptionsTotal / totalDemand) * 100).toFixed(1)
        : "0";

  const capacityUtilization =
    result?.manifests?.map((m: any) =>
      m.capacity > 0 ? m.assignedCount / m.capacity : 0
    ) ?? [];

  const avgUtilization =
    capacityUtilization.length > 0
      ? (
          (capacityUtilization.reduce((a: number, b: number) => a + b, 0) /
            capacityUtilization.length) *
          100
        ).toFixed(1)
      : "0";

  const maxStrain =
    result?.manifests?.reduce(
      (max: any, m: any) =>
        m.assignedCount / m.capacity >
        (max?.assignedCount ?? 0) / (max?.capacity ?? 1)
          ? m
          : max,
      null
    );

  async function run() {
    setLoading(true);
    const url =
      scenario === "infeasible" ? "/api/assign?scenario=infeasible" : "/api/assign";
    const res = await fetch(url);
    const json = await res.json();
    setResult(json);
    setLoading(false);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>
        Devoir Logistics Engine
      </h1>

      <p style={{ opacity: 0.8 }}>
        Allocation layer optimizing pickup capacity across partner locations | 
        Deterministic coordination: capacity → day → window → load. 
      </p>

      {result?.bundle && (
        <div style={{ opacity: 0.8 }}>
          <b>{result.bundle.name}:</b> {result.bundle.contents.join(", ")}
        </div>
      )}

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          marginTop: 16,
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Assignment Logic</div>
            <div style={{ fontWeight: 700 }}>Deterministic v1 (No ML)</div>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Pilot Scope</div>
            <div style={{ fontWeight: 700 }}>Tiered intake + pickup coordination (mock)</div>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Fulfillment Package</div>
            <div style={{ fontWeight: 700 }}>Produce Bundle</div>
          </div>
        </div>

        {/* Policy line (keeps stakeholders oriented) */}
        {snapshot && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            <b>Policy:</b> min reserve per tier = {snapshot.min_reserve} (effective ={" "}
            {snapshot.effective_reserve}); floors feasible:{" "}
            {snapshot.floors_feasible ? "yes" : "no"}; capacity total:{" "}
            {snapshot.capacity_total}; demand total: {snapshot.demand_total}
          </div>
        )}
      </section>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={run} disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Running..." : "Run Assignment"}
        </button>

        {/* scenario switch */}
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Scenario</span>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as any)}
            style={{ padding: "8px 10px" }}
          >
            <option value="feasible">Feasible capacity</option>
            <option value="infeasible">Infeasible capacity (soft scaling)</option>
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showTrace}
            onChange={() => setShowTrace((v) => !v)}
          />
          Show decision trace
        </label>
      </div>

      {result && (
        <>
          {/* Operational Metrics Snapshot (use snapshot) */}
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              marginTop: 16,
              background: "#fafafa",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              Operational Metrics Snapshot
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Demand (Households)</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{totalDemand}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Assigned</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{assignedTotal}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Capacity Total</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{capacityTotal}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Capacity Exception Rate</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{exceptionRatePct}%</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Avg Capacity Utilization</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{avgUtilization}%</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Highest Load Partner</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {maxStrain?.locationLabel ?? "—"}
                </div>
              </div>
            </div>
          </section>

          {/* Capacity Exception Queue (unadmitted households) */}
          {capacityExceptionQueue.length > 0 && (
            <section
              style={{
                border: "1px solid #f2c94c",
                borderRadius: 12,
                padding: 12,
                marginTop: 16,
                background: "#fff8e1",
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Capacity Exception Queue — Requires Human Resolution ({capacityExceptionQueue.length})
              </h2>
              <p style={{ marginTop: 0, opacity: 0.8 }}>
                These households were <b>not admitted</b> due to capacity gating + tier floors.
                Coordinator action: expand capacity, shift pickup windows, or defer to next run.
              </p>

              <ul style={{ paddingLeft: 18, marginTop: 8 }}>
                {capacityExceptionQueue.map((h: any) => (
                  <li key={h.id} style={{ marginBottom: 8 }}>
                    <b>{h.label}</b>{" "}
                    <span style={{ opacity: 0.85 }}>
                      — Tier: <b>{h.tier}</b>, Submitted: {h.submitted_at}
                    </span>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Preferred: {h.preferredDay} {h.preferredWindow.start}-{h.preferredWindow.end}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {windowExceptions.length > 0 && (
            <section
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                marginTop: 16,
                background: "#ffffff",
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Window Exceptions — Follow-Up Needed ({windowExceptions.length})
              </h2>
              <p style={{ marginTop: 0, opacity: 0.8 }}>
                These households were assigned a <b>suggested</b> pickup window (no true overlap).
                Confirm or reschedule.
              </p>

              <ul style={{ paddingLeft: 18, marginTop: 8 }}>
                {windowExceptions.map((a: any) => (
                  <li key={a.householdId} style={{ marginBottom: 8 }}>
                    <b>{a.householdLabel}</b> → {a.assignedLocationLabel}{" "}
                    {a.assignedWindow ? (
                      <span>
                        (<b>{a.windowSource}</b>: {a.assignedWindow.day}{" "}
                        {a.assignedWindow.start}-{a.assignedWindow.end})
                      </span>
                    ) : null}
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Tier: <b>{a.tier}</b> • Submitted: {a.submitted_at}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Violations: {a.violations?.length ? a.violations.join(", ") : "none"}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
            <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Household assignments</h2>
              <ul style={{ paddingLeft: 16 }}>
                {normal.map((a: any) => (
                  <li key={a.householdId} style={{ marginBottom: 10 }}>
                    <div>
                      <b>{a.householdLabel}</b> → {a.assignedLocationLabel}
                      {a.assignedWindow
                        ? ` (${a.assignedWindow.day} ${a.assignedWindow.start}-${a.assignedWindow.end})`
                        : ""}
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Tier: <b>{a.tier}</b> • Submitted: {a.submitted_at}
                    </div>

                    {a.violations?.length ? (
                      <div style={{ opacity: 0.8 }}>Violations: {a.violations.join(", ")}</div>
                    ) : (
                      <div style={{ opacity: 0.8 }}>Violations: none</div>
                    )}

                    {showTrace && (
                      <details style={{ marginTop: 6 }}>
                        <summary>Decision trace</summary>
                        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
                          {JSON.stringify(a.trace, null, 2)}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Partner manifests</h2>
              {result.manifests.map((m: any) => (
                <div key={m.locationId} style={{ marginBottom: 14 }}>
                  <div>
                    <b>{m.locationLabel}</b> — {m.assignedCount}/{m.capacity}
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>
                    Windows used:
                    <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                      {m.windowsUsed.length ? (
                        m.windowsUsed.map((w: any) => (
                          <li key={`${w.day}-${w.start}-${w.end}`}>
                            {w.day} {w.start}-{w.end} (x{w.count})
                          </li>
                        ))
                      ) : (
                        <li>none</li>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </main>
  );
}