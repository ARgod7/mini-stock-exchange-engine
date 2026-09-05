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
    }
    
    return grpc::Status::OK;
}

grpc::Status MatchingEngineServiceImpl::CancelOrder(grpc::ServerContext* context, const exchange::CancelRequest* request,
                                                    exchange::CancelResponse* response) {
    bool canceled = book_.cancel_order(request->order_id());
    response->set_success(canceled);
    return grpc::Status::OK;
}

grpc::Status MatchingEngineServiceImpl::StreamTrades(grpc::ServerContext* context, const exchange::Empty* request,
                                                     grpc::ServerWriter<exchange::Trade>* writer) {
    // Stub implementation for Phase 1
    return grpc::Status::OK;
}

grpc::Status MatchingEngineServiceImpl::StreamBookUpdates(grpc::ServerContext* context, const exchange::Empty* request,
                                                          grpc::ServerWriter<exchange::BookSnapshot>* writer) {
    // Stub implementation for Phase 1
    return grpc::Status::OK;
}

} // namespace engine
