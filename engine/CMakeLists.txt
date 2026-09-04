cmake_minimum_required(VERSION 3.15)
project(Engine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# We use vcpkg to find gRPC and Protobuf
find_package(gRPC CONFIG REQUIRED)
find_package(Protobuf CONFIG REQUIRED)

# The generated stubs will be in include/
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

add_library(engine_stubs
    include/exchange.pb.cc
    include/exchange.grpc.pb.cc
)

target_link_libraries(engine_stubs PUBLIC gRPC::grpc++ protobuf::libprotobuf)

# Placeholder test executable so we have something to build
add_executable(engine_test tests/main.cpp)
target_link_libraries(engine_test PRIVATE engine_stubs)
