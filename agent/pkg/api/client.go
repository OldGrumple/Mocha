package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

type Node struct {
	ID          string    `json:"_id"`
	Name        string    `json:"name"`
	Address     string    `json:"address"`
	Status      string    `json:"status"`
	LastSeen    time.Time `json:"lastSeen"`
	CPUCores    int32     `json:"cpuCores"`
	MemoryBytes int64     `json:"memoryBytes"`
	Servers     []Server  `json:"servers"`
}

type Server struct {
	ID          string `json:"_id"`
	InstanceID  string `json:"instanceId"`
	Name        string `json:"name"`
	NodeID      string `json:"nodeId"`
	Status      string `json:"status"`
	Version     string `json:"version"`
	PlayerCount int32  `json:"playerCount"`
}

type SystemMetrics struct {
	CPUUsage        float64 `json:"cpuUsage"`
	MemoryUsed      int64   `json:"memoryUsed"`
	MemoryTotal     int64   `json:"memoryTotal"`
	DiskUsage       float64 `json:"diskUsage"`
	NetworkBytesIn  int64   `json:"networkBytesIn"`
	NetworkBytesOut int64   `json:"networkBytesOut"`
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) UpdateNodeStatus(nodeID string, metrics SystemMetrics) error {
	url := fmt.Sprintf("%s/api/nodes/%s/status", c.baseURL, nodeID)

	payload := struct {
		LastSeen time.Time     `json:"lastSeen"`
		Metrics  SystemMetrics `json:"metrics"`
	}{
		LastSeen: time.Now(),
		Metrics:  metrics,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal node status: %v", err)
	}

	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	return nil
}

func (c *Client) GetServerConfig(serverID string) (*Server, error) {
	url := fmt.Sprintf("%s/api/servers/%s", c.baseURL, serverID)

	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get server config: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result struct {
		Server Server `json:"server"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return &result.Server, nil
}

func (c *Client) UpdateServerStatus(serverID string, status string, playerCount int32) error {
	url := fmt.Sprintf("%s/api/servers/%s/status", c.baseURL, serverID)

	payload := struct {
		Status      string `json:"status"`
		PlayerCount int32  `json:"playerCount"`
	}{
		Status:      status,
		PlayerCount: playerCount,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal server status: %v", err)
	}

	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}
