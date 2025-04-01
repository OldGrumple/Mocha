package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mocha-agent/pkg/system"
	pb "mocha-agent/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	serverAddr = flag.String("server", "localhost:50051", "The server address")
	nodeID     = flag.String("node-id", "", "The node ID")
)

func main() {
	flag.Parse()

	if *nodeID == "" {
		log.Fatal("node-id is required")
	}

	// Set up a connection to the server with retry
	var conn *grpc.ClientConn
	var err error
	for i := 0; i < 5; i++ {
		conn, err = grpc.Dial(*serverAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err == nil {
			break
		}
		log.Printf("Failed to connect to master, retrying in 5 seconds... (attempt %d/5)", i+1)
		time.Sleep(5 * time.Second)
	}
	if err != nil {
		log.Fatalf("Failed to connect after 5 attempts: %v", err)
	}
	defer conn.Close()

	client := pb.NewAgentServiceClient(conn)

	// Collect initial system metrics
	metrics, err := system.CollectMetrics()
	if err != nil {
		log.Fatalf("Failed to collect metrics: %v", err)
	}

	// Register the node
	registerReq := &pb.RegisterNodeRequest{
		NodeId:      *nodeID,
		Hostname:    metrics.Hostname,
		Os:          metrics.OS,
		CpuCores:    metrics.CPUCores,
		MemoryBytes: metrics.MemoryTotal,
		IpAddress:   "localhost", // TODO: Get actual IP address
	}

	ctx := context.Background()
	registerResp, err := client.RegisterNode(ctx, registerReq)
	if err != nil {
		log.Fatalf("Failed to register node: %v", err)
	}

	if !registerResp.Success {
		log.Fatalf("Registration failed: %s", registerResp.Message)
	}

	log.Printf("Successfully registered node: %s", registerResp.Message)

	// Set up heartbeat goroutine
	heartbeatTicker := time.NewTicker(30 * time.Second)
	defer heartbeatTicker.Stop()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case <-sigChan:
			log.Println("Shutting down...")
			return
		case <-heartbeatTicker.C:
			// Collect current metrics
			metrics, err := system.CollectMetrics()
			if err != nil {
				log.Printf("Failed to collect metrics: %v", err)
				continue
			}

			// Send heartbeat
			heartbeatReq := &pb.HeartbeatRequest{
				NodeId:  *nodeID,
				Metrics: metrics.ToProto(),
				Servers: []*pb.ServerStatus{}, // TODO: Add actual server statuses
			}

			heartbeatResp, err := client.Heartbeat(ctx, heartbeatReq)
			if err != nil {
				log.Printf("Failed to send heartbeat: %v", err)
				continue
			}

			if !heartbeatResp.Success {
				log.Printf("Heartbeat failed: %s", heartbeatResp.Message)
			} else {
				log.Printf("Heartbeat sent successfully")
			}
		}
	}
}
