package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for the assignment
	},
}

type Hub struct {
	clients map[*Client]bool
	mu      sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[*Client]bool),
	}
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	h.clients[c] = true
	h.mu.Unlock()
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
	h.mu.Unlock()
}

// Broadcasts a JSON message to all connected clients safely.
func (h *Hub) Broadcast(msg interface{}) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("WS Broadcast error: %v", err)
		return
	}
	
	h.mu.RLock()
	for client := range h.clients {
		select {
		case client.send <- data:
		default:
			// Client's send buffer is full; assume dead and unregister later
			// Unregistering inside RLock is bad, so we just skip. The writer goroutine will eventually fail.
		}
	}
	h.mu.RUnlock()
}

func (c *Client) writePump() {
	defer func() {
		c.conn.Close()
	}()
	for {
		message, ok := <-c.send
		if !ok {
			c.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}
		
		w, err := c.conn.NextWriter(websocket.TextMessage)
		if err != nil {
			return
		}
		w.Write(message)
		
		if err := w.Close(); err != nil {
			return
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()
	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
	}
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WS Upgrade error: %v", err)
		return
	}
	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
	}
	client.hub.Register(client)
	
	go client.writePump()
	go client.readPump()
}
