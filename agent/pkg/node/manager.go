package node

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mocha-agent/pkg/api"
	pb "mocha-agent/proto"
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
}

type Manager struct {
	pb.UnimplementedAgentServiceServer
	mu        sync.RWMutex
	nodes     map[string]*NodeInfo
	apiClient *api.Client
	stopChan  chan struct{}
}

func NewManager(apiBaseURL string) *Manager {
	return &Manager{
		nodes:     make(map[string]*NodeInfo),
		apiClient: api.NewClient(apiBaseURL),
		stopChan:  make(chan struct{}),
	}
}

func (s *Manager) Start() {
	go s.syncLoop()
}

func (s *Manager) Stop() {
	close(s.stopChan)
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
		// Skip nodes that haven't reported metrics yet
		if node.Metrics == nil {
			fmt.Printf("Skipping node %s: no metrics available\n", nodeID)
			continue
		}

		metrics := api.SystemMetrics{
			CPUUsage:        float64(node.Metrics.CpuUsage),
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

		// Update server statuses
		for serverID, serverStatus := range node.Servers {
			if err := s.apiClient.UpdateServerStatus(serverID, serverStatus.Status, serverStatus.PlayerCount); err != nil {
				fmt.Printf("Failed to update server status for %s: %v\n", serverID, err)
			}
		}
	}
}

func (s *Manager) RegisterNode(ctx context.Context, req *pb.RegisterNodeRequest) (*pb.RegisterNodeResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if node already exists
	if _, exists := s.nodes[req.NodeId]; exists {
		return &pb.RegisterNodeResponse{
			Success: false,
			Message: fmt.Sprintf("Node %s is already registered", req.NodeId),
		}, nil
	}

	// Create new node info
	s.nodes[req.NodeId] = &NodeInfo{
		ID:          req.NodeId,
		Hostname:    req.Hostname,
		OS:          req.Os,
		MemoryBytes: req.MemoryBytes,
		CPUCores:    req.CpuCores,
		IPAddress:   req.IpAddress,
		Servers:     make(map[string]*pb.ServerStatus),
	}

	return &pb.RegisterNodeResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully registered node %s", req.NodeId),
	}, nil
}

func (s *Manager) Heartbeat(ctx context.Context, req *pb.HeartbeatRequest) (*pb.HeartbeatResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	node, exists := s.nodes[req.NodeId]
	if !exists {
		return &pb.HeartbeatResponse{
			Success: false,
			Message: fmt.Sprintf("Node %s is not registered", req.NodeId),
		}, nil
	}

	// Update node information
	node.LastSeen = time.Now().Unix()
	node.Metrics = req.Metrics

	// Update server statuses
	for _, server := range req.Servers {
		node.Servers[server.InstanceId] = server
	}

	return &pb.HeartbeatResponse{
		Success: true,
		Message: "Heartbeat received",
	}, nil
}

func (s *Manager) ProvisionServer(ctx context.Context, req *pb.ProvisionRequest) (*pb.ProvisionResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// TODO: Implement proper server provisioning
	instanceID := fmt.Sprintf("server-%d", time.Now().Unix())

	return &pb.ProvisionResponse{
		InstanceId: instanceID,
		Message:    "Server provisioning not implemented yet",
	}, nil
}

func (s *Manager) StartServer(ctx context.Context, req *pb.ServerActionRequest) (*pb.ServerActionResponse, error) {
	return &pb.ServerActionResponse{
		Message: "Server start not implemented yet",
	}, nil
}

func (s *Manager) StopServer(ctx context.Context, req *pb.ServerActionRequest) (*pb.ServerActionResponse, error) {
	return &pb.ServerActionResponse{
		Message: "Server stop not implemented yet",
	}, nil
}

func (s *Manager) DeleteServer(ctx context.Context, req *pb.ServerActionRequest) (*pb.ServerActionResponse, error) {
	return &pb.ServerActionResponse{
		Message: "Server deletion not implemented yet",
	}, nil
}

func (s *Manager) UpdatePlugins(ctx context.Context, req *pb.UpdatePluginsRequest) (*pb.UpdatePluginsResponse, error) {
	return &pb.UpdatePluginsResponse{
		Message: "Plugin updates not implemented yet",
	}, nil
}

func (s *Manager) GetServerStatus(ctx context.Context, req *pb.ServerActionRequest) (*pb.ServerStatusResponse, error) {
	return &pb.ServerStatusResponse{
		InstanceId: req.InstanceId,
		Status:     "unknown",
		Message:    "Server status retrieval not implemented yet",
	}, nil
}
