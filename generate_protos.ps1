# This script uses Docker to generate the gRPC stubs.
# It requires Docker to be installed and running.

Write-Host "Building protoc docker image..."
docker build -t exchange-protoc -f docker/Dockerfile.protoc .

Write-Host "Running protoc to generate Go and C++ stubs..."
docker run --rm -v "$($PWD):/workspace" exchange-protoc

Write-Host "Done!"
