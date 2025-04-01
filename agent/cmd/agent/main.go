package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"mocha-agent/pkg/metrics"
	"mocha-agent/pkg/node"
	pb "mocha-agent/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const (
	defaultServerAddr = "localhost:50051"
	configFileName    = "agent-config.json"
	maxRetries        = 5
	retryDelay        = 5 * time.Second
)

// AgentConfig stores the agent's configuration
type AgentConfig struct {
	NodeID string `json:"node_id"`
	APIKey string `json:"api_key"`
}

func printHelp() {
	fmt.Println("Mocha Agent")
	fmt.Println("-----------")
	fmt.Println("A client that connects to the Mocha master server to manage Minecraft servers.")
	fmt.Println("\nRequired Flags:")
	fmt.Println("  --server <address>   The master server address (default: localhost:50051)")
	fmt.Println("\nOptional Flags:")
	fmt.Println("  --node-id <id>       The node ID (default: hostname)")
	fmt.Println("  --api-key <key>      The API key for authentication")
	fmt.Println("  --help              Display this help message")
	fmt.Println("  --verbose           Enable verbose output")
	fmt.Println("\nExample:")
	fmt.Println("  agent --server localhost:50051 --node-id my-node --api-key my-key --verbose")
}

func loadConfig() (*AgentConfig, error) {
	configPath := filepath.Join(os.TempDir(), configFileName)
	data, err := ioutil.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return &AgentConfig{}, nil
		}
		return nil, err
	}

	var config AgentConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}
	return &config, nil
}

func saveConfig(config *AgentConfig) error {
	configPath := filepath.Join(os.TempDir(), configFileName)
	data, err := json.Marshal(config)
	if err != nil {
		return err
	}
	return ioutil.WriteFile(configPath, data, 0600)
}

func main() {
	var (
		serverAddr string
		nodeID     string
		apiKey     string
		help       bool
		verbose    bool
	)

	flag.StringVar(&serverAddr, "server", "localhost:50051", "Address of the master server")
	flag.StringVar(&nodeID, "node-id", "", "Unique identifier for this node")
	flag.StringVar(&apiKey, "api-key", "", "API key for authentication")
	flag.BoolVar(&help, "help", false, "Show help message")
	flag.BoolVar(&verbose, "verbose", false, "Enable verbose output")
	flag.Parse()

	if help {
		printHelp()
		return
	}

	if nodeID == "" {
		log.Fatal("node-id is required")
	}

	// Extract API base URL from server address
	apiBaseURL := fmt.Sprintf("http://%s", strings.Split(serverAddr, ":")[0])

	// Create the node manager
	manager := node.NewManager(apiBaseURL, apiKey, verbose)

	// Set up connection to server
	conn, err := grpc.Dial(serverAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Create gRPC client
	client := pb.NewAgentServiceClient(conn)

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start metrics collection
	metricsCollector := metrics.NewCollector()

	// Register node with server
	registerReq := &pb.RegisterNodeRequest{
		NodeId: nodeID,
		ApiKey: apiKey,
	}

	var registerResp *pb.RegisterNodeResponse
	for {
		registerResp, err = client.RegisterNode(context.Background(), registerReq)
		if err != nil {
			log.Printf("Failed to register node: %v. Retrying in %v...", err, retryDelay)
			time.Sleep(retryDelay)
			continue
		}
		if !registerResp.Success {
			log.Printf("Node registration failed: %s. Retrying in %v...", registerResp.Message, retryDelay)
			time.Sleep(retryDelay)
			continue
		}
		break
	}

	log.Printf("Node registered successfully")

	// Start heartbeat
	go func() {
		for {
			select {
			case <-sigChan:
				return
			default:
				metrics := &pb.SystemMetrics{
					CpuUsage:        metricsCollector.GetCPUUsage(),
					CpuCores:        int32(metricsCollector.GetCPUCores()),
					MemoryUsed:      metricsCollector.GetUsedMemory(),
					MemoryTotal:     metricsCollector.GetTotalMemory(),
					DiskUsage:       metricsCollector.GetDiskUsage(),
					NetworkBytesIn:  metricsCollector.GetNetworkBytesIn(),
					NetworkBytesOut: metricsCollector.GetNetworkBytesOut(),
				}

				if verbose {
					log.Printf("Sending metrics: %+v", metrics)
				}

				heartbeatReq := &pb.HeartbeatRequest{
					NodeId:  nodeID,
					ApiKey:  apiKey,
					Metrics: metrics,
				}

				_, err := client.Heartbeat(context.Background(), heartbeatReq)
				if err != nil {
					log.Printf("Failed to send heartbeat: %v", err)
				}

				time.Sleep(30 * time.Second)
			}
		}
	}()

	// Start the node manager
	go manager.Start()

	// Wait for shutdown signal
	<-sigChan
	log.Println("Shutting down...")
}
