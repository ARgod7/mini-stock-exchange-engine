package exchange

import (
	"context"
	"log"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type Client struct {
	conn       *grpc.ClientConn
	Engine     MatchingEngineClient
	
	// In-memory state updated by streams
	mu         sync.RWMutex
	lastBook   *BookSnapshot
	trades     []*Trade
	
	OnTrade      func(*Trade)
	OnBookUpdate func(*BookSnapshot)
}

func NewClient(addr string) (*Client, error) {
	conn, err := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	engine := NewMatchingEngineClient(conn)
	
	c := &Client{
		conn:   conn,
		Engine: engine,
		trades: make([]*Trade, 0, 100),
	}
	
	return c, nil
}

func (c *Client) StartStreams(ctx context.Context) {
	go c.streamBookUpdates(ctx)
	go c.streamTrades(ctx)
}

func (c *Client) streamBookUpdates(ctx context.Context) {
	for {
		stream, err := c.Engine.StreamBookUpdates(ctx, &Empty{})
		if err != nil {
			log.Printf("Error starting book stream: %v", err)
			time.Sleep(time.Second)
			continue
		}
		for {
			snap, err := stream.Recv()
			if err != nil {
				log.Printf("Book stream closed: %v", err)
				break
			}
			c.mu.Lock()
			c.lastBook = snap
			c.mu.Unlock()
			if c.OnBookUpdate != nil {
				c.OnBookUpdate(snap)
			}
		}
		time.Sleep(time.Second)
	}
}

func (c *Client) streamTrades(ctx context.Context) {
	for {
		stream, err := c.Engine.StreamTrades(ctx, &Empty{})
		if err != nil {
			log.Printf("Error starting trades stream: %v", err)
			time.Sleep(time.Second)
			continue
		}
		for {
			trade, err := stream.Recv()
			if err != nil {
				log.Printf("Trades stream closed: %v", err)
				break
			}
			c.mu.Lock()
			c.trades = append(c.trades, trade)
			if len(c.trades) > 100 {
				c.trades = c.trades[1:] // Keep last 100
			}
			c.mu.Unlock()
			if c.OnTrade != nil {
				c.OnTrade(trade)
			}
		}
		time.Sleep(time.Second)
	}
}

func (c *Client) GetOrderBook() *BookSnapshot {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.lastBook
}

func (c *Client) GetTrades() []*Trade {
	c.mu.RLock()
	defer c.mu.RUnlock()
	res := make([]*Trade, len(c.trades))
	copy(res, c.trades)
	return res
}

func (c *Client) Close() {
	c.conn.Close()
}
