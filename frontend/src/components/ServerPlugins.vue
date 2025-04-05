<template>
  <div class="space-y-6">
    <!-- Plugin Search and Filter -->
    <div class="bg-white shadow rounded-lg p-4">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <label for="search" class="block text-sm font-medium text-gray-700">Search Plugins</label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <input
              type="text"
              id="search"
              v-model="searchQuery"
              @input="debounceSearch"
              class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Search by name or description"
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg 
                class="h-5 w-5 text-gray-400" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div class="w-full md:w-48">
          <label for="sort" class="block text-sm font-medium text-gray-700">Sort By</label>
          <select
            id="sort"
            v-model="sortBy"
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="-downloads">Most Downloaded</option>
            <option value="downloads">Least Downloaded</option>
            <option value="-rating">Highest Rated</option>
            <option value="rating">Lowest Rated</option>
            <option value="-updated">Recently Updated</option>
            <option value="updated">Oldest Updated</option>
            <option value="-name">Name (Z-A)</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500">Loading plugins...</p>
    </div>

    <!-- Plugin List -->
    <div v-else-if="filteredPlugins.length > 0" class="bg-white shadow overflow-hidden sm:rounded-md">
      <ul class="divide-y divide-gray-200">
        <li v-for="plugin in filteredPlugins" :key="plugin.id" class="px-4 py-4 sm:px-6">
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center">
                <h3 class="text-lg font-medium text-indigo-600 truncate">{{ plugin.name }}</h3>
                <span v-if="plugin.isInstalled" class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Installed
                </span>
              </div>
              <p class="mt-1 text-sm text-gray-500">{{ plugin.description }}</p>
              <div class="mt-2 flex items-center text-sm text-gray-500">
                <span class="mr-4">Version: {{ plugin.version }}</span>
                <span class="mr-4">Downloads: {{ plugin.downloads }}</span>
                <span class="flex items-center">
                  <svg 
                    class="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {{ plugin.rating.toFixed(1) }} ({{ plugin.ratingCount }} reviews)
                </span>
              </div>
            </div>
            <div class="ml-4 flex-shrink-0">
              <button
                v-if="!plugin.isInstalled"
                @click="installPlugin(plugin)"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                :disabled="isInstalling"
              >
                <svg 
                  v-if="isInstalling" 
                  class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    class="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    stroke-width="4"
                  ></circle>
                  <path 
                    class="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Install
              </button>
              <button
                v-else
                @click="uninstallPlugin(plugin)"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                :disabled="isUninstalling"
              >
                <svg 
                  v-if="isUninstalling" 
                  class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    class="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    stroke-width="4"
                  ></circle>
                  <path 
                    class="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Uninstall
              </button>
            </div>
          </div>
        </li>
      </ul>
      
      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            @click="nextPage"
            :disabled="currentPage >= totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing
              <span class="font-medium">{{ (currentPage - 1) * pageSize + 1 }}</span>
              to
              <span class="font-medium">{{ Math.min(currentPage * pageSize, totalItems) }}</span>
              of
              <span class="font-medium">{{ totalItems }}</span>
              results
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                @click="prevPage"
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span class="sr-only">Previous</span>
                <svg 
                  class="h-5 w-5" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor" 
                  aria-hidden="true"
                >
                  <path 
                    fill-rule="evenodd" 
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" 
                    clip-rule="evenodd" 
                  />
                </svg>
              </button>
              <button
                v-for="page in displayedPages"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  page === currentPage
                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                ]"
              >
                {{ page }}
              </button>
              <button
                @click="nextPage"
                :disabled="currentPage >= totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span class="sr-only">Next</span>
                <svg 
                  class="h-5 w-5" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor" 
                  aria-hidden="true"
                >
                  <path 
                    fill-rule="evenodd" 
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                    clip-rule="evenodd" 
                  />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- No Results -->
    <div v-else class="text-center py-12">
      <svg 
        class="mx-auto h-12 w-12 text-gray-400" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No plugins found</h3>
      <p class="mt-1 text-sm text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
    </div>

    <!-- Installed Plugins Section -->
    <div class="bg-white shadow overflow-hidden sm:rounded-lg mt-8">
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">Installed Plugins</h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500">Manage plugins currently installed on your server.</p>
      </div>
      <div class="border-t border-gray-200">
        <ul class="divide-y divide-gray-200">
          <li v-for="plugin in installedPlugins" :key="plugin.id" class="px-4 py-4 sm:px-6">
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <h4 class="text-lg font-medium text-indigo-600 truncate">{{ plugin.name }}</h4>
                <p class="mt-1 text-sm text-gray-500">Version: {{ plugin.version }}</p>
                <div class="mt-2 flex items-center text-sm text-gray-500">
                  <span class="flex items-center">
                    <svg 
                      class="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {{ plugin.rating.toFixed(1) }} ({{ plugin.ratingCount }} reviews)
                  </span>
                </div>
              </div>
              <div class="ml-4 flex-shrink-0">
                <button
                  @click="uninstallPlugin(plugin)"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  :disabled="isUninstalling"
                >
                  <svg 
                    v-if="isUninstalling" 
                    class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      class="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      stroke-width="4"
                    ></circle>
                    <path 
                      class="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uninstall
                </button>
              </div>
            </div>
          </li>
          <li v-if="installedPlugins.length === 0" class="px-4 py-4 sm:px-6 text-center text-gray-500">
            No plugins installed yet.
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
/* eslint-disable no-undef */
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
  serverId: {
    type: String,
    required: true
  }
})

// State
const plugins = ref([])
const installedPlugins = ref([])
const searchQuery = ref('')
const sortBy = ref('downloads')
const isInstalling = ref(false)
const isUninstalling = ref(false)
const isLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const totalPages = ref(1)
const searchTimeout = ref(null)

// Computed
const filteredPlugins = computed(() => {
  let result = [...plugins.value]
  
  // Sort by selected criteria
  const [field, direction] = sortBy.value.startsWith('-') 
    ? [sortBy.value.substring(1), 'desc'] 
    : [sortBy.value, 'asc']

  result.sort((a, b) => {
    let comparison = 0
    
    switch (field) {
      case 'downloads':
        comparison = (a.downloads || 0) - (b.downloads || 0)
        break
      case 'rating':
        comparison = ((a.rating?.average || 0) - (b.rating?.average || 0))
        break
      case 'updated':
        const dateA = a.updateDate ? new Date(a.updateDate) : new Date(0)
        const dateB = b.updateDate ? new Date(b.updateDate) : new Date(0)
        comparison = dateA - dateB
        break
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
        break
    }
    
    return direction === 'desc' ? -comparison : comparison
  })
  
  return result
})

// Computed for pagination
const displayedPages = computed(() => {
  const pages = []
  const maxDisplayed = 5
  
  if (totalPages.value <= maxDisplayed) {
    // Show all pages if there are fewer than maxDisplayed
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)
    
    // Calculate start and end of displayed pages
    let start = Math.max(2, currentPage.value - 1)
    let end = Math.min(totalPages.value - 1, currentPage.value + 1)
    
    // Adjust if we're near the beginning or end
    if (currentPage.value <= 2) {
      end = 4
    } else if (currentPage.value >= totalPages.value - 1) {
      start = totalPages.value - 3
    }
    
    // Add ellipsis if needed
    if (start > 2) {
      pages.push('...')
    }
    
    // Add middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    // Add ellipsis if needed
    if (end < totalPages.value - 1) {
      pages.push('...')
    }
    
    // Always show last page
    pages.push(totalPages.value)
  }
  
  return pages
})

// Methods
const fetchPlugins = async () => {
  try {
    isLoading.value = true;
    
    // Build the API URL with query parameters
    const params = new URLSearchParams({
      page: currentPage.value,
      size: pageSize.value,
      sort: sortBy.value, // Pass the sort parameter directly
      fields: 'id,name,description,version,downloads,rating,author,icon,updateDate'
    });
    
    let endpoint;
    if (searchQuery.value.trim()) {
      endpoint = `/api/servers/${props.serverId}/plugins/available?search=${encodeURIComponent(searchQuery.value.trim())}&${params.toString()}`;
    } else {
      endpoint = `/api/servers/${props.serverId}/plugins/available?${params.toString()}`;
    }
    
    const response = await axios.get(endpoint);
    
    plugins.value = response.data.plugins.map(plugin => ({
      ...plugin,
      version: plugin.version?.id || 'Unknown',
      versionUuid: plugin.version?.uuid || null,
      rating: plugin.rating?.average || 0,
      ratingCount: plugin.rating?.count || 0,
      downloads: parseInt(plugin.downloads) || 0
    }));
    
    if (response.data.total) {
      totalItems.value = response.data.total;
      totalPages.value = Math.ceil(totalItems.value / pageSize.value);
    }
  } catch (error) {
    console.error('Error fetching plugins:', error);
    plugins.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchInstalledPlugins = async () => {
  try {
    const response = await axios.get(`/api/servers/${props.serverId}/plugins`);
    installedPlugins.value = response.data.plugins.map(plugin => ({
      ...plugin,
      version: plugin.version?.id || plugin.version || 'Unknown',
      versionUuid: plugin.version?.uuid || null,
      rating: plugin.rating?.average || 0,
      ratingCount: plugin.rating?.count || 0
    }));
    
    // Update the isInstalled flag in the plugins list
    plugins.value.forEach(plugin => {
      plugin.isInstalled = installedPlugins.value.some(installed => installed.id === plugin.id);
    });
  } catch (error) {
    console.error('Error fetching installed plugins:', error);
    installedPlugins.value = [];
  }
};

const installPlugin = async (plugin) => {
  try {
    isInstalling.value = true
    await axios.post(`/api/servers/${props.serverId}/plugins`, {
      pluginId: plugin.id,
      version: plugin.version
    })
    
    // Update the plugin's installed status
    plugin.isInstalled = true
    
    // Add to installed plugins list
    installedPlugins.value.push({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version
    })
    
    // Show success message
    alert(`Plugin ${plugin.name} installed successfully!`)
  } catch (error) {
    console.error('Error installing plugin:', error)
    alert(`Failed to install plugin: ${error.response?.data?.error || error.message}`)
  } finally {
    isInstalling.value = false
  }
}

const uninstallPlugin = async (plugin) => {
  try {
    isUninstalling.value = true
    await axios.delete(`/api/servers/${props.serverId}/plugins/${plugin.id}`)
    
    // Update the plugin's installed status
    plugin.isInstalled = false
    
    // Remove from installed plugins list
    installedPlugins.value = installedPlugins.value.filter(p => p.id !== plugin.id)
    
    // Show success message
    alert(`Plugin ${plugin.name} uninstalled successfully!`)
  } catch (error) {
    console.error('Error uninstalling plugin:', error)
    alert(`Failed to uninstall plugin: ${error.response?.data?.error || error.message}`)
  } finally {
    isUninstalling.value = false
  }
}

// Pagination methods
const goToPage = (page) => {
  if (page === '...') return
  currentPage.value = page
  fetchPlugins()
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchPlugins()
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchPlugins()
  }
}

// Debounce search
const debounceSearch = () => {
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    currentPage.value = 1
    fetchPlugins()
  }, 500)
}

// Watch for sort changes
watch(sortBy, () => {
  currentPage.value = 1; // Reset to first page when sort changes
  fetchPlugins();
})

// Lifecycle hooks
onMounted(() => {
  fetchPlugins()
  fetchInstalledPlugins()
})
</script> 