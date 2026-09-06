import re

with open('backend/cmd/server/main.go', 'r', encoding='utf-8') as f:
    content = f.read()

cors_middleware = '''func corsMiddleware(next http.Handler) http.Handler {
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

func main() {'''

content = content.replace('func main() {', cors_middleware)

start_server = '''	log.Println("Starting backend server on :8080")
	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}'''

content = re.sub(r'	log\.Println\("Starting backend server on :8080"\).*?\}', start_server, content, flags=re.DOTALL)

with open('backend/cmd/server/main.go', 'w', encoding='utf-8') as f:
    f.write(content)
