package server

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"mocha-agent/pkg/minecraft"
	pb "mocha-agent/proto"
)

type Manager struct {
	pb.UnimplementedAgentServiceServer
	mu          sync.RWMutex
	servers     map[string]*Server
	basePath    string
	provisioner *minecraft.Provisioner
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

	// Create the provisioner
	provisioner := minecraft.NewProvisioner(basePath, "", nil)

	return &Manager{
		servers:     make(map[string]*Server),
		basePath:    basePath,
		provisioner: provisioner,
	}
}

func (m *Manager) ProvisionServer(ctx context.Context, req *pb.ProvisionRequest) (*pb.ProvisionResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	log.Printf("Received provisioning request: %+v", req)

	// Use the provided instance ID
	instanceID := req.ServerId
	if instanceID == "" {
		log.Printf("No server ID provided in request")
		return nil, fmt.Errorf("server_id is required")
	}

	log.Printf("Provisioning server with ID: %s", instanceID)

	// Create server directory
	serverPath := filepath.Join(m.basePath, instanceID)
	log.Printf("Creating server directory at: %s", serverPath)
	if err := os.MkdirAll(serverPath, 0755); err != nil {
		log.Printf("Failed to create server directory: %v", err)
		return nil, fmt.Errorf("failed to create server directory: %v", err)
	}

	// Convert server config
	config := &minecraft.ServerConfig{
		ServerName:      req.Config.ServerName,
		MaxPlayers:      int(req.Config.MaxPlayers),
		Memory:          int(req.Config.Memory),
		Port:            int(req.Config.Port),
		Difficulty:      req.Config.Difficulty,
		GameMode:        req.Config.GameMode,
		ViewDistance:    int(req.Config.ViewDistance),
		SpawnProtection: int(req.Config.SpawnProtection),
	}

	// Provision the server
	if err := m.provisioner.ProvisionServer(instanceID, req.Config.ServerName, req.MinecraftVersion, config); err != nil {
		log.Printf("Failed to provision server: %v", err)
		return nil, fmt.Errorf("failed to provision server: %v", err)
	}

	// Create server instance
	server := &Server{
		InstanceID: instanceID,
		Name:       req.Config.ServerName,
		Version:    req.MinecraftVersion,
		Plugins:    req.Plugins,
		Status:     "provisioned",
	}

	// Store server instance
	m.servers[instanceID] = server
	log.Printf("Server instance created and stored: %+v", server)

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

	// Check if server is already running
	if server.Process != nil {
		return nil, fmt.Errorf("server is already running")
	}

	// Get the startup script path
	scriptPath := req.ScriptPath
	if scriptPath == "" {
		// Default to looking in the server's directory
		scriptPath = filepath.Join(m.basePath, req.InstanceId, "start.sh")
		if runtime.GOOS == "windows" {
			scriptPath = filepath.Join(m.basePath, req.InstanceId, "start.bat")
		}
	}

	// Check if script exists
	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("startup script not found at %s", scriptPath)
	}

	// Prepare the command
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command(scriptPath)
	} else {
		cmd = exec.Command("bash", scriptPath)
	}

	// Set working directory to server directory
	cmd.Dir = filepath.Dir(scriptPath)

	// Set up pipes for stdout/stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %v", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stderr pipe: %v", err)
	}

	// Start the server process
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start server: %v", err)
	}

	// Store process information
	server.Process = cmd
	server.Status = "starting"

	// Handle stdout in a goroutine
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			log.Printf("[Server %s] %s", req.InstanceId, line)

			// Check for server start completion
			if strings.Contains(line, "Done") || strings.Contains(line, "For help, type \"help\"") {
				server.Status = "running"
			}
		}
	}()

	// Handle stderr in a goroutine
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			log.Printf("[Server %s Error] %s", req.InstanceId, scanner.Text())
		}
	}()

	// Handle process completion
	go func() {
		err := cmd.Wait()
		m.mu.Lock()
		defer m.mu.Unlock()

		if err != nil {
			log.Printf("[Server %s] Process ended with error: %v", req.InstanceId, err)
			server.Status = "error"
		} else {
			server.Status = "stopped"
		}
		server.Process = nil
	}()

	return &pb.ServerActionResponse{
		Message: "Server start initiated",
	}, nil
}

func (m *Manager) StopServer(ctx context.Context, req *pb.ServerActionRequest) (*pb.ServerActionResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	server, exists := m.servers[req.InstanceId]
	if !exists {
		return nil, fmt.Errorf("server not found: %s", req.InstanceId)
	}

	if server.Process == nil {
		return nil, fmt.Errorf("server is not running")
	}

	// Send stop command to server console
	if stdin, err := server.Process.StdinPipe(); err == nil {
		if _, err := stdin.Write([]byte("stop\n")); err != nil {
			log.Printf("Failed to send stop command: %v", err)
		}
	}

	// Set up a timeout for graceful shutdown
	done := make(chan error)
	go func() {
		done <- server.Process.Wait()
	}()

	// Wait for graceful shutdown or force kill after timeout
	select {
	case <-time.After(30 * time.Second):
		log.Printf("Server %s shutdown timed out, force killing", req.InstanceId)
		if err := server.Process.Process.Kill(); err != nil {
			return nil, fmt.Errorf("failed to force kill server: %v", err)
		}
	case err := <-done:
		if err != nil {
			log.Printf("Server %s shutdown completed with error: %v", req.InstanceId, err)
		} else {
			log.Printf("Server %s shutdown completed successfully", req.InstanceId)
		}
	}

	server.Status = "stopped"
	server.Process = nil

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
