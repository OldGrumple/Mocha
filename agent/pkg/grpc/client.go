package grpc

import (
	"context"
	"fmt"
	"net"
	"os"
	"runtime"
	"time"

	pb "mocha-agent/proto"

	"mocha-agent/pkg/metrics"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type AgentClient struct {
	conn   *grpc.ClientConn
	client pb.AgentServiceClient
	nodeID string
	apiKey string
}

func NewAgentClient(masterAddr string, nodeID string, apiKey string) (*AgentClient, error) {
	conn, err := grpc.Dial(masterAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to master: %v", err)
	}

	client := pb.NewAgentServiceClient(conn)
	return &AgentClient{
		conn:   conn,
		client: client,
		nodeID: nodeID,
		apiKey: apiKey,
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
		ApiKey:      c.apiKey,
		Address:     c.conn.Target(),
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
		NodeId:    c.nodeID,
		Timestamp: time.Now().Unix(),
		Servers:   servers,
		Metrics:   metrics,
		ApiKey:    c.apiKey,
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
	hostname, err := os.Hostname()
	if err != nil {
		return "", fmt.Errorf("failed to get hostname: %v", err)
	}
	return hostname, nil
}

func getIPAddress() (string, error) {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", fmt.Errorf("failed to get interface addresses: %v", err)
	}

	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String(), nil
			}
		}
	}

	return "127.0.0.1", nil
}

func getTotalMemory() (int64, error) {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	return int64(mem.Sys), nil
}

func getSystemMetrics() (*pb.SystemMetrics, error) {
	collector := metrics.NewCollector()
	return &pb.SystemMetrics{
		CpuUsage:        collector.GetCPUUsage(),
		CpuCores:        int32(collector.GetCPUCores()),
		MemoryUsed:      collector.GetUsedMemory(),
		MemoryTotal:     collector.GetTotalMemory(),
		DiskUsage:       collector.GetDiskUsage(),
		NetworkBytesIn:  collector.GetNetworkBytesIn(),
		NetworkBytesOut: collector.GetNetworkBytesOut(),
	}, nil
}

func (c *AgentClient) ProvisionServer(ctx context.Context, name, minecraftVersion string) (*pb.ProvisionResponse, error) {
	req := &pb.ProvisionRequest{
		NodeId:   c.nodeID,
		ServerId: name,
		Version:  minecraftVersion,
		ApiKey:   c.apiKey,
	}
	return c.client.ProvisionServer(ctx, req)
}

func (c *AgentClient) StartServer(ctx context.Context, instanceID string) (*pb.ServerOperationResponse, error) {
	req := &pb.ServerOperationRequest{
		NodeId:   c.nodeID,
		ServerId: instanceID,
		ApiKey:   c.apiKey,
	}
	return c.client.StartServer(ctx, req)
}

func (c *AgentClient) StopServer(ctx context.Context, instanceID string) (*pb.ServerOperationResponse, error) {
	req := &pb.ServerOperationRequest{
		NodeId:   c.nodeID,
		ServerId: instanceID,
		ApiKey:   c.apiKey,
	}
	return c.client.StopServer(ctx, req)
}

func (c *AgentClient) DeleteServer(ctx context.Context, instanceID string) (*pb.ServerOperationResponse, error) {
	req := &pb.ServerOperationRequest{
		NodeId:   c.nodeID,
		ServerId: instanceID,
		ApiKey:   c.apiKey,
	}
	return c.client.DeleteServer(ctx, req)
}

func (c *AgentClient) ExecuteServerAction(ctx context.Context, instanceID string, action string) (*pb.ServerActionResponse, error) {
	req := &pb.ServerActionRequest{
		NodeId:     c.nodeID,
		ServerId:   instanceID,
		Action:     action,
		ApiKey:     c.apiKey,
		InstanceId: instanceID,
	}
	return c.client.ExecuteServerAction(ctx, req)
}

func (c *AgentClient) UpdateServerPlugins(ctx context.Context, instanceID string, plugins []string) (*pb.UpdatePluginsResponse, error) {
	req := &pb.UpdatePluginsRequest{
		NodeId:   c.nodeID,
		ServerId: instanceID,
		Plugins:  plugins,
		ApiKey:   c.apiKey,
	}
	return c.client.UpdateServerPlugins(ctx, req)
}

func (c *AgentClient) GetServerStatus(ctx context.Context, instanceID string) (*pb.ServerStatusResponse, error) {
	req := &pb.ServerOperationRequest{
		NodeId:   c.nodeID,
		ServerId: instanceID,
		ApiKey:   c.apiKey,
	}
	return c.client.GetServerStatus(ctx, req)
}
