package metrics

import (
	"fmt"
	"runtime"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type Collector struct {
	lastNetStats     []net.IOCountersStat
	lastNetStatsTime time.Time
}

func NewCollector() *Collector {
	return &Collector{
		lastNetStats:     nil,
		lastNetStatsTime: time.Now(),
	}
}

func (c *Collector) GetOS() string {
	return runtime.GOOS
}

func (c *Collector) GetCPUCores() int {
	return runtime.NumCPU()
}

func (c *Collector) GetCPUUsage() float64 {
	percent, err := cpu.Percent(time.Second, false)
	if err != nil || len(percent) == 0 {
		fmt.Printf("Error getting CPU usage: %v\n", err)
		return 0.0
	}
	fmt.Printf("CPU Usage: %f\n", percent[0])
	return percent[0]
}

func (c *Collector) GetTotalMemory() int64 {
	v, err := mem.VirtualMemory()
	if err != nil {
		fmt.Printf("Error getting total memory: %v\n", err)
		return 0
	}
	fmt.Printf("Total Memory: %d\n", v.Total)
	return int64(v.Total)
}

func (c *Collector) GetUsedMemory() int64 {
	v, err := mem.VirtualMemory()
	if err != nil {
		fmt.Printf("Error getting used memory: %v\n", err)
		return 0
	}
	fmt.Printf("Used Memory: %d\n", v.Used)
	return int64(v.Used)
}

func (c *Collector) GetDiskUsage() float64 {
	parts, err := disk.Partitions(false)
	if err != nil || len(parts) == 0 {
		fmt.Printf("Error getting disk partitions: %v\n", err)
		return 0.0
	}

	usage, err := disk.Usage(parts[0].Mountpoint)
	if err != nil {
		fmt.Printf("Error getting disk usage: %v\n", err)
		return 0.0
	}
	fmt.Printf("Disk Usage: %f\n", usage.UsedPercent)
	return usage.UsedPercent
}

func (c *Collector) GetNetworkBytesIn() int64 {
	stats, err := net.IOCounters(false)
	if err != nil || len(stats) == 0 {
		return 0
	}

	if c.lastNetStats == nil {
		c.lastNetStats = stats
		c.lastNetStatsTime = time.Now()
		return 0
	}

	bytesIn := stats[0].BytesRecv - c.lastNetStats[0].BytesRecv
	c.lastNetStats = stats
	c.lastNetStatsTime = time.Now()
	return int64(bytesIn)
}

func (c *Collector) GetNetworkBytesOut() int64 {
	stats, err := net.IOCounters(false)
	if err != nil || len(stats) == 0 {
		return 0
	}

	if c.lastNetStats == nil {
		c.lastNetStats = stats
		c.lastNetStatsTime = time.Now()
		return 0
	}

	bytesOut := stats[0].BytesSent - c.lastNetStats[0].BytesSent
	c.lastNetStats = stats
	c.lastNetStatsTime = time.Now()
	return int64(bytesOut)
}
