#pragma once

#include "exchange.grpc.pb.h"
#include <map>
#include <deque>
#include <vector>
#include <mutex>
#include <string>

namespace engine {

struct RestingOrder {
    std::string order_id;
    exchange::Side side;
    double price;
    int64_t quantity;
    int64_t timestamp_ns;
};

class OrderBook {
public:
    OrderBook() = default;

    // Process a new order. Fills out_trades with any matches.
    bool submit_order(const exchange::OrderRequest& req, std::vector<exchange::Trade>& out_trades);

    // Cancel an order (Step 1b)
    bool cancel_order(const std::string& order_id);

    // Get snapshot
    exchange::BookSnapshot get_snapshot() const;

private:
    std::map<double, std::deque<RestingOrder>, std::greater<double>> bids_;
    std::map<double, std::deque<RestingOrder>, std::less<double>> asks_;
    
    struct OrderLocation {
        exchange::Side side;
        double price;
    };
    std::map<std::string, OrderLocation> order_map_;

    mutable std::mutex mu_;
    
    int64_t next_trade_id_{1};
};

} // namespace engine
