package node

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"mocha-agent/pkg/api"
	"mocha-agent/pkg/minecraft"
	pb "mocha-agent/proto"
)

const (
	offlineThreshold = 60 * time.Second
)

type NodeInfo struct {
	ID          string
	Hostname    string
	OS          string
	MemoryBytes int64
	CPUCores    int32
	IPAddress   string
	LastSeen    int64
	Servers     map[string]*pb.ServerStatus
	Metrics     *pb.SystemMetrics
	APIKey      string
	Status      string
	Processes   map[string]*exec.Cmd // Map of server ID to running process
}

type Manager struct {
	pb.UnimplementedAgentServiceServer
	mu          sync.RWMutex
	nodes       map[string]*NodeInfo
	apiClient   *api.Client
	stopChan    chan struct{}
	provisioner *minecraft.Provisioner
	baseDir     string
	onProgress  minecraft.ProgressCallback
	verbose     bool
}

func NewManager(apiBaseURL, apiKey string, verbose bool) *Manager {
	baseDir := "./servers" // You might want to make this configurable

	manager := &Manager{
		nodes:     make(map[string]*NodeInfo),
		apiClient: api.NewClient(apiBaseURL, apiKey),
		stopChan:  make(chan struct{}),
		baseDir:   baseDir,
		verbose:   verbose,
	}

	// Create the progress callback
	manager.onProgress = func(status minecraft.ProvisionStatus) {
		manager.mu.Lock()
		defer manager.mu.Unlock()

		if manager.verbose {
			log.Printf("Provisioning status: %s (%d%%) - %s",
				status.Stage,
				status.Progress,
				status.Message)
			if status.Error != "" {
				log.Printf("Error: %s", status.Error)
			}
		}

		// Find the server being provisioned
		for _, node := range manager.nodes {
			for _, server := range node.Servers {
				if server.Status == "provisioning" || strings.HasPrefix(server.Status, "provisioning_") {
					if status.Error != "" {
						server.Status = "failed"
						server.Message = fmt.Sprintf("%s: %s", status.Message, status.Error)
					} else {
						server.Status = fmt.Sprintf("provisioning_%s", status.Stage)
						server.Message = fmt.Sprintf("%s (%d%%)", status.Message, status.Progress)
					}

					// Send status update to API
					go func(serverID, status, message string) {
						if err := manager.apiClient.UpdateServerStatus(serverID, status, 0); err != nil {
							log.Printf("Failed to update server status: %v", err)
						}
					}(server.ServerId, server.Status, server.Message)
				}
			}
		}
	}

	// Initialize the provisioner with the callback
	manager.provisioner = minecraft.NewProvisioner(baseDir, apiBaseURL, manager.onProgress)

	return manager
}

func (s *Manager) Start() {
	go s.syncLoop()
	go s.checkOfflineNodes()
	go s.metricsSyncLoop()
}

func (s *Manager) Stop() {
	close(s.stopChan)
}

func (s *Manager) checkOfflineNodes() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			return
		case <-ticker.C:
			s.mu.Lock()
			for nodeID, node := range s.nodes {
				if time.Since(time.Unix(node.LastSeen, 0)) > offlineThreshold {
					if node.Status != "offline" {
						node.Status = "offline"
						fmt.Printf("Node %s is now offline\n", nodeID)
					}
				} else if node.Status == "offline" {
					node.Status = "online"
					fmt.Printf("Node %s is back online\n", nodeID)
				}
			}
			s.mu.Unlock()
		}
	}
}

func (s *Manager) metricsSyncLoop() {
	ticker := time.NewTicker(60 * time.Second) // Collect metrics every minute
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			return
		case <-ticker.C:
			s.syncMetricsWithAPI()
		}
	}
}

func (s *Manager) syncMetricsWithAPI() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for nodeID, node := range s.nodes {
		// Skip nodes with empty IDs
		if nodeID == "" {
			fmt.Printf("Skipping node with empty ID\n")
			continue
		}

		// Skip nodes that haven't reported metrics yet
		if node.Metrics == nil {
			fmt.Printf("Skipping node %s: no metrics available\n", nodeID)
			continue
		}

		metrics := api.SystemMetrics{
			CPUUsage:        float64(node.Metrics.CpuUsage),
			CPUCores:        node.CPUCores,
			MemoryUsed:      node.Metrics.MemoryUsed,
			MemoryTotal:     node.Metrics.MemoryTotal,
			DiskUsage:       float64(node.Metrics.DiskUsage),
			NetworkBytesIn:  node.Metrics.NetworkBytesIn,
			NetworkBytesOut: node.Metrics.NetworkBytesOut,
		}

		fmt.Printf("Sending metrics for node %s: %+v\n", nodeID, metrics)

		if err := s.apiClient.UpdateNodeStatus(nodeID, metrics); err != nil {
			fmt.Printf("Failed to update node metrics for %s: %v\n", nodeID, err)
			continue
		}

		fmt.Printf("Successfully updated node metrics for %s\n", nodeID)
	}
}

func (s *Manager) syncLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			return
		case <-ticker.C:
			s.syncWithAPI()
		}
	}
}

func (s *Manager) syncWithAPI() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for nodeID, node := range s.nodes {
		// Skip nodes with empty IDs
		if nodeID == "" {
			fmt.Printf("Skipping node with empty ID\n")
			continue
		}

		// Skip nodes that haven't reported metrics yet
		if node.Metrics == nil {
			fmt.Printf("Skipping node %s: no metrics available\n", nodeID)
			continue
		}

		metrics := api.SystemMetrics{
			CPUUsage:        float64(node.Metrics.CpuUsage),
			CPUCores:        node.CPUCores,
			MemoryUsed:      node.Metrics.MemoryUsed,
			MemoryTotal:     node.Metrics.MemoryTotal,
			DiskUsage:       float64(node.Metrics.DiskUsage),
			NetworkBytesIn:  node.Metrics.NetworkBytesIn,
			NetworkBytesOut: node.Metrics.NetworkBytesOut,
		}

		fmt.Printf("Sending metrics for node %s: %+v\n", nodeID, metrics)

		if err := s.apiClient.UpdateNodeStatus(nodeID, metrics); err != nil {
			fmt.Printf("Failed to update node status for %s: %v\n", nodeID, err)
			continue
		}

		fmt.Printf("Successfully updated node status for %s\n", nodeID)

		// Update server statuses
		for serverID, serverStatus := range node.Servers {
			fmt.Printf("Updating server status for %s: %s\n", serverID, serverStatus.Status)
			if err := s.apiClient.UpdateServerStatus(serverID, serverStatus.Status, 0); err != nil {
				fmt.Printf("Failed to update server status for %s: %v\n", serverID, err)
				continue
			}
			fmt.Printf("Successfully updated server status for %s\n", serverID)
		}
	}
}

func (s *Manager) RegisterNode(ctx context.Context, req *pb.RegisterNodeRequest) (*pb.RegisterNodeResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate node ID
	if req.NodeId == "" {
		return &pb.RegisterNodeResponse{
			Success: false,
			Message: "Node ID cannot be empty",
		}, nil
	}

	// Check if node already exists
	if existingNode, exists := s.nodes[req.NodeId]; exists {
		// If node exists, verify API key
		if existingNode.APIKey != req.ApiKey {
			return &pb.RegisterNodeResponse{
				Success: false,
				Message: "Invalid API key",
			}, nil
		}
		// Update node information
		existingNode.LastSeen = time.Now().Unix()
		existingNode.Status = "online"
		return &pb.RegisterNodeResponse{
			Success: true,
			Message: fmt.Sprintf("Node %s reconnected successfully", req.NodeId),
		}, nil
	}

	// Generate new API key for first-time registration
	apiKey := generateAPIKey()

	// Create new node info
	s.nodes[req.NodeId] = &NodeInfo{
		ID:          req.NodeId,
		Hostname:    req.Hostname,
		OS:          req.Os,
		MemoryBytes: req.MemoryBytes,
		CPUCores:    req.CpuCores,
		IPAddress:   req.IpAddress,
		Servers:     make(map[string]*pb.ServerStatus),
		Status:      "online",
		LastSeen:    time.Now().Unix(),
		APIKey:      apiKey,
	}

	// Save node to database via API
	metrics := api.SystemMetrics{
		CPUUsage:        0,
		CPUCores:        req.CpuCores,
		MemoryUsed:      0,
		MemoryTotal:     req.MemoryBytes,
		DiskUsage:       0,
		NetworkBytesIn:  0,
		NetworkBytesOut: 0,
	}

	// Create a temporary API client with the API key
	tempClient := api.NewClient(s.apiClient.GetBaseURL(), apiKey)

	if err := tempClient.UpdateNodeStatus(req.NodeId, metrics); err != nil {
		log.Printf("Warning: Failed to save node to database: %v", err)
	}

	return &pb.RegisterNodeResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully registered node %s", req.NodeId),
		ApiKey:  apiKey,
	}, nil
}

func (s *Manager) Heartbeat(ctx context.Context, req *pb.HeartbeatRequest) (*pb.HeartbeatResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate node ID
	if req.NodeId == "" {
		return &pb.HeartbeatResponse{
			Success: false,
			Message: "Node ID cannot be empty",
		}, nil
	}

	node, exists := s.nodes[req.NodeId]
	if !exists {
		return &pb.HeartbeatResponse{
			Success: false,
			Message: fmt.Sprintf("Node %s is not registered", req.NodeId),
		}, nil
	}

	// Verify API key
	if node.APIKey != req.ApiKey {
		return &pb.HeartbeatResponse{
			Success: false,
			Message: "Invalid API key",
		}, nil
	}

	// Update node information
	node.LastSeen = time.Now().Unix()
	node.Metrics = req.Metrics
	node.Status = "online"

	// Debug logging
	if req.Metrics != nil {
		fmt.Printf("Received metrics for node %s: cpu_usage:%.2f cpu_cores:%d memory_used:%d memory_total:%d disk_usage:%.2f network_bytes_in:%d network_bytes_out:%d\n",
			req.NodeId,
			req.Metrics.CpuUsage,
			req.Metrics.CpuCores,
			req.Metrics.MemoryUsed,
			req.Metrics.MemoryTotal,
			req.Metrics.DiskUsage,
			req.Metrics.NetworkBytesIn,
			req.Metrics.NetworkBytesOut)
	}

	// Update server statuses
	for _, server := range req.Servers {
		if server.ServerId == "" {
			fmt.Printf("Skipping server with empty ID in heartbeat from node %s\n", req.NodeId)
			continue
		}
		node.Servers[server.ServerId] = server
	}

	return &pb.HeartbeatResponse{
		Success: true,
		Message: "Heartbeat received",
	}, nil
}

// Helper function to generate API keys
func generateAPIKey() string {
	return fmt.Sprintf("key-%d", time.Now().UnixNano())
}

func (s *Manager) ProvisionServer(ctx context.Context, req *pb.ProvisionRequest) (*pb.ProvisionResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate node exists
	node, exists := s.nodes[req.NodeId]
	if !exists {
		return &pb.ProvisionResponse{
			Success: false,
			Message: "Node not found",
		}, nil
	}

	// Validate API key
	if node.APIKey != req.ApiKey {
		return &pb.ProvisionResponse{
			Success: false,
			Message: "Invalid API key",
		}, nil
	}

	// Fetch server config
	config, err := s.provisioner.FetchServerConfig(req.ServerId)
	if err != nil {
		log.Printf("Warning: Failed to fetch server config: %v", err)
		// Continue with default config
		config = &minecraft.ServerConfig{
			ServerName:      req.ServerId,
			MaxPlayers:      20,
			Memory:          2,
			Port:            25565,
			Difficulty:      "normal",
			GameMode:        "survival",
			ViewDistance:    10,
			SpawnProtection: 16,
		}
	}

	// Initialize server status
	if node.Servers == nil {
		node.Servers = make(map[string]*pb.ServerStatus)
	}
	node.Servers[req.ServerId] = &pb.ServerStatus{
		ServerId:    req.ServerId,
		Status:      "provisioning",
		PlayerCount: 0,
	}

	// Initialize process map if needed
	if node.Processes == nil {
		node.Processes = make(map[string]*exec.Cmd)
	}

	// Create a progress callback to update server status
	onProgress := func(status minecraft.ProvisionStatus) {
		// Update server status
		serverStatus := node.Servers[req.ServerId]
		if serverStatus != nil {
			if status.Error != "" {
				serverStatus.Status = "failed"
				serverStatus.Message = fmt.Sprintf("%s: %s", status.Message, status.Error)
			} else {
				serverStatus.Status = fmt.Sprintf("provisioning_%s", status.Stage)
				serverStatus.Message = fmt.Sprintf("%s (%d%%)", status.Message, status.Progress)
			}

			// Send status update to API
			go func() {
				if err := s.apiClient.UpdateServerStatus(req.ServerId, serverStatus.Status, 0); err != nil {
					log.Printf("Failed to update server status: %v", err)
				}
			}()
		}
	}

	// Update provisioner with progress callback
	s.provisioner = minecraft.NewProvisioner(s.baseDir, s.apiClient.GetBaseURL(), onProgress)

	// Provision the server
	if err := s.provisioner.ProvisionServer(req.ServerId, config.ServerName, req.Version, config); err != nil {
		log.Printf("Failed to provision server: %v", err)
		// Update final status
		node.Servers[req.ServerId].Status = "failed"
		node.Servers[req.ServerId].Message = fmt.Sprintf("Failed to provision server: %v", err)

		// Send final status to API
		go func() {
			if err := s.apiClient.UpdateServerStatus(req.ServerId, "failed", 0); err != nil {
				log.Printf("Failed to update server status: %v", err)
			}
		}()

		return &pb.ProvisionResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to provision server: %v", err),
		}, nil
	}

	// Update final status
	node.Servers[req.ServerId].Status = "provisioned"
	node.Servers[req.ServerId].Message = "Server provisioned successfully"

	// Send final status to API
	go func() {
		if err := s.apiClient.UpdateServerStatus(req.ServerId, "provisioned", 0); err != nil {
			log.Printf("Failed to update server status: %v", err)
		}
	}()

	return &pb.ProvisionResponse{
		Success:    true,
		Message:    "Server provisioned successfully",
		InstanceId: req.ServerId,
	}, nil
}

func (s *Manager) StartServer(ctx context.Context, req *pb.ServerOperationRequest) (*pb.ServerOperationResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate node exists
	node, exists := s.nodes[req.NodeId]
	if !exists {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Node not found",
		}, nil
	}

	// Validate API key
	if node.APIKey != req.ApiKey {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Invalid API key",
		}, nil
	}

	// Check if server exists
	serverStatus, exists := node.Servers[req.ServerId]
	if !exists {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Server not found",
		}, nil
	}

	// Check if server is already running
	if process, exists := node.Processes[req.ServerId]; exists && process != nil {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Server is already running",
		}, nil
	}

	// Start the server
	serverDir := fmt.Sprintf("%s/%s", s.baseDir, req.ServerId)
	cmd, err := s.provisioner.StartServer(serverDir)
	if err != nil {
		log.Printf("Failed to start server: %v", err)
		return &pb.ServerOperationResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to start server: %v", err),
		}, nil
	}

	// Store the process
	node.Processes[req.ServerId] = cmd

	// Update server status
	serverStatus.Status = "running"

	return &pb.ServerOperationResponse{
		Success: true,
		Message: "Server started successfully",
	}, nil
}

func (s *Manager) StopServer(ctx context.Context, req *pb.ServerOperationRequest) (*pb.ServerOperationResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate node exists
	node, exists := s.nodes[req.NodeId]
	if !exists {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Node not found",
		}, nil
	}

	// Validate API key
	if node.APIKey != req.ApiKey {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Invalid API key",
		}, nil
	}

	// Check if server exists
	serverStatus, exists := node.Servers[req.ServerId]
	if !exists {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Server not found",
		}, nil
	}

	// Check if server is running
	process, exists := node.Processes[req.ServerId]
	if !exists || process == nil {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Server is not running",
		}, nil
	}

	// Stop the server
	if err := process.Process.Kill(); err != nil {
		log.Printf("Failed to stop server: %v", err)
		return &pb.ServerOperationResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to stop server: %v", err),
		}, nil
	}

	// Remove the process
	delete(node.Processes, req.ServerId)

	// Update server status
	serverStatus.Status = "stopped"
	serverStatus.PlayerCount = 0

	return &pb.ServerOperationResponse{
		Success: true,
		Message: "Server stopped successfully",
	}, nil
}

func (s *Manager) DeleteServer(ctx context.Context, req *pb.ServerOperationRequest) (*pb.ServerOperationResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate node exists
	node, exists := s.nodes[req.NodeId]
	if !exists {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Node not found",
		}, nil
	}

	// Validate API key
	if node.APIKey != req.ApiKey {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Invalid API key",
		}, nil
	}

	// Check if server exists
	if _, exists := node.Servers[req.ServerId]; !exists {
		return &pb.ServerOperationResponse{
			Success: false,
			Message: "Server not found",
		}, nil
	}

	// Stop server if running
	if process, exists := node.Processes[req.ServerId]; exists && process != nil {
		if err := process.Process.Kill(); err != nil {
			log.Printf("Failed to stop server during deletion: %v", err)
		}
		delete(node.Processes, req.ServerId)
	}

	// Delete server directory
	serverDir := fmt.Sprintf("%s/%s", s.baseDir, req.ServerId)
	if err := os.RemoveAll(serverDir); err != nil {
		log.Printf("Failed to delete server directory: %v", err)
		return &pb.ServerOperationResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to delete server directory: %v", err),
		}, nil
	}

	// Remove server from node's servers map
	delete(node.Servers, req.ServerId)

	return &pb.ServerOperationResponse{
		Success: true,
		Message: "Server deleted successfully",
	}, nil
}

func (s *Manager) UpdatePlugins(ctx context.Context, req *pb.UpdatePluginsRequest) (*pb.UpdatePluginsResponse, error) {
	return &pb.UpdatePluginsResponse{
		Success: false,
		Message: "Plugin updates not implemented yet",
	}, nil
}

func (s *Manager) GetServerStatus(ctx context.Context, req *pb.ServerOperationRequest) (*pb.ServerStatusResponse, error) {
	return &pb.ServerStatusResponse{
		Success:    false,
		Message:    "Server status retrieval not implemented yet",
		InstanceId: "",
		Status:     "unknown",
	}, nil
}
