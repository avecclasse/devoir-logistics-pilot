# Devoir Logistics Pilot  
**Deterministic Allocation Engine for Capacity-Constrained Pickup Networks**

---

## Overview

This project implements a deterministic coordination engine designed to optimize household assignments across limited-capacity pickup partners.

The system models a real-world constraint:

> When demand exceeds partner capacity, how do we allocate fairly, transparently, and reproducibly?

Instead of probabilistic or ML-based routing, this engine uses explicit policy rules, tier floors, and deterministic ranking logic.

---

## Core Features

### 1. Tiered Capacity Floors

Three household tiers:

- Equity  
- Anchor  
- Steward  

Each tier is assigned a minimum capacity reserve (default: **4 seats per tier**).

If total capacity is insufficient to honor all floors:

- The system soft-scales reserves proportionally  
- Preserves fairness structure  
- Maintains deterministic ordering  

---

### 2. Deterministic Ranking Logic

Within each tier, assignments are ranked by:

1. Capacity availability  
2. Preferred day match  
3. Time window overlap  
4. Lowest current load  
5. Timestamp (FIFO tie-breaker)  

This guarantees reproducable results & transparent decision traces

---

### 3. Exception Queue

If no true time window overlap exists:

- A suggested closest window is assigned  
- The household is flagged as `isException: true`  
- Full decision trace is preserved  
- The UI surfaces a coordinator-facing exception queue  

This enables human follow-up without breaking allocation determinism.

---

### 4. Infeasible Capacity Scenario

The engine can be tested under two modes:

- Feasible  
- Infeasible (`?scenario=infeasible`)  

In infeasible mode:

- Total demand exceeds available capacity  
- Reserve scaling activates  
- Exception rates increase  
- Coordinator metrics update  

This stress-tests fairness and constraint handling.

---

## Operational Snapshot (Generated Per Run)

The API returns:

- Total demand  
- Assigned by tier  
- Exceptions by tier  
- Effective reserve  
- Feasibility flag  
- Exception rate  
- Partner manifests  
- Window usage counts  

This simulates the coordinator dashboard environment.

---

## Project Structure
src/
app/
api/assign/route.ts → API endpoint
page.tsx → Coordinator UI
lib/
data/mock.ts → Mock households + locations
engine/
assign.ts → Deterministic allocation engine
types.ts → Policy + snapshot + assignment types

---

## Running Locally

Install dependencies:

```bash
npm install
```
Run development server:
```
npm run dev
```

Open:
```
http://localhost:3000
```

To test infeasible mode:
```
/api/assign?scenario=infeasible
```

## Why Deterministic?

This system was built to model constrained distribution networks (e.g., food access pilots, transportation scheduling, last-mile delievery). 

These systems require allocation logic that's explainable and explicit exception handling because randomized or opaque routing systems erode trust.

This engine prioritizes policy clarity, capacity transparency, and deterministic fairness.