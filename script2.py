import re

with open('backend/cmd/server/main.go', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''
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

func main() {'''

content = content.replace('func main() {', replacement)

replacement2 = '''	client.OnTrade = func(t *pb.Trade) {
		hub.Broadcast(map[string]interface{}{
			"type": "trade",
			"data": mapTrade(t),
		})
	}'''

content = re.sub(r'client\.OnTrade = func\(t \*pb\.Trade\) \{.*?\}\n', replacement2 + '\n', content, flags=re.DOTALL)

with open('backend/cmd/server/main.go', 'w', encoding='utf-8') as f:
    f.write(content)
