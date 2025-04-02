<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <router-link to="/nodes" class="text-blue-600 hover:text-blue-800 flex items-center">
        <svg 
          class="w-5 h-5 mr-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Nodes
      </router-link>
    </div>

    <div v-if="node" class="space-y-8">
      <!-- Node Header -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-3xl font-bold">{{ node.name }}</h1>
          <span :class="getStatusBadgeClass(node.status)">
            {{ node.status }}
          </span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p class="text-sm text-gray-600">Hostname</p>
            <p class="font-medium">{{ node.hostname }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Operating System</p>
            <p class="font-medium">{{ node.os }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Last Seen</p>
            <p class="font-medium">{{ formatTime(node.lastSeen) }}</p>
          </div>
        </div>
      </div>

      <!-- Java Status Card -->
      <JavaStatusCard :nodeId="node._id" />

      <!-- System Metrics -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- CPU Usage -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">CPU Usage</h2>
          <div class="relative h-48">
            <canvas id="cpuChart" ref="cpuChartRef"></canvas>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Current Usage</p>
              <p class="text-2xl font-bold">{{ metrics.cpuUsage.toFixed(2) }}%</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Cores</p>
              <p class="text-2xl font-bold">{{ node.metrics?.cpuCores || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <!-- Memory Usage -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Memory Usage</h2>
          <div class="relative h-48">
            <canvas id="memoryChart" ref="memoryChartRef"></canvas>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Used</p>
              <p class="text-2xl font-bold">{{ formatBytes(metrics.memoryUsed) }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Total</p>
              <p class="text-2xl font-bold">{{ formatBytes(node.memoryBytes) }}</p>
            </div>
          </div>
        </div>

        <!-- Disk Usage -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Disk Usage</h2>
          <div class="relative h-48">
            <canvas id="diskChart" ref="diskChartRef"></canvas>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Used</p>
              <p class="text-2xl font-bold">{{ formatBytes(metrics.diskUsage) }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Total</p>
              <p class="text-2xl font-bold">{{ formatBytes(node.memoryBytes) }}</p>
            </div>
          </div>
        </div>

        <!-- Network Usage -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Network Usage</h2>
          <div class="relative h-48">
            <canvas id="networkChart" ref="networkChartRef"></canvas>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Upload</p>
              <p class="text-2xl font-bold">{{ formatBytes(metrics.networkUpload) }}/s</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Download</p>
              <p class="text-2xl font-bold">{{ formatBytes(metrics.networkDownload) }}/s</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Security Management -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Security Management</h2>
        <NodeSecurityManager :nodeId="node._id" />
      </div>

      <!-- Running Servers -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Running Servers</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="server in runningServers" :key="server._id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ server.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ server.type }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ server.version }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getServerStatusBadgeClass(server.status)">
                    {{ server.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ server.players }}/{{ server.maxPlayers }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button @click="viewServer(server._id)" class="text-blue-600 hover:text-blue-900 mr-3">View</button>
                  <button @click="stopServer(server._id)" class="text-red-600 hover:text-red-900">Stop</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import Chart from 'chart.js/auto';
import NodeSecurityManager from '@/components/NodeSecurityManager.vue';
import JavaStatusCard from '../components/JavaStatusCard.vue';

const route = useRoute();
const router = useRouter();
const node = ref(null);
const metrics = ref({
  cpuUsage: 0,
  memoryUsed: 0,
  memoryTotal: 0,
  diskUsage: 0,
  networkUpload: 0,
  networkDownload: 0
});

// Add refs for chart canvases
const cpuChartRef = ref(null);
const memoryChartRef = ref(null);
const diskChartRef = ref(null);
const networkChartRef = ref(null);

const runningServers = ref([]);
let pollInterval;
let charts = {
  cpu: null,
  memory: null,
  disk: null,
  network: null
};

const destroyCharts = () => {
  Object.values(charts).forEach(chart => {
    if (chart) {
      chart.destroy();
    }
  });
  charts = {
    cpu: null,
    memory: null,
    disk: null,
    network: null
  };
};

const initializeCharts = () => {
  // Destroy existing charts first
  destroyCharts();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300 // Add a small animation duration for smoother updates
    },
    scales: {
      y: {
        beginAtZero: true
      },
      x: {
        display: true,
        ticks: {
          maxTicksLimit: 10,
          maxRotation: 0 // Keep labels horizontal
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    elements: {
      line: {
        tension: 0.3
      },
      point: {
        radius: 3, // Show points since we're updating less frequently
        hoverRadius: 5
      }
    }
  };

  // CPU Chart
  if (cpuChartRef.value) {
    charts.cpu = new Chart(cpuChartRef.value.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'CPU Usage (%)',
          data: [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true
        }]
      },
      options: {
        ...chartOptions,
        scales: {
          ...chartOptions.scales,
          y: {
            ...chartOptions.scales.y,
            max: 100,
            ticks: {
              callback: value => value + '%'
            }
          }
        }
      }
    });
  }

  // Memory Chart
  if (memoryChartRef.value) {
    charts.memory = new Chart(memoryChartRef.value.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Memory Usage (GB)',
          data: [],
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true
        }]
      },
      options: {
        ...chartOptions,
        scales: {
          ...chartOptions.scales,
          y: {
            ...chartOptions.scales.y,
            ticks: {
              callback: value => value.toFixed(1) + ' GB'
            }
          }
        }
      }
    });
  }

  // Disk Chart
  if (diskChartRef.value) {
    charts.disk = new Chart(diskChartRef.value.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Disk Usage (%)',
          data: [],
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true
        }]
      },
      options: {
        ...chartOptions,
        scales: {
          ...chartOptions.scales,
          y: {
            ...chartOptions.scales.y,
            max: 100,
            ticks: {
              callback: value => value + '%'
            }
          }
        }
      }
    });
  }

  // Network Chart
  if (networkChartRef.value) {
    charts.network = new Chart(networkChartRef.value.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Upload (MB/s)',
            data: [],
            borderColor: 'rgb(139, 92, 246)',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true
          },
          {
            label: 'Download (MB/s)',
            data: [],
            borderColor: 'rgb(236, 72, 153)',
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            fill: true
          }
        ]
      },
      options: {
        ...chartOptions,
        scales: {
          ...chartOptions.scales,
          y: {
            ...chartOptions.scales.y,
            ticks: {
              callback: value => value.toFixed(1) + ' MB/s'
            }
          }
        }
      }
    });
  }
};

const fetchNodeDetails = async () => {
  try {
    const response = await axios.get(`/api/nodes/${route.params.id}`);
    node.value = response.data.node;
    // Update metrics from node details
    metrics.value = {
      cpuUsage: node.value.metrics.cpuUsage,
      memoryUsed: node.value.metrics.memoryUsed,
      memoryTotal: node.value.metrics.memoryTotal,
      diskUsage: node.value.metrics.diskUsage,
      networkUpload: node.value.metrics.networkBytesOut,
      networkDownload: node.value.metrics.networkBytesIn
    };
    
    // Only initialize charts if they haven't been created yet
    if (!charts.cpu) {
      initializeCharts();
    }
    updateCharts();
  } catch (error) {
    console.error('Failed to fetch node details:', error);
  }
};

const fetchRunningServers = async () => {
  try {
    const response = await axios.get(`/api/nodes/${route.params.id}/servers`);
    runningServers.value = response.data.servers;
  } catch (error) {
    console.error('Failed to fetch running servers:', error);
  }
};

const getStatusBadgeClass = (status) => {
  const baseClasses = 'px-2 py-1 rounded-full text-sm font-medium';
  switch (status) {
    case 'online':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'offline':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'error':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const getServerStatusBadgeClass = (status) => {
  const baseClasses = 'px-2 py-1 rounded-full text-sm font-medium';
  switch (status) {
    case 'running':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'stopped':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'starting':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (timestamp) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const updateCharts = () => {
  if (!charts.cpu || !charts.memory || !charts.disk || !charts.network) {
    return;
  }

  const timestamp = new Date().toLocaleTimeString();
  const maxDataPoints = 20; // Keep 20 data points (10 minute window with 30s updates)
  
  // Update CPU Chart
  if (charts.cpu) {
    charts.cpu.data.labels.push(timestamp);
    charts.cpu.data.datasets[0].data.push(metrics.value.cpuUsage);
    if (charts.cpu.data.labels.length > maxDataPoints) {
      charts.cpu.data.labels.shift();
      charts.cpu.data.datasets[0].data.shift();
    }
    charts.cpu.update();  // Allow animation since we're updating less frequently
  }

  // Update Memory Chart
  if (charts.memory) {
    const memoryGB = metrics.value.memoryUsed / (1024 * 1024 * 1024);
    charts.memory.data.labels.push(timestamp);
    charts.memory.data.datasets[0].data.push(memoryGB);
    if (charts.memory.data.labels.length > maxDataPoints) {
      charts.memory.data.labels.shift();
      charts.memory.data.datasets[0].data.shift();
    }
    charts.memory.update();
  }

  // Update Disk Chart
  if (charts.disk) {
    charts.disk.data.labels.push(timestamp);
    charts.disk.data.datasets[0].data.push(metrics.value.diskUsage);
    if (charts.disk.data.labels.length > maxDataPoints) {
      charts.disk.data.labels.shift();
      charts.disk.data.datasets[0].data.shift();
    }
    charts.disk.update();
  }

  // Update Network Chart
  if (charts.network) {
    const uploadMB = metrics.value.networkUpload / (1024 * 1024);
    const downloadMB = metrics.value.networkDownload / (1024 * 1024);
    
    charts.network.data.labels.push(timestamp);
    charts.network.data.datasets[0].data.push(uploadMB);
    charts.network.data.datasets[1].data.push(downloadMB);
    
    if (charts.network.data.labels.length > maxDataPoints) {
      charts.network.data.labels.shift();
      charts.network.data.datasets[0].data.shift();
      charts.network.data.datasets[1].data.shift();
    }
    charts.network.update();
  }
};

const viewServer = (serverId) => {
  router.push(`/servers/${serverId}`);
};

const stopServer = async (serverId) => {
  try {
    await axios.post(`/api/servers/${serverId}/stop`);
    await fetchRunningServers();
  } catch (error) {
    console.error('Failed to stop server:', error);
  }
};

onMounted(() => {
  fetchNodeDetails();
  fetchRunningServers();
  
  // Poll for updates every 30 seconds
  pollInterval = setInterval(() => {
    fetchNodeDetails();
    fetchRunningServers();
  }, 30000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  // Clean up charts
  destroyCharts();
});
</script> 