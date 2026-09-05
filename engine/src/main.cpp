#include "../include/server.h"
#include <iostream>

using namespace engine;

void MatchingEngineServiceImpl::Run(const std::string& server_address) {
    grpc::ServerBuilder builder;
    builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
    builder.RegisterService(this);
    
    std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
    std::cout << "Engine Server listening on " << server_address << std::endl;
    server->Wait();
}

int main() {
    MatchingEngineServiceImpl service;
    service.Run("0.0.0.0:50051");
    return 0;
}
