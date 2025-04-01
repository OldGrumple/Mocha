package grpc

import (
	"context"
	"fmt"
	"runtime"
	"time"

	pb "mocha-agent/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type AgentClient struct {
	conn   *grpc.ClientConn
	client pb.AgentServiceClient
	nodeID string
}

func NewAgentClient(masterAddr string, nodeID string) (*AgentClient, error) {
	conn, err := grpc.Dial(masterAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to master: %v", err)
	}

	client := pb.NewAgentServiceClient(conn)
	return &AgentClient{
		conn:   conn,
		client: client,
		nodeID: nodeID,
	}, nil
}

func (c *AgentClient) Close() error {
	return c.conn.Close()
}

func (c *AgentClient) RegisterNode(ctx context.Context) error {
	hostname, err := getHostname()
	if err != nil {
		return fmt.Errorf("failed to get hostname: %v", err)
	}

	ipAddr, err := getIPAddress()
	if err != nil {
		return fmt.Errorf("failed to get IP address: %v", err)
	}

	memBytes, err := getTotalMemory()
	if err != nil {
		return fmt.Errorf("failed to get total memory: %v", err)
	}

	req := &pb.RegisterNodeRequest{
		NodeId:      c.nodeID,
		Hostname:    hostname,
		Os:          runtime.GOOS,
		MemoryBytes: memBytes,
		CpuCores:    int32(runtime.NumCPU()),
		IpAddress:   ipAddr,
	}

	resp, err := c.client.RegisterNode(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to register node: %v", err)
	}

	if !resp.Success {
		return fmt.Errorf("node registration failed: %s", resp.Message)
	}

	return nil
}

func (c *AgentClient) StartHeartbeat(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := c.sendHeartbeat(ctx); err != nil {
				fmt.Printf("Failed to send heartbeat: %v\n", err)
			}
		}
	}
}

func (c *AgentClient) sendHeartbeat(ctx context.Context) error {
	metrics, err := getSystemMetrics()
	if err != nil {
		return fmt.Errorf("failed to get system metrics: %v", err)
	}

	// TODO: Get actual server statuses from the server manager
	servers := []*pb.ServerStatus{}

	req := &pb.HeartbeatRequest{
		NodeId:  c.nodeID,
		Servers: servers,
		Metrics: metrics,
	}

	resp, err := c.client.Heartbeat(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to send heartbeat: %v", err)
	}

	if !resp.Success {
		return fmt.Errorf("heartbeat failed: %s", resp.Message)
	}

	return nil
}

// Helper functions for system information
func getHostname() (string, error) {
	// TODO: Implement hostname retrieval
	return "localhost", nil
}

func getIPAddress() (string, error) {
	// TODO: Implement IP address retrieval
	return "127.0.0.1", nil
}

func getTotalMemory() (int64, error) {
	// TODO: Implement total memory retrieval
	return 8589934592, nil // 8GB example
}

func getSystemMetrics() (*pb.SystemMetrics, error) {
	// TODO: Implement actual system metrics collection
	return &pb.SystemMetrics{
		CpuUsage:        0.5,
		MemoryUsed:      4294967296, // 4GB
		MemoryTotal:     8589934592, // 8GB
		DiskUsage:       0.7,
		NetworkBytesIn:  1024,
		NetworkBytesOut: 2048,
	}, nil
}

func (c *AgentClient) ProvisionServer(ctx context.Context, name, minecraftVersion string, plugins []*pb.Plugin) (*pb.ProvisionResponse, error) {
	req := &pb.ProvisionRequest{
		Name:             name,
		MinecraftVersion: minecraftVersion,
		Plugins:          plugins,
	}
	return c.client.ProvisionServer(ctx, req)
}

func (c *AgentClient) StartServer(ctx context.Context, instanceID string) (*pb.ServerActionResponse, error) {
	req := &pb.ServerActionRequest{
		InstanceId: instanceID,
	}
	return c.client.StartServer(ctx, req)
}

func (c *AgentClient) StopServer(ctx context.Context, instanceID string) (*pb.ServerActionResponse, error) {
	req := &pb.ServerActionRequest{
		InstanceId: instanceID,
	}
	return c.client.StopServer(ctx, req)
}

func (c *AgentClient) DeleteServer(ctx context.Context, instanceID string) (*pb.ServerActionResponse, error) {
	req := &pb.ServerActionRequest{
		InstanceId: instanceID,
	}
	return c.client.DeleteServer(ctx, req)
}

func (c *AgentClient) UpdatePlugins(ctx context.Context, instanceID string, plugins []*pb.Plugin) (*pb.UpdatePluginsResponse, error) {
	req := &pb.UpdatePluginsRequest{
		InstanceId: instanceID,
		Plugins:    plugins,
	}
	return c.client.UpdatePlugins(ctx, req)
}

func (c *AgentClient) GetServerStatus(ctx context.Context, instanceID string) (*pb.ServerStatusResponse, error) {
	req := &pb.ServerActionRequest{
		InstanceId: instanceID,
	}
	return c.client.GetServerStatus(ctx, req)
}
