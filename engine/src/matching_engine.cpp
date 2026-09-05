#include "matching_engine.h"
#include <chrono>

namespace engine {

static int64_t current_time_ns() {
    auto now = std::chrono::system_clock::now();
    return std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch()).count();
}

bool OrderBook::submit_order(const exchange::OrderRequest& req, std::vector<exchange::Trade>& out_trades) {
    std::lock_guard<std::mutex> lock(mu_);
    
    if (order_map_.find(req.order_id()) != order_map_.end()) {
        return false; // Reject duplicate
    }
    
    int64_t remaining_qty = req.quantity();
    
    if (req.side() == exchange::BUY) {
        while (remaining_qty > 0 && !asks_.empty()) {
            auto best_ask_it = asks_.begin();
            double best_ask_price = best_ask_it->first;
            if (req.price() < best_ask_price) {
                break;
            }
            
            auto& queue = best_ask_it->second;
            while (remaining_qty > 0 && !queue.empty()) {
                auto& resting = queue.front();
                int64_t trade_qty = std::min(remaining_qty, resting.quantity);
                
                exchange::Trade trade;
                trade.set_trade_id(std::to_string(next_trade_id_++));
                trade.set_buy_order_id(req.order_id());
                trade.set_sell_order_id(resting.order_id);
                trade.set_price(best_ask_price);
                trade.set_quantity(trade_qty);
                trade.set_timestamp_ns(current_time_ns());
                trade.set_aggressor_side(req.side());
                out_trades.push_back(trade);
                
                remaining_qty -= trade_qty;
                resting.quantity -= trade_qty;
                
                if (resting.quantity == 0) {
                    order_map_.erase(resting.order_id);
                    queue.pop_front();
                }
            }
            if (queue.empty()) {
                asks_.erase(best_ask_it);
            }
        }
    } else {
        while (remaining_qty > 0 && !bids_.empty()) {
            auto best_bid_it = bids_.begin();
            double best_bid_price = best_bid_it->first;
            if (req.price() > best_bid_price) {
                break;
            }
            
            auto& queue = best_bid_it->second;
            while (remaining_qty > 0 && !queue.empty()) {
                auto& resting = queue.front();
                int64_t trade_qty = std::min(remaining_qty, resting.quantity);
                
                exchange::Trade trade;
                trade.set_trade_id(std::to_string(next_trade_id_++));
                trade.set_buy_order_id(resting.order_id);
                trade.set_sell_order_id(req.order_id());
                trade.set_price(best_bid_price);
                trade.set_quantity(trade_qty);
                trade.set_timestamp_ns(current_time_ns());
                trade.set_aggressor_side(req.side());
                out_trades.push_back(trade);
                
                remaining_qty -= trade_qty;
                resting.quantity -= trade_qty;
                
                if (resting.quantity == 0) {
                    order_map_.erase(resting.order_id);
                    queue.pop_front();
                }
            }
            if (queue.empty()) {
                bids_.erase(best_bid_it);
            }
        }
    }
    
    if (remaining_qty > 0) {
        RestingOrder ro{
            req.order_id(),
            req.side(),
            req.price(),
            remaining_qty,
            req.timestamp_ns()
        };
        if (req.side() == exchange::BUY) {
            bids_[req.price()].push_back(ro);
        } else {
            asks_[req.price()].push_back(ro);
        }
        order_map_[req.order_id()] = {req.side(), req.price()};
    }
    
    return true;
}

bool OrderBook::cancel_order(const std::string& order_id) {
    std::lock_guard<std::mutex> lock(mu_);
    auto it = order_map_.find(order_id);
    if (it == order_map_.end()) {
        return false;
    }
    
    exchange::Side side = it->second.side;
    double price = it->second.price;
    
    bool removed = false;
    if (side == exchange::BUY) {
        auto book_it = bids_.find(price);
        if (book_it != bids_.end()) {
            auto& q = book_it->second;
            for (auto q_it = q.begin(); q_it != q.end(); ++q_it) {
                if (q_it->order_id == order_id) {
                    q.erase(q_it);
                    removed = true;
                    break;
                }
            }
            if (q.empty()) bids_.erase(book_it);
        }
    } else {
        auto book_it = asks_.find(price);
        if (book_it != asks_.end()) {
            auto& q = book_it->second;
            for (auto q_it = q.begin(); q_it != q.end(); ++q_it) {
                if (q_it->order_id == order_id) {
                    q.erase(q_it);
                    removed = true;
                    break;
                }
            }
            if (q.empty()) asks_.erase(book_it);
        }
    }
    
    order_map_.erase(it);
    return removed;
}

exchange::BookSnapshot OrderBook::get_snapshot() const {
    std::lock_guard<std::mutex> lock(mu_);
    exchange::BookSnapshot snap;
    snap.set_timestamp_ns(current_time_ns());
    
    for (const auto& [price, q] : bids_) {
        int64_t total_qty = 0;
        for (const auto& ro : q) total_qty += ro.quantity;
        if (total_qty > 0) {
            auto* level = snap.add_bids();
            level->set_price(price);
            level->set_total_quantity(total_qty);
        }
    }
    
    for (const auto& [price, q] : asks_) {
        int64_t total_qty = 0;
        for (const auto& ro : q) total_qty += ro.quantity;
        if (total_qty > 0) {
            auto* level = snap.add_asks();
            level->set_price(price);
            level->set_total_quantity(total_qty);
        }
    }
    return snap;
}

} // namespace engine

