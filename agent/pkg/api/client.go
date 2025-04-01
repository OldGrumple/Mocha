package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client handles communication with the API
type Client struct {
	baseURL    string
	apiKey     string
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
	CPUCores        int32   `json:"cpuCores"`
	MemoryUsed      int64   `json:"memoryUsed"`
	MemoryTotal     int64   `json:"memoryTotal"`
	DiskUsage       float64 `json:"diskUsage"`
	NetworkBytesIn  int64   `json:"networkBytesIn"`
	NetworkBytesOut int64   `json:"networkBytesOut"`
}

// NewClient creates a new API client
func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetBaseURL returns the base URL of the API client
func (c *Client) GetBaseURL() string {
	return c.baseURL
}

func (c *Client) UpdateNodeStatus(nodeID string, metrics SystemMetrics) error {
	url := fmt.Sprintf("%s/api/nodes/%s/status", c.baseURL, nodeID)

	payload := struct {
		Status   string        `json:"status"`
		LastSeen int64         `json:"lastSeen"`
		Metrics  SystemMetrics `json:"metrics"`
		APIKey   string        `json:"apiKey,omitempty"`
	}{
		Status:   "online",
		LastSeen: time.Now().Unix(),
		Metrics:  metrics,
		APIKey:   c.apiKey,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal node status: %v", err)
	}

	fmt.Printf("Sending request to %s with payload: %s\n", url, string(data))

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

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Received response with status %d: %s\n", resp.StatusCode, string(body))

	if resp.StatusCode != http.StatusOK {
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
		Message     string `json:"message,omitempty"`
		Progress    int    `json:"progress,omitempty"`
	}{
		Status:      status,
		PlayerCount: playerCount,
	}

	// Extract progress from status if it's a provisioning status
	if strings.HasPrefix(status, "provisioning_") {
		parts := strings.Split(status, "_")
		if len(parts) > 1 {
			payload.Message = fmt.Sprintf("Provisioning server: %s", parts[1])
			switch parts[1] {
			case "setup":
				payload.Progress = 20
			case "download":
				payload.Progress = 50
			case "config":
				payload.Progress = 80
			}
		}
	} else {
		switch status {
		case "provisioning":
			payload.Message = "Starting server provisioning..."
			payload.Progress = 0
		case "provisioned":
			payload.Message = "Server provisioned successfully"
			payload.Progress = 100
		case "failed":
			payload.Message = "Server provisioning failed"
		case "running":
			payload.Message = "Server is running"
		case "stopped":
			payload.Message = "Server is stopped"
		}
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal status update: %v", err)
	}

	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))

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
