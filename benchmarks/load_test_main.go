package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
		"math/rand"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

// Configurable defaults
var (
	baseURL       = flag.String("url", "http://localhost:8080", "Base URL of the Go backend")
	totalOrders   = flag.Int("n", 10000, "Total number of orders to send per run")
	concurrencies = []int{10, 50, 100, 500}
)

type OrderPayload struct {
	OrderID  string  `json:"order_id"`
	Side     string  `json:"side"`
	Price    float64 `json:"price"`
	Quantity int     `json:"quantity"`
}

type Result struct {
	Latency time.Duration
	Error   bool
}

type Stats struct {
	Concurrency int
	Throughput  float64 // req/sec
	P50         time.Duration
	P95         time.Duration
	P99         time.Duration
	ErrorRate   float64
}

func main() {
	flag.Parse()
	rand.Seed(time.Now().UnixNano())

	fmt.Printf("Starting benchmark: %d orders per run\n", *totalOrders)
	fmt.Printf("Target: %s/orders\n", *baseURL)
	fmt.Println("--------------------------------------------------")

	client := &http.Client{
		Timeout: 5 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        1000,
			MaxIdleConnsPerHost: 1000,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	for _, c := range concurrencies {
		stats := runBenchmark(client, c, *totalOrders)
		fmt.Printf("Concurrency: %3d | Throughput: %7.2f req/s | P50: %8s | P95: %8s | P99: %8s | Err: %.2f%%\n",
			stats.Concurrency, stats.Throughput, stats.P50, stats.P95, stats.P99, stats.ErrorRate)
		time.Sleep(2 * time.Second) // cool down
	}

	fmt.Println("--------------------------------------------------")
	checkSystemSanity(client)
}

func runBenchmark(client *http.Client, concurrency, total int) Stats {
	var wg sync.WaitGroup
	results := make(chan Result, total)
	
	// Create an order queue
	orders := make(chan OrderPayload, total)
	for i := 0; i < total; i++ {
		// Generate realistic order: clustered around 100.0 to produce matches
		side := "BUY"
		if rand.Float32() > 0.5 {
			side = "SELL"
		}
		
		// Normal distribution around 100, stddev 2
		price := rand.NormFloat64()*2 + 100.0
		// Round to 2 decimals
		price = float64(int(price*100)) / 100.0
		if price <= 0 {
			price = 0.01
		}
		
		qty := rand.Intn(100) + 1
		
		orders <- OrderPayload{
			OrderID:  fmt.Sprintf("bench-%d-%d", concurrency, i),
			Side:     side,
			Price:    price,
			Quantity: qty,
		}
	}
	close(orders)

	start := time.Now()
	var errorsCount int32

	// Start workers
	for w := 0; w < concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for order := range orders {
				reqStart := time.Now()
				
				payload, _ := json.Marshal(order)
				req, _ := http.NewRequest("POST", *baseURL+"/orders", bytes.NewBuffer(payload))
				req.Header.Set("Content-Type", "application/json")
				
				resp, err := client.Do(req)
				if err != nil {
					atomic.AddInt32(&errorsCount, 1)
					results <- Result{Latency: time.Since(reqStart), Error: true}
					continue
				}
				
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
				
				if resp.StatusCode >= 400 {
					atomic.AddInt32(&errorsCount, 1)
					results <- Result{Latency: time.Since(reqStart), Error: true}
				} else {
					results <- Result{Latency: time.Since(reqStart), Error: false}
				}
			}
		}()
	}

	wg.Wait()
	duration := time.Since(start)
	close(results)

	var latencies []time.Duration
	for r := range results {
		if !r.Error {
			latencies = append(latencies, r.Latency)
		}
	}
	
	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })

	s := Stats{
		Concurrency: concurrency,
		Throughput:  float64(total) / duration.Seconds(),
		ErrorRate:   float64(errorsCount) / float64(total) * 100,
	}

	if len(latencies) > 0 {
		s.P50 = latencies[int(float64(len(latencies))*0.50)]
		s.P95 = latencies[int(float64(len(latencies))*0.95)]
		s.P99 = latencies[int(float64(len(latencies))*0.99)]
	}

	return s
}

func checkSystemSanity(client *http.Client) {
	fmt.Println("Post-benchmark Sanity Check:")
	
	// Stats
	resp, err := client.Get(*baseURL + "/stats")
	if err == nil {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("GET /stats: %s\n", string(body))
	} else {
		fmt.Printf("GET /stats error: %v\n", err)
	}

	// Orderbook
	resp, err = client.Get(*baseURL + "/orderbook")
	if err == nil {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		// Truncate if too long
		s := string(body)
		if len(s) > 200 {
			s = s[:200] + "... (truncated)"
		}
		fmt.Printf("GET /orderbook: %s\n", s)
	} else {
		fmt.Printf("GET /orderbook error: %v\n", err)
	}
}

