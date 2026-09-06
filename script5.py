import re

with open('engine/src/main.cpp', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''    std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
    if (!server) {
        std::cerr << "Failed to start server on " << server_address << std::endl;
        exit(1);
    }
    std::cout << "Engine Server listening on " << server_address << std::endl;
    server->Wait();'''

content = re.sub(r'    std::unique_ptr<grpc::Server> server\(builder\.BuildAndStart\(\)\);\n    std::cout << "Engine Server listening on " << server_address << std::endl;\n    server->Wait\(\);', replacement, content, flags=re.DOTALL)

with open('engine/src/main.cpp', 'w', encoding='utf-8') as f:
    f.write(content)
