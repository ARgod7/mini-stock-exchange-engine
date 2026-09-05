# Benchmark Results — Phase 4

## Methodology
The benchmark script (`load_test_main.go`) targets the Go backend's REST API (`POST /orders`). This measures the full end-to-end performance of the system: incoming HTTP request parsing, routing, gRPC serialization/deserialization across the process boundary, and the C++ matching engine's core logic with its global mutex lock, and sending the HTTP response.

- **Payload:** Randomized orders (50/50 mix of BUY/SELL).
- **Pricing:** Normally distributed (mean=100.0, stddev=2.0) to ensure a realistic number of matching/crossing orders rather than just orders stacking up harmlessly on one side of the book.
- **Environment:** Docker Desktop on Windows, `backend` and `engine` containers running concurrently on the `exchange_network`.
- **Sample Size:** 10,000 orders per concurrency level.

## Results Table

| Concurrency | Throughput (req/s) | p50 Latency | p95 Latency | p99 Latency | Error Rate |
|------------:|-------------------:|------------:|------------:|------------:|-----------:|
| 10          | 7,814.53           | 1.22ms      | 1.83ms      | 2.29ms      | 0.00%      |
| 50          | 12,861.43          | 3.66ms      | 5.26ms      | 6.80ms      | 0.00%      |
| 100         | 13,562.90          | 7.22ms      | 9.36ms      | 10.78ms     | 0.00%      |
| 500         | 13,959.06          | 33.84ms     | 46.99ms     | 87.28ms     | 0.00%      |

## Post-Run Sanity Check
A manual verification after running 40,000 total orders confirmed the system state remained correct:
- `GET /stats`: `{"best_ask":100.23,"best_bid":98.78,"last_price":100.23,"spread":1.45,"volume":2454}`
- `GET /orderbook`: Both bids and asks populated correctly with total quantities aggregating cleanly per price level.
- No HTTP 500 errors or rejected connections.

## Interpretation and Bottleneck Analysis

1. **Throughput Plateaus:** The system scales exceptionally well up to ~50 concurrent requests, jumping from ~7.8k to ~12.8k req/s. However, throughput clearly plateaus between 50 and 500 concurrent connections, topping out around 14,000 req/s.
2. **Latency Degradation:** While the throughput plateaus, latency begins to degrade linearly. At 500 concurrent requests, the p99 latency spikes to 87ms, compared to ~10ms at 100 concurrent requests.
3. **Primary Bottleneck:** The primary bottleneck is almost certainly the single global `std::mutex` in the C++ matching engine (`book_mu_` or equivalent lock on the book state). Because every single order—whether it matches or rests—must acquire this lock to traverse the `std::map` and `std::deque`, the system operates strictly sequentially at the core. Throwing more concurrency at the Go backend just results in more goroutines blocking on the gRPC stream, waiting their turn for the C++ lock, which explains the latency spike without a corresponding throughput increase.
4. **Secondary Bottleneck:** The gRPC channel between Go and C++ adds serialization overhead for every single order, which limits the raw operations-per-second compared to a monolithic architecture using `cgo` or an entirely single-language stack.

Overall, 14k req/s is incredibly robust for a straightforward locking implementation. Future optimizations would likely involve breaking the global lock into price-level locks or migrating to a lock-free data structure (e.g., a ring buffer disruptor pattern) and batching gRPC requests.
