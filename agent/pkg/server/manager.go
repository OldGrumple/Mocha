package server

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sync"

	pb "mocha-agent/pkg/grpc"
)

type Manager struct {
	pb.UnimplementedAgentServiceServer
	mu       sync.RWMutex
	servers  map[string]*Server
	basePath string
}

type Server struct {
	InstanceID string
	Name       string
	Version    string
	Plugins    []*pb.Plugin
	Process    *exec.Cmd
	Status     string
}

func NewManager() *Manager {
	// Create a base directory for all Minecraft servers
	basePath := filepath.Join(os.TempDir(), "mocha-servers")
	if err := os.MkdirAll(basePath, 0755); err != nil {
		log.Fatalf("Failed to create base directory: %v", err)
	}

	return &Manager{
		servers:  make(map[string]*Server),
		basePath: basePath,
	}
}

func (m *Manager) ProvisionServer(ctx context.Context, req *pb.ProvisionRequest) (*pb.ProvisionResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Create a unique instance ID
	instanceID := fmt.Sprintf("server-%d", len(m.servers)+1)

	// Create server directory
	serverPath := filepath.Join(m.basePath, instanceID)
	if err := os.MkdirAll(serverPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create server directory: %v", err)
	}

	// Create server instance
	server := &Server{
		InstanceID: instanceID,
		Name:       req.Name,
		Version:    req.MinecraftVersion,
		Plugins:    req.Plugins,
		Status:     "provisioned",
	}

	// Store server instance
	m.servers[instanceID] = server

	return &pb.ProvisionResponse{
		InstanceId: instanceID,
		Message:    "Server provisioned successfully",
	}, nil
}

func (m *Manager) StartServer(ctx context.Context, req *pb.ServerActionRequest) (*pb.ServerActionResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	server, exists := m.servers[req.InstanceId]
	if !exists {
		return nil, fmt.Errorf("server not found: %s", req.InstanceId)
	}

	// TODO: Implement actual server start logic
	// This would involve:
	// 1. Downloading the correct Minecraft server version
	// 2. Setting up the server configuration
	// 3. Installing plugins
	// 4. Starting the server process

	server.Status = "running"
	return &pb.ServerActionResponse{
		Message: "Server started successfully",
	}, nil
}

func (m *Manager) StopServer(ctx context.Context, req *pb.ServerActionRequest) (*pb.ServerActionResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	server, exists := m.servers[req.InstanceId]
	if !exists {
		return nil, fmt.Errorf("server not found: %s", req.InstanceId)
	}

	if server.Process != nil {
		// TODO: Implement graceful shutdown
		server.Process.Process.Kill()
	}

	server.Status = "stopped"
	return &pb.ServerActionResponse{
		Message: "Server stopped successfully",
	}, nil
}

func (m *Manager) DeleteServer(ctx context.Context, req *pb.ServerActionRequest) (*pb.ServerActionResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	server, exists := m.servers[req.InstanceId]
	if !exists {
		return nil, fmt.Errorf("server not found: %s", req.InstanceId)
	}

	// Stop the server if it's running
	if server.Process != nil {
		server.Process.Process.Kill()
	}

	// Remove server directory
	serverPath := filepath.Join(m.basePath, req.InstanceId)
	if err := os.RemoveAll(serverPath); err != nil {
		return nil, fmt.Errorf("failed to remove server directory: %v", err)
	}

	// Remove from map
	delete(m.servers, req.InstanceId)

	return &pb.ServerActionResponse{
		Message: "Server deleted successfully",
	}, nil
}

func (m *Manager) UpdatePlugins(ctx context.Context, req *pb.UpdatePluginsRequest) (*pb.UpdatePluginsResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	server, exists := m.servers[req.InstanceId]
	if !exists {
		return nil, fmt.Errorf("server not found: %s", req.InstanceId)
	}

	// TODO: Implement plugin update logic
	server.Plugins = req.Plugins

	return &pb.UpdatePluginsResponse{
		Message: "Plugins updated successfully",
	}, nil
}

func (m *Manager) GetServerStatus(ctx context.Context, req *pb.ServerActionRequest) (*pb.ServerStatusResponse, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	server, exists := m.servers[req.InstanceId]
	if !exists {
		return nil, fmt.Errorf("server not found: %s", req.InstanceId)
	}

	return &pb.ServerStatusResponse{
		InstanceId: server.InstanceID,
		Status:     server.Status,
		Message:    fmt.Sprintf("Server is %s", server.Status),
	}, nil
} 