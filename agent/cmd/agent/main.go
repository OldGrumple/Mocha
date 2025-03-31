package main

import (
	"flag"
	"fmt"
	"log"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	pb "github.com/benlack/mocha-agent/pkg/grpc"
	"github.com/benlack/mocha-agent/pkg/server"
)

var (
	port = flag.Int("port", 50051, "The server port")
)

func main() {
	flag.Parse()

	// Create a TCP listener
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	// Create a new gRPC server with insecure credentials (for development)
	s := grpc.NewServer(grpc.Creds(insecure.NewCredentials()))

	// Create a new server manager
	serverManager := server.NewManager()

	// Register the agent service
	pb.RegisterAgentServiceServer(s, serverManager)

	log.Printf("Starting gRPC server on port %d", *port)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
} 