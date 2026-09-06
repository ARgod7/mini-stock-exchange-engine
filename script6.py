import re

with open('frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''// If NEXT_PUBLIC_API_URL is set, use it. Otherwise fallback to the Next.js proxy
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function submitOrder(order: OrderRequest): Promise<void> {
  const res = await fetch(\\/orders\, {
'''

content = content.replace('export async function submitOrder(order: OrderRequest): Promise<void> {\n  const res = await fetch(\'/api/orders\', {', replacement)
content = content.replace('fetch(\'/api/orders/', 'fetch(${BASE_URL}/orders/')
content = content.replace('fetch(\'/api/orderbook\')', 'fetch(${BASE_URL}/orderbook)')
content = content.replace('fetch(\'/api/trades\')', 'fetch(${BASE_URL}/trades)')
content = content.replace('fetch(\'/api/stats\')', 'fetch(${BASE_URL}/stats)')

with open('frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('frontend/src/lib/useExchangeSocket.ts', 'r', encoding='utf-8') as f:
    ws_content = f.read()

ws_replacement = '''    // If NEXT_PUBLIC_WS_URL is set, use it. Otherwise dynamically use window.location
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = \\//\/api/ws\;
    }
    const ws = new WebSocket(wsUrl);'''

ws_content = re.sub(r"    const protocol = window\.location\.protocol === 'https:' \? 'wss:' : 'ws:';\n    const wsUrl = \$\{protocol\}//\$\{window\.location\.host\}/api/ws;\n    const ws = new WebSocket\(wsUrl\);", ws_replacement, ws_content, flags=re.DOTALL)

with open('frontend/src/lib/useExchangeSocket.ts', 'w', encoding='utf-8') as f:
    f.write(ws_content)
