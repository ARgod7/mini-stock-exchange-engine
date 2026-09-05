cmake_minimum_required(VERSION 3.15)
project(Engine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

find_package(Protobuf REQUIRED)

# Use pkg-config for gRPC on Ubuntu
find_package(PkgConfig REQUIRED)
pkg_check_modules(gRPC REQUIRED grpc++)

# The generated stubs will be in include/
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/src)

# Add our engine source files
file(GLOB ENGINE_SRCS "src/*.cpp")
list(REMOVE_ITEM ENGINE_SRCS "${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp")

add_library(engine_lib
    ${ENGINE_SRCS}
    include/exchange.pb.cc
    include/exchange.grpc.pb.cc
)

target_link_directories(engine_lib PUBLIC ${gRPC_LIBRARY_DIRS})
target_link_libraries(engine_lib PUBLIC ${gRPC_LIBRARIES} protobuf::libprotobuf)

# Test executable
add_executable(engine_test tests/main.cpp)
target_link_libraries(engine_test PRIVATE engine_lib)

# Server executable
add_executable(engine_server src/main.cpp)
target_link_libraries(engine_server PRIVATE engine_lib)
