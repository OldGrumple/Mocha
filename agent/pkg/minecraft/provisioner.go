package minecraft

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
)

type ServerConfig struct {
	ServerName      string `json:"serverName"`
	MaxPlayers      int    `json:"maxPlayers"`
	Memory          int    `json:"memory"` // Memory in GB
	Port            int    `json:"port"`
	Difficulty      string `json:"difficulty"`
	GameMode        string `json:"gameMode"`
	ViewDistance    int    `json:"viewDistance"`
	SpawnProtection int    `json:"spawnProtection"`
}

// ProvisionStatus represents the current status of server provisioning
type ProvisionStatus struct {
	Stage    string `json:"stage"`
	Progress int    `json:"progress"`
	Message  string `json:"message"`
	Error    string `json:"error,omitempty"`
}

type ProgressCallback func(status ProvisionStatus)

type Provisioner struct {
	baseDir    string
	apiBaseURL string
	onProgress ProgressCallback
}

func NewProvisioner(baseDir, apiBaseURL string, onProgress ProgressCallback) *Provisioner {
	return &Provisioner{
		baseDir:    baseDir,
		apiBaseURL: apiBaseURL,
		onProgress: onProgress,
	}
}

func (p *Provisioner) reportProgress(stage string, progress int, message string, err error) {
	if p.onProgress != nil {
		status := ProvisionStatus{
			Stage:    stage,
			Progress: progress,
			Message:  message,
		}
		if err != nil {
			status.Error = err.Error()
		}
		p.onProgress(status)
	}
}

func (p *Provisioner) downloadServerJar(version string, destPath string) error {
	p.reportProgress("download", 0, fmt.Sprintf("Downloading server jar version %s", version), nil)
	log.Printf("Downloading server jar version %s from %s", version, p.apiBaseURL)

	url := fmt.Sprintf("%s/api/minecraft/download/%s", p.apiBaseURL, version)

	resp, err := http.Get(url)
	if err != nil {
		log.Printf("Failed to start download: %v", err)
		p.reportProgress("download", 0, "Failed to start download", err)
		return fmt.Errorf("failed to download server jar: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("server returned status %d", resp.StatusCode)
		log.Printf("Download failed: %v", err)
		p.reportProgress("download", 0, "Download failed", err)
		return fmt.Errorf("failed to download server jar: %v", err)
	}

	out, err := os.Create(destPath)
	if err != nil {
		log.Printf("Failed to create jar file: %v", err)
		p.reportProgress("download", 0, "Failed to create jar file", err)
		return fmt.Errorf("failed to create jar file: %v", err)
	}
	defer out.Close()

	log.Printf("Saving server jar to %s", destPath)
	p.reportProgress("download", 50, "Saving server jar", nil)
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		log.Printf("Failed to save jar file: %v", err)
		p.reportProgress("download", 50, "Failed to save jar file", err)
		return fmt.Errorf("failed to save jar file: %v", err)
	}

	log.Printf("Server jar downloaded successfully")
	p.reportProgress("download", 100, "Server jar downloaded successfully", nil)
	return nil
}

func (p *Provisioner) ProvisionServer(serverID, serverName, version string, config *ServerConfig) error {
	log.Printf("Starting server provisioning for %s (version %s)", serverName, version)
	p.reportProgress("setup", 0, "Starting server provisioning", nil)

	// Create server directory
	serverDir := filepath.Join(p.baseDir, serverID)
	log.Printf("Creating server directory: %s", serverDir)
	if err := os.MkdirAll(serverDir, 0755); err != nil {
		log.Printf("Failed to create server directory: %v", err)
		p.reportProgress("setup", 10, "Failed to create server directory", err)
		return fmt.Errorf("failed to create server directory: %v", err)
	}
	p.reportProgress("setup", 20, "Created server directory", nil)

	// Download server jar
	destJarPath := filepath.Join(serverDir, "server.jar")
	if err := p.downloadServerJar(version, destJarPath); err != nil {
		log.Printf("Failed to download server jar: %v", err)
		return err
	}
	p.reportProgress("setup", 40, "Server jar downloaded", nil)

	// Create server.properties
	log.Printf("Creating server.properties")
	if err := p.createServerProperties(serverDir, config); err != nil {
		log.Printf("Failed to create server properties: %v", err)
		p.reportProgress("config", 60, "Failed to create server properties", err)
		return fmt.Errorf("failed to create server.properties: %v", err)
	}
	p.reportProgress("config", 70, "Created server properties", nil)

	// Create eula.txt
	log.Printf("Creating eula.txt")
	if err := p.createEula(serverDir); err != nil {
		log.Printf("Failed to create EULA file: %v", err)
		p.reportProgress("config", 80, "Failed to create EULA file", err)
		return fmt.Errorf("failed to create eula.txt: %v", err)
	}
	p.reportProgress("config", 90, "Created EULA file", nil)

	// Create start script
	log.Printf("Creating start script")
	if err := p.createStartScript(serverDir, config); err != nil {
		log.Printf("Failed to create start script: %v", err)
		p.reportProgress("config", 95, "Failed to create start script", err)
		return fmt.Errorf("failed to create start script: %v", err)
	}
	log.Printf("Server provisioning completed successfully")
	p.reportProgress("complete", 100, "Server provisioned successfully", nil)

	return nil
}

func (p *Provisioner) createServerProperties(serverDir string, config *ServerConfig) error {
	properties := []string{
		fmt.Sprintf("server-name=%s", config.ServerName),
		fmt.Sprintf("max-players=%d", config.MaxPlayers),
		fmt.Sprintf("server-port=%d", config.Port),
		fmt.Sprintf("difficulty=%s", config.Difficulty),
		fmt.Sprintf("gamemode=%s", config.GameMode),
		fmt.Sprintf("view-distance=%d", config.ViewDistance),
		fmt.Sprintf("spawn-protection=%d", config.SpawnProtection),
		"enable-command-block=true",
		"spawn-npcs=true",
		"spawn-animals=true",
		"spawn-monsters=true",
		"generate-structures=true",
		"online-mode=false", // Since we handle authentication ourselves
	}

	content := ""
	for _, prop := range properties {
		content += prop + "\n"
	}

	return os.WriteFile(
		filepath.Join(serverDir, "server.properties"),
		[]byte(content),
		0644,
	)
}

func (p *Provisioner) createEula(serverDir string) error {
	return os.WriteFile(
		filepath.Join(serverDir, "eula.txt"),
		[]byte("eula=true\n"),
		0644,
	)
}

func (p *Provisioner) createStartScript(serverDir string, config *ServerConfig) error {
	memoryMB := config.Memory * 1024
	script := fmt.Sprintf(`#!/bin/bash
java -Xmx%dM -Xms%dM -jar server.jar nogui
`, memoryMB, memoryMB)

	scriptPath := filepath.Join(serverDir, "start.sh")
	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		return err
	}

	return nil
}

func (p *Provisioner) StartServer(serverDir string) (*exec.Cmd, error) {
	cmd := exec.Command("/bin/bash", "start.sh")
	cmd.Dir = serverDir

	// Create logs directory if it doesn't exist
	logsDir := filepath.Join(serverDir, "logs")
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create logs directory: %v", err)
	}

	// Open log file
	logFile, err := os.OpenFile(
		filepath.Join(logsDir, "latest.log"),
		os.O_CREATE|os.O_WRONLY|os.O_APPEND,
		0644,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %v", err)
	}

	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if err := cmd.Start(); err != nil {
		logFile.Close()
		return nil, fmt.Errorf("failed to start server: %v", err)
	}

	return cmd, nil
}

func copyFile(src, dst string) error {
	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destination.Close()

	_, err = io.Copy(destination, source)
	return err
}

func (p *Provisioner) FetchServerConfig(serverID string) (*ServerConfig, error) {
	url := fmt.Sprintf("%s/api/servers/%s/config", p.apiBaseURL, serverID)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch server config: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		// Return default config if none exists
		return &ServerConfig{
			MaxPlayers:      20,
			Memory:          2,
			Port:            25565,
			Difficulty:      "normal",
			GameMode:        "survival",
			ViewDistance:    10,
			SpawnProtection: 16,
		}, nil
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var config ServerConfig
	if err := json.NewDecoder(resp.Body).Decode(&config); err != nil {
		return nil, fmt.Errorf("failed to decode config: %v", err)
	}

	return &config, nil
}
