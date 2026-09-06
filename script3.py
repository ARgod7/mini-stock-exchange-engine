import re

with open('backend/internal/rest/handlers.go', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''func (s *Server) RegisterHandlers(mux *http.ServeMux) {
	mux.HandleFunc("/orders", s.handleOrders)
	mux.HandleFunc("/orders/", s.handleOrdersPrefix)
	mux.HandleFunc("/orderbook", s.handleOrderBook)
	mux.HandleFunc("/trades", s.handleTrades)
	mux.HandleFunc("/stats", s.handleStats)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
}'''

content = re.sub(r'func \(s \*Server\) RegisterHandlers\(mux \*http\.ServeMux\) \{.*?\}', replacement, content, flags=re.DOTALL)

with open('backend/internal/rest/handlers.go', 'w', encoding='utf-8') as f:
    f.write(content)
