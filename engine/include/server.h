#pragma once

#include "exchange.grpc.pb.h"
#include "matching_engine.h"
#include <grpcpp/grpcpp.h>
#include <mutex>
#include <vector>
#include <condition_variable>

namespace engine {

class MatchingEngineServiceImpl final : public exchange::MatchingEngine::Service {
public:
    MatchingEngineServiceImpl() = default;
    
    void Run(const std::string& server_address);
    
    grpc::Status SubmitOrder(grpc::ServerContext* context, const exchange::OrderRequest* request,
                             exchange::OrderResponse* response) override;
                             
    grpc::Status CancelOrder(grpc::ServerContext* context, const exchange::CancelRequest* request,
                             exchange::CancelResponse* response) override;
                             
    grpc::Status StreamTrades(grpc::ServerContext* context, const exchange::Empty* request,
                              grpc::ServerWriter<exchange::Trade>* writer) override;
                              
    grpc::Status StreamBookUpdates(grpc::ServerContext* context, const exchange::Empty* request,
                                   grpc::ServerWriter<exchange::BookSnapshot>* writer) override;

private:
    OrderBook book_;
    
    std::mutex streams_mu_;
    std::condition_variable cv_;
    std::vector<exchange::Trade> new_trades_;
    bool book_updated_ = false;
};

} // namespace engine
