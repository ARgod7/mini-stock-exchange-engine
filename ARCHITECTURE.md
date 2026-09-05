# Mini Stock Exchange Simulator — Master Architecture Document

> **Purpose of this file:** This is the single source of truth for this project. Every time context is lost (chat limit, new session, new agent), paste this entire file back in before continuing. Update the **Status Log** at the bottom after every completed task — that log is what tells the next session exactly where to resume.

**Target role:** Full Stack Developer Intern @ Nubra (Bengaluru)
**Why this project exists:** To be a *real*, deployable, demo-able version of the "Mini Stock Exchange Simulator" resume bullet, built to map 1:1 onto Nubra's JD requirements: Golang, C++, Next.js, DSA, low-latency systems, concurrency, client-server architecture.

---

## 1. Non-Negotiable Requirements (from resume bullets — do not deviate)

| # | Resume claim | Concrete requirement |
|---|---|---|
| 1 | "C++ order matching engine using price-time priority and efficient data structures" | Real matching engine in C++, price-ordered book, FIFO within a price level |
| 2 | "Golang backend with REST APIs for order submission and WebSocket streaming of live trade updates" | Go service exposing REST (submit orders) + WebSocket (broadcast trades/book) |
| 3 | "Next.js dashboard displaying real-time order books, executed trades, and market statistics through WebSockets" | Next.js frontend, WS-driven, zero business logic client-side |
| 4 | "Concurrent order processing with performance benchmarking for efficient, low-latency matching" | Real concurrency (not simulated) + a benchmark script producing real throughput/latency numbers |

If any implementation decision conflicts with this table, this table wins.

---

## 2. System Architecture

```
┌─────────────────┐     WebSocket / REST      ┌──────────────────────────┐     gRPC      ┌──────────────────────┐
│   Next.js UI     │ ───────────────────────► │      Go Backend           │ ────────────► │  C++ Matching Engine  │
│  (Vercel)        │ ◄─────────────────────── │  (Railway, Docker)        │ ◄──────────── │  (same container)     │
│                  │  live book/trades/stats   │  REST API + WS Hub +      │  orders/fills │  price-time priority   │
└─────────────────┘                            │  gRPC client              │               │  order book, matching  │
                                                └──────────────────────────┘               └──────────────────────┘
```

**Key decision:** Go ↔ C++ communicate over **gRPC**, not `cgo`. Reasons:
- Clean process boundary → easier to deploy, easier to demo as "microservices" in an interview
- Matches "Client-Server Architecture" and "RESTful API Design" resume skills
- No cross-compilation pain with cgo

**Deployment:** Both C++ engine and Go backend run in **one Docker container** on Railway (process supervisor, e.g. `supervisord` or a tiny shell script starting both). Next.js deploys separately to Vercel.

---

## 3. Repository Structure

```
stock-exchange/
├── ARCHITECTURE.md          ← this file, kept in sync, source of truth
├── proto/
│   └── exchange.proto       ← gRPC contract between Go and C++
├── engine/                  ← C++ matching engine
│   ├── src/
│   ├── include/
│   ├── tests/
│   └── CMakeLists.txt
├── backend/                 ← Go service
│   ├── cmd/server/
│   ├── internal/
│   │   ├── grpcclient/
│   │   ├── rest/
│   │   └── ws/
│   └── go.mod
├── frontend/                 ← Next.js dashboard
│   ├── app/
│   ├── components/
│   └── lib/ws-client.ts
├── benchmarks/
│   ├── load_test.go (or .js for k6)
│   └── RESULTS.md
├── docker/
│   ├── Dockerfile            ← multi-stage, builds engine + backend, runs both
│   └── docker-compose.yml    ← local dev only
└── docs/
    └── interview-notes.md    ← how this maps to Nubra JD (not shown to recruiters)
```

---

## 4. gRPC Contract (proto/exchange.proto) — Draft

```protobuf
syntax = "proto3";
package exchange;

service MatchingEngine {
  rpc SubmitOrder(OrderRequest) returns (OrderResponse);
  rpc CancelOrder(CancelRequest) returns (CancelResponse);
  rpc StreamTrades(Empty) returns (stream Trade);
  rpc StreamBookUpdates(Empty) returns (stream BookSnapshot);
}

enum Side { BUY = 0; SELL = 1; }

message OrderRequest {
  string order_id = 1;
  Side side = 2;
  double price = 3;
  int64 quantity = 4;
  int64 timestamp_ns = 5;
}

message OrderResponse {
  string order_id = 1;
  bool accepted = 2;
  string message = 3;
}

message CancelRequest { string order_id = 1; }
message CancelResponse { bool success = 1; }

message Trade {
  string trade_id = 1;
  string buy_order_id = 2;
  string sell_order_id = 3;
  double price = 4;
  int64 quantity = 5;
  int64 timestamp_ns = 6;
}

message BookLevel {
  double price = 1;
  int64 total_quantity = 2;
}

message BookSnapshot {
  repeated BookLevel bids = 1;
  repeated BookLevel asks = 2;
  int64 timestamp_ns = 3;
}

message Empty {}
```

This is a draft — refine during Phase 0, then treat as **frozen** for the rest of the build. Changing it later means regenerating stubs on both sides.

---

## 5. Phase Plan

Each phase has: goal, tasks, definition of done (DoD), and recommended agent model.

### Phase 0 — Foundation
**Goal:** Repo skeleton + frozen proto contract + local dev environment.
**Tasks:**
- [x] Create folder structure above
- [x] Finalize `exchange.proto`, generate Go + C++ stubs (stubs generation script provided via Docker, require Docker to run)
- [x] `docker-compose.yml` for local dev (engine + backend + frontend)
- [x] Git init, `.gitignore`, initial commit
**DoD:** `docker-compose up` starts all three services locally, even if they don't do anything yet.
**Recommended model:** Gemini 3.8 Flash (Medium) — mechanical setup work.

### Phase 1 — C++ Matching Engine
**Goal:** Correct, tested price-time priority matching engine behind a gRPC server.
**Tasks:**
- [x] Order book data structure: sorted map of price → FIFO queue of orders (bids descending, asks ascending)
- [x] Matching algorithm: incoming order matches against best opposite price, partial fills supported
- [x] gRPC server implementing `SubmitOrder`, `CancelOrder`, `StreamTrades`, `StreamBookUpdates`
- [x] Thread safety (mutex-protected book, since gRPC handles concurrent calls)
- [x] Unit tests: exact price match, partial fill, price-time priority ordering, cancel mid-book
**DoD:** `ctest` passes; engine runs standalone and accepts orders via a gRPC test client.
**Recommended model:** Gemini 3.1 Pro (High) — this is the core logic, needs real reasoning depth.

### Phase 2 — Golang Backend
**Goal:** REST + WebSocket gateway in front of the matching engine.
**Tasks:**
- [ ] gRPC client wrapping calls to engine
- [ ] REST: `POST /orders`, `DELETE /orders/{id}`, `GET /orderbook`, `GET /trades`, `GET /stats`
- [ ] WebSocket hub (goroutines + channels) broadcasting book/trade updates to all connected clients
- [ ] Goroutine pool for concurrent order intake (this feeds directly into Phase 4 benchmarks)
- [ ] Basic structured logging
**DoD:** Can submit an order via curl, see it reflected in `/orderbook`, and see a broadcast on a WS test client.
**Recommended model:** Gemini 3.1 Pro (High) — concurrency correctness matters here.

### Phase 3 — Next.js Dashboard
**Goal:** Recruiter-demo-ready UI, purely reactive to WS data.
**Tasks:**
- [ ] WebSocket client with auto-reconnect
- [ ] Order book ladder (bids/asks) component
- [ ] Live trades feed component
- [ ] Market stats panel (last price, volume, spread)
- [ ] Order submission form → REST API
- [ ] Clean visual design (this is what gets shown live in an interview)
**DoD:** Opens in browser, shows live-updating book/trades without manual refresh, can submit an order from the UI.
**Recommended model:** Gemini 3.8 Flash (Medium) for scaffolding/components; escalate to Pro only if WS state management gets tricky.

### Phase 4 — Concurrency & Benchmarking
**Goal:** Real, quotable performance numbers.
**Tasks:**
- [ ] Load test script firing concurrent orders at the REST API
- [ ] Measure orders/sec throughput, p50/p95/p99 matching latency
- [ ] Document results in `benchmarks/RESULTS.md` with methodology
**DoD:** A results file with real numbers you can defend if asked "how did you measure that?"
**Recommended model:** Gemini 3.8 Flash (Medium) — scripting, not deep logic.

### Phase 5 — Deployment
**Goal:** Live, shareable URLs.
**Tasks:**
- [ ] Multi-stage Dockerfile building both engine and backend, running both via a supervisor
- [ ] Deploy container to Railway
- [ ] Deploy Next.js to Vercel, point at Railway backend URL
- [ ] CORS, env vars, health check endpoint
- [ ] End-to-end smoke test on live URLs
**DoD:** A public Vercel URL shows a live, working exchange talking to a live Railway backend.
**Recommended model:** Gemini 3.8 Flash (Medium) — config-heavy, not logic-heavy.

### Phase 6 — Docs & Interview Readiness
**Goal:** Polish for both the repo and your own prep.
**Tasks:**
- [ ] README: architecture diagram, setup instructions, demo GIF/screenshot
- [ ] `docs/interview-notes.md`: how this maps to Nubra's JD line by line (not committed publicly if you'd rather keep it private)
- [ ] Rewrite resume bullets based on what was *actually* built and benchmarked
**DoD:** Repo looks professional to a stranger; you can explain any design decision in it without hesitation.
**Recommended model:** Gemini 3.8 Flash (Medium).

---

## 6. Architecture & Design Decisions (Log)

- **2026-09-04:** Chose gRPC over cgo for Go↔C++ communication. Reason: cleaner deploy story, better interview narrative, avoids cgo cross-compilation issues.
- **2026-09-04:** Both backend processes ship in one Docker container on Railway; frontend on Vercel. Reason: matches original project's deploy targets, keeps it simple.
- **2026-09-04:** Used `vcpkg` as the strategy for finding gRPC/Protobuf in `CMakeLists.txt` but deferred actual stub generation to a Dockerized script (`generate_protos.ps1`) because local tooling (Docker, Go, CMake) was missing in the environment.
- **2026-09-05:** C++ matching engine data structure chosen: `std::map` keyed by price, containing `std::deque` of orders. Reason: provides fast sorted price level traversal, while `deque` supports fast front-popping (FIFO match) and middle-erasure (cancel).
- **2026-09-05:** Used Ubuntu `pkg-config` in `CMakeLists.txt` rather than pure `find_package` for `gRPC` because the default Ubuntu `libgrpc++-dev` doesn't export the `gRPCConfig.cmake` file properly.
- **2026-09-05:** Go backend concurrency handles streams via a `sync.RWMutex` over the cached order book and trade slice in the gRPC client, and a separate `sync.RWMutex` in the WebSocket `Hub` for managing connected clients. Broadcasts push to buffered channels to prevent slow clients from blocking the gRPC consumer goroutines.

---

## 7. Status Log

- **2026-09-04:** Architecture approved. No code written yet. Next step: Phase 0.
- **2026-09-04:** Completed Phase 0. Created repository scaffold, finalized `exchange.proto`, set up `go.mod`, `CMakeLists.txt` and `docker-compose.yml`. Generated a script `generate_protos.ps1` to build the stubs via Docker (as local tools were not available). Next step: Phase 1 (C++ Matching Engine).
- **2026-09-05:** Completed Phase 1 (Steps 1a and 1b). Implemented the C++ matching engine (OrderBook) with price-time priority matching, partial fills, thread-safety, and order cancellation. Wired it to the `SubmitOrder` and `CancelOrder` gRPC endpoints. Verified by compiling and running unit tests inside a Docker container.
- **2026-09-05:** Completed Phase 2a. Built the Go gRPC client and REST API. Verified by bringing up the containers and executing a test sequence against `localhost:8080`.
- **2026-09-05:** Completed Phase 2b (WebSocket Hub). Upgraded `/ws` endpoint via `gorilla/websocket`, managed connected clients with mutexes and buffered channels, wired it to the gRPC client callbacks. Verified with a background Go script inside the `golang` Docker container capturing live streaming broadcast when POSTing orders:
  ```text
  2026/09/05 07:15:55 Connected to ws://localhost:8080/ws
  {"data":{"bids":[{"price":101.5,"total_quantity":20}],"timestamp_ns":1788592863257347068},"type":"book"}
  {"data":{"timestamp_ns":1788593300177348831},"type":"book"}
  {"data":{"trade_id":"2","buy_order_id":"O3","sell_order_id":"O4","price":101.5,"quantity":20,"timestamp_ns":1788593300177247558},"type":"trade"}
  ```
  Next step: Phase 3 (React Frontend).

---

## 8. How to Resume After Context Loss

1. Paste this entire file into the new chat/agent.
2. Say: "We are on Phase X, task Y. Continue from there."
3. Point the agent at the actual repo state (it should read the existing code, not assume from this doc alone — this doc describes intent, the repo is ground truth for what's actually built).
4. After the session, update Section 6 and 7 before you run out of context again.

