# Mini Stock Exchange Engine — The Story

> This is your reference document for talking about this project — in an interview, on a call, or in a README walkthrough. Read it before any conversation about this project so the story stays consistent. It's written the way you'd actually explain it out loud, not like a spec sheet.

---

## 1. Why I Built This

This one started out of genuine curiosity, not a job posting. I'd spent most of my time writing Python — it's what I was fastest in, what I did most of my ML and scripting work in — but I kept running into its ceiling the moment anything needed to be fast or truly concurrent. I wanted to understand, hands-on, what people meant when they said "systems languages give you control Python just doesn't." A stock exchange's matching engine felt like the perfect forcing function for that: it's a problem where correctness AND speed both matter simultaneously, under real concurrent load, with almost zero room for ambiguity in the logic. Either the matching is right, or it isn't. Either it holds up under concurrent orders, or it falls over. There's no fuzzy middle ground to hide in, which is exactly why it felt like the right project to actually learn something from instead of just producing another CRUD app.

So I picked it as a personal deep-dive: rebuild a mini exchange from scratch, in languages I either wanted to get properly good at (C++) or already suspected were the right tool for the networking/concurrency layer (Go), and prove to myself I could reason about price-time priority, partial fills, and concurrent correctness well enough to build it, test it under real load, and find and fix the bugs that only show up once it's actually stressed.

It happens to line up well with the kind of infrastructure a trading platform like Nubra runs day to day — which is honestly part of why the project stuck with me once I started; I wasn't building it in a vacuum, I could see the shape of a real use case in it. But the idea came first, out of wanting to actually understand this class of problem, not from reverse-engineering a job description.

---

## 2. What I Actually Built (plain English)

Think of it like a mini, simplified version of a stock exchange.

People submit "I want to buy" or "I want to sell" orders, each with a price and a quantity. The system's job is to match buyers and sellers up — if someone wants to buy at a price someone else is willing to sell at, a trade happens automatically. If no match exists yet, the order just waits in line until one does.

I built three connected pieces:

1. **The matching brain** — the part that actually decides whether two orders match, and if so, at what price. It follows the same basic rule real exchanges use: the best price gets matched first, and if two people offer the same price, whoever got there first gets served first.

2. **The middle layer** — the part that takes orders in from the outside world, hands them to the matching brain, and then broadcasts the results back out live, so nobody has to refresh a page to see what happened.

3. **The dashboard** — what you actually look at. A live order book, a live feed of trades as they happen, and a form to place new orders.

I also stress-tested it — fired thousands of orders at it at once to see how it holds up under load — and found and fixed real bugs that only showed up once the system was under pressure, rather than just testing the "happy path" once and calling it done.

---

## 3. What I Used, and Why (this is where it gets technical)

Every technology choice here was deliberate, not default. Here's the reasoning for each one — this is the part that shows engineering judgment, not just tool familiarity.

### Why I moved off Python for this, specifically to C++
Python was my default going in, and for most of what I'd built before, it was fine — scripting, ML, quick backends where the bottleneck is never really the language. But a matching engine breaks that assumption immediately. It needs to handle many orders per second, each one doing real work (searching/updating an ordered structure), under real concurrent access — and Python's GIL means true parallel execution of CPU-bound work isn't really on the table without working around the language, not with it. I didn't want to work around a language's limitations to fake performance; I wanted a language where performance was the default posture, and where I had to think explicitly about memory layout and data structures instead of it being abstracted away. That's the actual reason I picked C++ specifically over sticking with Python or reaching for something like Rust — I wanted the most direct, unforgiving version of "you own your memory and your data structures," since that's precisely the skill I was trying to build. Concretely, I used `std::map` (an ordered structure) of `std::deque`s (for O(1) push/pop) to build the order book by hand — a deliberate data-structure choice, not something a library did for me.

### Why Go for the backend — and specifically why not Python here either
For the layer that talks to the outside world — handling many simultaneous HTTP requests and WebSocket connections — I considered Python again first, since it's what I know best, but ran into the same wall: Python's concurrency story (threads fighting the GIL, or async code that gets tangled fast once you're juggling REST + WebSocket + an outbound gRPC client at once) didn't feel like the right foundation for something explicitly about handling concurrent load well. Go's goroutines and channels are built around exactly this kind of problem — many lightweight concurrent connections, communicating safely — without needing an async framework bolted on top. It's also just a genuinely different concurrency model than C++'s manual mutex-based approach, which meant building this backend taught me a second, distinct way of thinking about concurrency in the same project, rather than doing the same thing twice. Splitting the system this way — C++ for the compute-heavy matching core, Go for the I/O-heavy networking layer — mirrors how real infrastructure is usually split by strength, not by "one language for everything."

### Why gRPC between Go and C++ (not a shared library, not cgo)
Go and C++ needed to talk to each other, and there were two real options: `cgo` (embedding C++ directly inside the Go binary) or running them as two separate processes that communicate over a defined contract. I chose separate processes with gRPC because:
- It's a genuine client-server architecture, not a monolith wearing two languages
- It's easier to reason about, test, and deploy independently
- It matches real-world microservice patterns, which is a stronger thing to defend in an interview than "I glued two languages together"

The trade-off I accepted: gRPC calls have more overhead than an in-process function call. I measured that cost directly in my benchmarking phase rather than assuming it away — more on that below.

### Why Next.js for the frontend
The frontend has exactly one job: reflect live state without the user doing anything. Next.js with a WebSocket client does this cleanly, and it's the frontend framework I was already most comfortable in, so it let me put the real effort into the harder backend/engine problems instead of relearning a UI framework mid-project. I deliberately kept all business logic out of the frontend — it never decides anything, it only displays what the backend tells it. That separation is intentional: it means the "brain" of the system can be tested and trusted independently of how it's displayed.

### Why REST *and* WebSocket, not just one
REST handles the action a user initiates (submitting or cancelling an order) — a clear request/response. WebSocket handles everything the user needs to observe passively (trades happening, the book updating) — a continuous stream, not a single answer. Using WebSocket for actions too would be unnecessarily complex; using only REST for observation would mean polling constantly, which is wasteful and not how real trading UIs work. Using the right tool for each direction of data flow was a deliberate choice, not an accident of "I used whatever was easiest."

---

## 4. Architecture

```
┌─────────────────┐     WebSocket / REST      ┌──────────────────────────┐     gRPC      ┌──────────────────────┐
│   Next.js UI     │ ───────────────────────► │      Go Backend           │ ────────────► │  C++ Matching Engine  │
│  (Vercel)        │ ◄─────────────────────── │  (Render)                 │ ◄──────────── │  (same container)     │
│                  │  live book/trades/stats   │  REST API + WS Hub +      │  orders/fills │  price-time priority   │
└─────────────────┘                            │  gRPC client              │               │  order book, matching  │
                                                └──────────────────────────┘               └──────────────────────┘
```

Three independently understandable pieces, connected by two different kinds of contracts: a strict typed contract (gRPC/Protobuf) between the two backend services, and a looser web-facing contract (REST + WebSocket JSON) between the backend and the browser.

---

## 5. End-to-End Flow (how an order actually moves through the system)

1. You type an order into the dashboard: side, price, quantity.
2. The frontend sends that as a REST request to the Go backend.
3. Go forwards it to the C++ engine over gRPC.
4. The C++ engine checks the order book:
   - If it crosses an existing order at an acceptable price, a match happens — possibly a partial fill if quantities don't line up exactly, possibly sweeping through several price levels if the order is large enough.
   - If it doesn't cross anything, it rests in the book, waiting.
5. The engine reports back what happened — either a trade or an accepted-but-unmatched order.
6. Go picks this up and broadcasts it over WebSocket to every connected dashboard.
7. Your screen updates instantly — no refresh, no polling, just a live push the moment something happens.

The same loop runs whether it's one order or a thousand orders per second, which is what my Phase 4 benchmarking specifically measured and proved.

---

## 6. How a User Interacts With It

- Open the dashboard → see the current state of the market immediately (existing order book, recent trades, live stats)
- Place an order via the form → get confirmation within milliseconds
- Watch the order book and trade feed update live, in real time, without touching anything
- If your order matches immediately, you'll see the resulting trade appear at the top of the feed
- If it doesn't match, you'll see it appear as new depth in the order book, waiting for a counterpart

That's the entire interaction model — deliberately as close to a real trading terminal's UX as a demo project reasonably can be.

---

## 7. How to Demo This (a script you can actually run)

Don't just open the dashboard and describe it — show causality, live, so the interviewer sees the system actually reason about something in real time.

**Step 1 — Set the scene (10 seconds)**
"This is a mini stock exchange I built out of curiosity — I wanted to properly learn C++ and understand concurrent systems, and a matching engine felt like the right problem to force that. C++ matching engine, Go backend, Next.js frontend, connected over gRPC and WebSocket." Open the live URL.

**Step 2 — Show the resting order (20 seconds)**
Place a buy order that won't immediately match (e.g. below the current best ask). Point out: "This just rested in the book — you can see it appear here on the bid side, waiting for a seller."

**Step 3 — Show the match happen live (30 seconds — this is the moment that matters)**
In a second tab or terminal, submit a sell order that crosses your resting buy. Don't touch the first tab. Let them watch it update on its own. "This didn't refresh — the moment the engine matched these two orders, it pushed the result out over a WebSocket, and the UI just reacted."

**Step 4 — Talk about the harder decisions, if asked (this is where you differentiate)**
Have ready, briefly:
- Why gRPC over cgo
- The concurrency bottleneck you found in benchmarking (the global mutex) and why you chose to document it rather than rush a lock-free rewrite
- The aggressor-side bug you found and fixed at the root (engine-level ground truth) instead of patching it in the frontend with a heuristic

**Step 5 — Close with the honest framing**
"This isn't production trading infrastructure — but it's a real system I designed, built, tested under load, found actual bugs in, and fixed at the right layer. I built it to actually learn C++ and concurrency properly, not to pad a resume, so I wanted something I could defend in detail, not just describe."

---

## 8. Anticipated Cross-Questions (and how to answer them honestly)

**"Why not just use a message queue like Kafka instead of gRPC streaming?"**
Fair alternative — Kafka would decouple things further and add durability/replay, but it's a heavier piece of infrastructure than this project's scope justified. gRPC streaming gave me a live, typed, low-latency connection with far less operational overhead, which was the right trade-off for a project this size.

**"What happens if the C++ engine crashes mid-match?"**
Honestly — right now, state is in-memory only, so a crash loses the current book. That's a real limitation I'd address with persistence (write-ahead logging of orders, or periodic snapshotting) in a production version. I didn't build that here because the project's goal was demonstrating the matching/concurrency/architecture story, not building a fully durable system — but I can speak to how I'd approach it.

**"How would you scale this to multiple order books / multiple symbols?"**
Each symbol would need its own independent order book and likely its own lock domain, so they don't contend with each other — this is actually a natural next evolution of the sharded-lock idea I identified as the fix for the concurrency bottleneck I found in benchmarking.

**"Why does throughput plateau at high concurrency?"**
There's a single global mutex protecting the order book in the C++ engine. I identified this directly through load testing rather than guessing — at low concurrency it's invisible, but past a few hundred concurrent requests, orders start queuing on the lock instead of on real work. The fix would be sharded locks per price level or a lock-free ring buffer; I chose to document this rather than risk introducing subtle concurrency bugs rewriting the core matching logic under time pressure.

---

## 9. One Sentence Summary (if you only get one)

"I built a working exchange simulator — C++ matching engine, Go backend, Next.js frontend, connected over gRPC and WebSocket — mainly to properly learn C++ and concurrent systems by forcing myself through a problem with zero room for ambiguity, then benchmarked it under real load and fixed the real bugs that surfaced instead of just demoing the happy path."
