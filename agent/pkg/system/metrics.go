package system

import (
	"fmt"
	"runtime"
	"time"

	pb "mocha-agent/proto"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type Metrics struct {
	Hostname    string
	OS          string
	CPUCores    int32
	CPUUsage    float64
	MemoryTotal int64
	MemoryUsed  int64
	DiskTotal   int64
	DiskUsed    int64
	DiskFree    int64
	NetworkIn   int64
	NetworkOut  int64
	Uptime      int64
}

func CollectMetrics() (*Metrics, error) {
	// Get host info
	hostInfo, err := host.Info()
	if err != nil {
		return nil, fmt.Errorf("failed to get host info: %v", err)
	}

	// Get CPU info
	cpuInfo, err := cpu.Info()
	if err != nil {
		return nil, fmt.Errorf("failed to get CPU info: %v", err)
	}

	// Get CPU usage
	cpuUsage, err := cpu.Percent(time.Second, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get CPU usage: %v", err)
	}

	// Get memory info
	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return nil, fmt.Errorf("failed to get memory info: %v", err)
	}

	// Get disk info
	diskInfo, err := disk.Usage("/")
	if err != nil {
		return nil, fmt.Errorf("failed to get disk info: %v", err)
	}

	// Get network info
	netStats, err := net.IOCounters(false)
	if err != nil {
		return nil, fmt.Errorf("failed to get network stats: %v", err)
	}

	metrics := &Metrics{
		Hostname:    hostInfo.Hostname,
		OS:          runtime.GOOS,
		CPUCores:    int32(len(cpuInfo)),
		CPUUsage:    cpuUsage[0],
		MemoryTotal: int64(memInfo.Total),
		MemoryUsed:  int64(memInfo.Used),
		DiskTotal:   int64(diskInfo.Total),
		DiskUsed:    int64(diskInfo.Used),
		DiskFree:    int64(diskInfo.Free),
		NetworkIn:   int64(netStats[0].BytesRecv),
		NetworkOut:  int64(netStats[0].BytesSent),
		Uptime:      int64(hostInfo.Uptime),
	}

	return metrics, nil
}

func (m *Metrics) ToProto() *pb.SystemMetrics {
	metrics := &pb.SystemMetrics{
		CpuUsage:        float32(m.CPUUsage),
		MemoryUsed:      m.MemoryUsed,
		MemoryTotal:     m.MemoryTotal,
		DiskUsage:       float32(float64(m.DiskUsed) / float64(m.DiskTotal) * 100),
		NetworkBytesIn:  m.NetworkIn,
		NetworkBytesOut: m.NetworkOut,
	}

	fmt.Printf("Converting system metrics to proto: %+v\n", metrics)
	return metrics
}
