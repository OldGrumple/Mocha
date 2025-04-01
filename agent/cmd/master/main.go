package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	"mocha-agent/pkg/node"
	pb "mocha-agent/proto"

	"google.golang.org/grpc"
)

var (
	port   = flag.Int("port", 50051, "The server port")
	apiURL = flag.String("api-url", "http://localhost:3000", "The Node.js API URL")
)

func main() {
	flag.Parse()

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	// Create the gRPC server
	s := grpc.NewServer()

	// Create and start the node manager
	nodeManager := node.NewManager(*apiURL)
	nodeManager.Start()

	// Register the service
	pb.RegisterAgentServiceServer(s, nodeManager)

	// Handle graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		log.Println("Shutting down...")
		nodeManager.Stop()
		s.GracefulStop()
		os.Exit(0)
	}()

	log.Printf("Starting master server on port %d with API URL %s", *port, *apiURL)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
