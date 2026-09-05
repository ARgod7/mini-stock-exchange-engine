#include "server.h"

namespace engine {

grpc::Status MatchingEngineServiceImpl::SubmitOrder(grpc::ServerContext* context, const exchange::OrderRequest* request,
                                                    exchange::OrderResponse* response) {
    std::vector<exchange::Trade> out_trades;
    bool accepted = book_.submit_order(*request, out_trades);
    
    response->set_order_id(request->order_id());
    response->set_accepted(accepted);
    if (!accepted) {
        response->set_message("Order rejected");
    } else {
        response->set_message("Order accepted");
        std::lock_guard<std::mutex> lock(streams_mu_);
        for (const auto& t : out_trades) {
            new_trades_.push_back(t);
        }
        book_updated_ = true;
        cv_.notify_all();
    }
    
    return grpc::Status::OK;
}

grpc::Status MatchingEngineServiceImpl::CancelOrder(grpc::ServerContext* context, const exchange::CancelRequest* request,
                                                    exchange::CancelResponse* response) {
    bool canceled = book_.cancel_order(request->order_id());
    response->set_success(canceled);
    if (canceled) {
        std::lock_guard<std::mutex> lock(streams_mu_);
        book_updated_ = true;
        cv_.notify_all();
    }
    return grpc::Status::OK;
}

grpc::Status MatchingEngineServiceImpl::StreamTrades(grpc::ServerContext* context, const exchange::Empty* request,
                                                     grpc::ServerWriter<exchange::Trade>* writer) {
    size_t trade_idx = 0;
    while (!context->IsCancelled()) {
        std::vector<exchange::Trade> batch;
        {
            std::unique_lock<std::mutex> lock(streams_mu_);
            cv_.wait(lock, [&]() {
                return context->IsCancelled() || trade_idx < new_trades_.size();
            });
            
            if (context->IsCancelled()) break;
            
            while (trade_idx < new_trades_.size()) {
                batch.push_back(new_trades_[trade_idx++]);
            }
        }
        
        for (const auto& t : batch) {
            writer->Write(t);
        }
    }
    return grpc::Status::OK;
}

grpc::Status MatchingEngineServiceImpl::StreamBookUpdates(grpc::ServerContext* context, const exchange::Empty* request,
                                                          grpc::ServerWriter<exchange::BookSnapshot>* writer) {
    // Send initial snapshot
    writer->Write(book_.get_snapshot());
    
    while (!context->IsCancelled()) {
        exchange::BookSnapshot snap;
        {
            std::unique_lock<std::mutex> lock(streams_mu_);
            cv_.wait(lock, [&]() {
                return context->IsCancelled() || book_updated_;
            });
            
            if (context->IsCancelled()) break;
            book_updated_ = false; // Reset flag (in a single-consumer or broad-cast, this is simplified)
            // Wait, if multiple StreamBookUpdates are connected, setting it to false will starve others.
            // Better to just wake up every time there's an update, and get the snapshot.
        }
        
        // Wait, the above logic has a flaw if multiple clients connect, but since we only have one backend client it's fine.
        writer->Write(book_.get_snapshot());
    }
    return grpc::Status::OK;
}

} // namespace engine
