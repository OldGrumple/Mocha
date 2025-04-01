.PHONY: all proto build clean

all: proto build

proto:
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		proto/agent.proto

build: build-agent build-master

build-agent:
	go build -o bin/agent cmd/agent/main.go

build-master:
	go build -o bin/master cmd/master/main.go

clean:
	rm -rf bin/
	rm -rf proto/*.pb.go 