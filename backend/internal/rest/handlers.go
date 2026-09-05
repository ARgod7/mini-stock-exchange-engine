package rest

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	pb "mini-stock-exchange-engine/backend/internal/grpcclient"
)

type Server struct {
	client *pb.Client
}

func NewServer(client *pb.Client) *Server {
	return &Server{client: client}
}

func (s *Server) RegisterHandlers(mux *http.ServeMux) {
	mux.HandleFunc("/orders", s.handleOrders)
	mux.HandleFunc("/orders/", s.handleOrdersPrefix)
	mux.HandleFunc("/orderbook", s.handleOrderBook)
	mux.HandleFunc("/trades", s.handleTrades)
	mux.HandleFunc("/stats", s.handleStats)
}

func (s *Server) handleOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req struct {
			OrderID  string  `json:"order_id"`
			Side     string  `json:"side"` // "BUY" or "SELL"
			Price    float64 `json:"price"`
			Quantity int64   `json:"quantity"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		
		side := pb.Side_BUY
		if req.Side == "SELL" {
			side = pb.Side_SELL
		}
		
		grpcReq := &pb.OrderRequest{
			OrderId:     req.OrderID,
			Side:        side,
			Price:       req.Price,
			Quantity:    req.Quantity,
			TimestampNs: time.Now().UnixNano(),
		}
		
		resp, err := s.client.Engine.SubmitOrder(context.Background(), grpcReq)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleOrdersPrefix(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodDelete {
		id := strings.TrimPrefix(r.URL.Path, "/orders/")
		if id == "" {
			http.Error(w, "Missing ID", http.StatusBadRequest)
			return
		}
		
		resp, err := s.client.Engine.CancelOrder(context.Background(), &pb.CancelRequest{OrderId: id})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleOrderBook(w http.ResponseWriter, r *http.Request) {
	snap := s.client.GetOrderBook()
	w.Header().Set("Content-Type", "application/json")
	if snap == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"bids": []interface{}{}, "asks": []interface{}{}})
		return
	}
	json.NewEncoder(w).Encode(snap)
}

func (s *Server) handleTrades(w http.ResponseWriter, r *http.Request) {
	trades := s.client.GetTrades()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trades)
}

func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	trades := s.client.GetTrades()
	snap := s.client.GetOrderBook()
	
	var lastPrice float64
	var volume int64
	
	for _, t := range trades {
		lastPrice = t.Price
		volume += t.Quantity
	}
	
	var bestBid, bestAsk float64
	var spread float64
	
	if snap != nil {
		if len(snap.Bids) > 0 {
			bestBid = snap.Bids[0].Price
		}
		if len(snap.Asks) > 0 {
			bestAsk = snap.Asks[0].Price
		}
		if bestBid > 0 && bestAsk > 0 {
			spread = bestAsk - bestBid
		}
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"last_price": lastPrice,
		"volume":     volume,
		"best_bid":   bestBid,
		"best_ask":   bestAsk,
		"spread":     spread,
	})
}
