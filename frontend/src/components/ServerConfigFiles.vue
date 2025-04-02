<template>
  <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
    <h2 class="text-lg font-semibold mb-4">Server Configuration Files</h2>
    
    <!-- Tabs for different config files -->
    <div class="mb-4">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Content for each tab -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>

    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline"> {{ error }}</span>
    </div>

    <div v-else>
      <!-- Banned IPs -->
      <div v-if="activeTab === 'banned-ips'" class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-md font-medium">Banned IP Addresses</h3>
          <button
            @click="showAddBanModal = true"
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
          >
            Add IP Ban
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="ban in bannedIPs" :key="ban.ip">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ ban.ip }}</td>
                <td class="px-6 py-4 text-sm text-gray-500">{{ ban.reason }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ ban.expires ? new Date(ban.expires).toLocaleString() : 'Never' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    @click="removeBan('banned-ips', ban.ip)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Banned Players -->
      <div v-if="activeTab === 'banned-players'" class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-md font-medium">Banned Players</h3>
          <button
            @click="showAddBanModal = true"
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
          >
            Add Player Ban
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="ban in bannedPlayers" :key="ban.name">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ ban.name }}</td>
                <td class="px-6 py-4 text-sm text-gray-500">{{ ban.reason }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ ban.expires ? new Date(ban.expires).toLocaleString() : 'Never' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    @click="removeBan('banned-players', ban.name)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Ops -->
      <div v-if="activeTab === 'ops'" class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-md font-medium">Server Operators</h3>
          <button
            @click="showAddOpModal = true"
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
          >
            Add Operator
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="op in ops" :key="op.name">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ op.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ op.level }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    @click="removeOp(op.name)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Whitelist -->
      <div v-if="activeTab === 'whitelist'" class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-md font-medium">Whitelisted Players</h3>
          <button
            @click="showAddWhitelistModal = true"
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
          >
            Add Player
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="player in whitelist" :key="player.name">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ player.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    @click="removeFromWhitelist(player.name)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Ban Modal -->
    <div v-if="showAddBanModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Add {{ activeTab === 'banned-ips' ? 'IP' : 'Player' }} Ban</h3>
          <div class="mt-2">
            <input
              v-model="newBan.target"
              :type="activeTab === 'banned-ips' ? 'text' : 'text'"
              :placeholder="activeTab === 'banned-ips' ? 'IP Address' : 'Player Name'"
              class="w-full px-3 py-2 border rounded-md mb-2"
            />
            <textarea
              v-model="newBan.reason"
              placeholder="Reason for ban"
              class="w-full px-3 py-2 border rounded-md mb-2"
            ></textarea>
            <input
              v-model="newBan.expires"
              type="datetime-local"
              class="w-full px-3 py-2 border rounded-md mb-2"
            />
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button
              @click="showAddBanModal = false"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              @click="addBan"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add Ban
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Op Modal -->
    <div v-if="showAddOpModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Add Operator</h3>
          <div class="mt-2">
            <input
              v-model="newOp.name"
              type="text"
              placeholder="Player Name"
              class="w-full px-3 py-2 border rounded-md mb-2"
            />
            <input
              v-model="newOp.level"
              type="number"
              min="1"
              max="4"
              placeholder="Op Level (1-4)"
              class="w-full px-3 py-2 border rounded-md mb-2"
            />
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button
              @click="showAddOpModal = false"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              @click="addOp"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add Operator
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Whitelist Modal -->
    <div v-if="showAddWhitelistModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Add Player to Whitelist</h3>
          <div class="mt-2">
            <input
              v-model="newWhitelistPlayer"
              type="text"
              placeholder="Player Name"
              class="w-full px-3 py-2 border rounded-md mb-2"
            />
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button
              @click="showAddWhitelistModal = false"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              @click="addToWhitelist"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add Player
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'ServerConfigFiles',
  props: {
    serverId: {
      type: String,
      required: true
    }
  },

  setup(props) {
    const tabs = [
      { id: 'banned-ips', name: 'Banned IPs' },
      { id: 'banned-players', name: 'Banned Players' },
      { id: 'ops', name: 'Operators' },
      { id: 'whitelist', name: 'Whitelist' }
    ]

    const activeTab = ref('banned-ips')
    const loading = ref(false)
    const error = ref(null)
    const bannedIPs = ref([])
    const bannedPlayers = ref([])
    const ops = ref([])
    const whitelist = ref([])

    // Modal states
    const showAddBanModal = ref(false)
    const showAddOpModal = ref(false)
    const showAddWhitelistModal = ref(false)

    // Form data
    const newBan = ref({
      target: '',
      reason: '',
      expires: ''
    })
    const newOp = ref({
      name: '',
      level: 4
    })
    const newWhitelistPlayer = ref('')

    const fetchConfigFile = async (file) => {
      try {
        loading.value = true
        error.value = null
        const response = await axios.get(`/api/servers/${props.serverId}/config/${file}`)
        switch (file) {
          case 'banned-ips.json':
            bannedIPs.value = response.data
            break
          case 'banned-players.json':
            bannedPlayers.value = response.data
            break
          case 'ops.json':
            ops.value = response.data
            break
          case 'whitelist.json':
            whitelist.value = response.data
            break
        }
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to fetch configuration'
        console.error(`Error fetching ${file}:`, err)
      } finally {
        loading.value = false
      }
    }

    const addBan = async () => {
      try {
        const file = activeTab.value === 'banned-ips' ? 'banned-ips.json' : 'banned-players.json'
        const banData = {
          target: newBan.value.target,
          reason: newBan.value.reason,
          expires: newBan.value.expires ? new Date(newBan.value.expires).getTime() : null
        }
        await axios.post(`/api/servers/${props.serverId}/config/${file}`, banData)
        await fetchConfigFile(file)
        showAddBanModal.value = false
        newBan.value = { target: '', reason: '', expires: '' }
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to add ban'
        console.error('Error adding ban:', err)
      }
    }

    const removeBan = async (type, target) => {
      try {
        const file = type === 'banned-ips' ? 'banned-ips.json' : 'banned-players.json'
        await axios.delete(`/api/servers/${props.serverId}/config/${file}/${target}`)
        await fetchConfigFile(file)
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to remove ban'
        console.error('Error removing ban:', err)
      }
    }

    const addOp = async () => {
      try {
        await axios.post(`/api/servers/${props.serverId}/config/ops.json`, newOp.value)
        await fetchConfigFile('ops.json')
        showAddOpModal.value = false
        newOp.value = { name: '', level: 4 }
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to add operator'
        console.error('Error adding operator:', err)
      }
    }

    const removeOp = async (name) => {
      try {
        await axios.delete(`/api/servers/${props.serverId}/config/ops.json/${name}`)
        await fetchConfigFile('ops.json')
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to remove operator'
        console.error('Error removing operator:', err)
      }
    }

    const addToWhitelist = async () => {
      try {
        await axios.post(`/api/servers/${props.serverId}/config/whitelist.json`, {
          name: newWhitelistPlayer.value
        })
        await fetchConfigFile('whitelist.json')
        showAddWhitelistModal.value = false
        newWhitelistPlayer.value = ''
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to add player to whitelist'
        console.error('Error adding player to whitelist:', err)
      }
    }

    const removeFromWhitelist = async (name) => {
      try {
        await axios.delete(`/api/servers/${props.serverId}/config/whitelist.json/${name}`)
        await fetchConfigFile('whitelist.json')
      } catch (err) {
        error.value = err.response?.data?.error || 'Failed to remove player from whitelist'
        console.error('Error removing player from whitelist:', err)
      }
    }

    onMounted(async () => {
      await Promise.all([
        fetchConfigFile('banned-ips.json'),
        fetchConfigFile('banned-players.json'),
        fetchConfigFile('ops.json'),
        fetchConfigFile('whitelist.json')
      ])
    })

    return {
      tabs,
      activeTab,
      loading,
      error,
      bannedIPs,
      bannedPlayers,
      ops,
      whitelist,
      showAddBanModal,
      showAddOpModal,
      showAddWhitelistModal,
      newBan,
      newOp,
      newWhitelistPlayer,
      addBan,
      removeBan,
      addOp,
      removeOp,
      addToWhitelist,
      removeFromWhitelist
    }
  }
}
</script> 