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
	apiKey = flag.String("api-key", "", "The API key for authentication")
	help   = flag.Bool("help", false, "Display help information")
)

func printHelp() {
	fmt.Println("Mocha Agent Master")
	fmt.Println("------------------")
	fmt.Println("A gRPC server that manages Minecraft server agents.")
	fmt.Println("\nRequired Flags:")
	fmt.Println("  --port <number>     The port to listen on (default: 50051)")
	fmt.Println("  --api-url <url>     The URL of the Node.js API (default: http://localhost:3000)")
	fmt.Println("  --api-key <key>     The API key for authentication")
	fmt.Println("\nOptional Flags:")
	fmt.Println("  --help             Display this help message")
	fmt.Println("\nExample:")
	fmt.Println("  master --port 50051 --api-url http://localhost:3000 --api-key your-api-key")
}

func main() {
	flag.Parse()

	if *help {
		printHelp()
		os.Exit(0)
	}

	if *apiKey == "" {
		log.Fatal("API key is required")
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	// Create the gRPC server
	s := grpc.NewServer()

	// Create and start the node manager
	nodeManager := node.NewManager(*apiURL, *apiKey, false)
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
