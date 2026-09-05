#include "../include/matching_engine.h"
#include <iostream>
#include <cassert>

using namespace engine;

void test_exact_match() {
    OrderBook book;
    std::vector<exchange::Trade> trades;
    
    exchange::OrderRequest bid;
    bid.set_order_id("O1");
    bid.set_side(exchange::BUY);
    bid.set_price(100.0);
    bid.set_quantity(10);
    book.submit_order(bid, trades);
    
    assert(trades.empty());
    
    exchange::OrderRequest ask;
    ask.set_order_id("O2");
    ask.set_side(exchange::SELL);
    ask.set_price(100.0);
    ask.set_quantity(10);
    book.submit_order(ask, trades);
    
    assert(trades.size() == 1);
    assert(trades[0].price() == 100.0);
    assert(trades[0].quantity() == 10);
    
    auto snap = book.get_snapshot();
    assert(snap.bids_size() == 0);
    assert(snap.asks_size() == 0);
    
    std::cout << "test_exact_match passed\n";
}

void test_partial_fill() {
    OrderBook book;
    std::vector<exchange::Trade> trades;
    
    exchange::OrderRequest bid;
    bid.set_order_id("O1");
    bid.set_side(exchange::BUY);
    bid.set_price(100.0);
    bid.set_quantity(10);
    book.submit_order(bid, trades);
    
    exchange::OrderRequest ask;
    ask.set_order_id("O2");
    ask.set_side(exchange::SELL);
    ask.set_price(100.0);
    ask.set_quantity(15);
    book.submit_order(ask, trades);
    
    assert(trades.size() == 1);
    assert(trades[0].quantity() == 10);
    
    auto snap = book.get_snapshot();
    assert(snap.bids_size() == 0);
    assert(snap.asks_size() == 1);
    assert(snap.asks(0).total_quantity() == 5);
    
    std::cout << "test_partial_fill passed\n";
}

void test_price_time_priority() {
    OrderBook book;
    std::vector<exchange::Trade> trades;
    
    exchange::OrderRequest bid1;
    bid1.set_order_id("O1");
    bid1.set_side(exchange::BUY);
    bid1.set_price(100.0);
    bid1.set_quantity(10);
    book.submit_order(bid1, trades);
    
    exchange::OrderRequest bid2;
    bid2.set_order_id("O2");
    bid2.set_side(exchange::BUY);
    bid2.set_price(100.0);
    bid2.set_quantity(5);
    book.submit_order(bid2, trades);
    
    exchange::OrderRequest ask;
    ask.set_order_id("O3");
    ask.set_side(exchange::SELL);
    ask.set_price(100.0);
    ask.set_quantity(12);
    book.submit_order(ask, trades);
    
    assert(trades.size() == 2);
    assert(trades[0].sell_order_id() == "O3");
    assert(trades[0].buy_order_id() == "O1");
    assert(trades[0].quantity() == 10);
    
    assert(trades[1].buy_order_id() == "O2");
    assert(trades[1].quantity() == 2);
    
    auto snap = book.get_snapshot();
    assert(snap.bids_size() == 1);
    assert(snap.bids(0).total_quantity() == 3);
    
    std::cout << "test_price_time_priority passed\n";
}

void test_no_match() {
    OrderBook book;
    std::vector<exchange::Trade> trades;
    
    exchange::OrderRequest bid;
    bid.set_order_id("O1");
    bid.set_side(exchange::BUY);
    bid.set_price(99.0);
    bid.set_quantity(10);
    book.submit_order(bid, trades);
    
    exchange::OrderRequest ask;
    ask.set_order_id("O2");
    ask.set_side(exchange::SELL);
    ask.set_price(100.0);
    ask.set_quantity(10);
    book.submit_order(ask, trades);
    
    assert(trades.empty());
    
    auto snap = book.get_snapshot();
    assert(snap.bids_size() == 1);
    assert(snap.asks_size() == 1);
    
    std::cout << "test_no_match passed\n";
}

void test_sweep_multiple_levels() {
    OrderBook book;
    std::vector<exchange::Trade> trades;
    
    exchange::OrderRequest ask1;
    ask1.set_order_id("O1");
    ask1.set_side(exchange::SELL);
    ask1.set_price(101.0);
    ask1.set_quantity(10);
    book.submit_order(ask1, trades);
    
    exchange::OrderRequest ask2;
    ask2.set_order_id("O2");
    ask2.set_side(exchange::SELL);
    ask2.set_price(102.0);
    ask2.set_quantity(10);
    book.submit_order(ask2, trades);
    
    exchange::OrderRequest bid;
    bid.set_order_id("O3");
    bid.set_side(exchange::BUY);
    bid.set_price(103.0);
    bid.set_quantity(15);
    book.submit_order(bid, trades);
    
    assert(trades.size() == 2);
    assert(trades[0].price() == 101.0);
    assert(trades[0].quantity() == 10);
    assert(trades[1].price() == 102.0);
    assert(trades[1].quantity() == 5);
    
    auto snap = book.get_snapshot();
    assert(snap.bids_size() == 0);
    assert(snap.asks_size() == 1);
    assert(snap.asks(0).total_quantity() == 5);
    
    std::cout << "test_sweep_multiple_levels passed\n";
}

void test_cancellation() {
    OrderBook book;
    std::vector<exchange::Trade> trades;
    
    exchange::OrderRequest bid;
    bid.set_order_id("O1");
    bid.set_side(exchange::BUY);
    bid.set_price(100.0);
    bid.set_quantity(10);
    book.submit_order(bid, trades);
    
    auto snap1 = book.get_snapshot();
    assert(snap1.bids_size() == 1);
    
    bool canceled = book.cancel_order("O1");
    assert(canceled);
    
    auto snap2 = book.get_snapshot();
    assert(snap2.bids_size() == 0);
    
    // Attempt cancel again
    bool canceled_again = book.cancel_order("O1");
    assert(!canceled_again);
    
    std::cout << "test_cancellation passed\n";
}

int main() {
    std::cout << "Running tests...\n";
    test_exact_match();
    test_partial_fill();
    test_price_time_priority();
    test_no_match();
    test_sweep_multiple_levels();
    test_cancellation();
    std::cout << "ALL TESTS PASSED\n";
    return 0;
}
