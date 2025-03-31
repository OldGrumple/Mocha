.PHONY: all proto build clean

all: proto build

proto:
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		proto/agent.proto

build:
	go build -o bin/agent cmd/agent/main.go

clean:
	rm -rf bin/
	rm -rf pkg/grpc/*.go 