package main

import (
	"context"
	"log"
	"net/http"
	"os"

	pb "mini-stock-exchange-engine/backend/internal/grpcclient"
	"mini-stock-exchange-engine/backend/internal/rest"
	"mini-stock-exchange-engine/backend/internal/ws"
)


func mapTrade(t *pb.Trade) map[string]interface{} {
	return map[string]interface{}{
		"trade_id":       t.TradeId,
		"buy_order_id":   t.BuyOrderId,
		"sell_order_id":  t.SellOrderId,
		"price":          t.Price,
		"quantity":       t.Quantity,
		"timestamp_ns":   t.TimestampNs,
		"aggressor_side": pb.Side_name[int32(t.AggressorSide)],
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	engineAddr := os.Getenv("ENGINE_ADDR")
	if engineAddr == "" {
		engineAddr = "localhost:50051"
	}
	
	log.Printf("Connecting to matching engine at %s", engineAddr)
	client, err := pb.NewClient(engineAddr)
	if err != nil {
		log.Fatalf("Failed to connect to engine: %v", err)
	}
	defer client.Close()
	
	// WebSockets
	hub := ws.NewHub()
	
		client.OnTrade = func(t *pb.Trade) {
		hub.Broadcast(map[string]interface{}{
			"type": "trade",
			"data": mapTrade(t),
		})
	}
	client.OnBookUpdate = func(b *pb.BookSnapshot) {
		hub.Broadcast(map[string]interface{}{
			"type": "book",
			"data": b,
		})
	}

	// Start consuming gRPC streams
	client.StartStreams(context.Background())
	
	mux := http.NewServeMux()
	
	// REST
	restServer := rest.NewServer(client)
	restServer.RegisterHandlers(mux)
	
	mux.HandleFunc("/ws", hub.HandleWebSocket)
	
	log.Println("Starting backend server on :8080")
	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
