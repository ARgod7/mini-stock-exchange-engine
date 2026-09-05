import re

with open('backend/internal/rest/handlers.go', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''func mapTrade(t *pb.Trade) map[string]interface{} {
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

func (s *Server) handleTrades(w http.ResponseWriter, r *http.Request) {
	trades := s.client.GetTrades()
	w.Header().Set("Content-Type", "application/json")
	mapped := make([]map[string]interface{}, len(trades))
	for i, t := range trades {
		mapped[i] = mapTrade(t)
	}
	json.NewEncoder(w).Encode(mapped)
}'''

content = re.sub(r'func \(s \*Server\) handleTrades\(w http\.ResponseWriter, r \*http\.Request\) \{.*?json\.NewEncoder\(w\)\.Encode\(trades\)\s*\}', replacement, content, flags=re.DOTALL)

with open('backend/internal/rest/handlers.go', 'w', encoding='utf-8') as f:
    f.write(content)
