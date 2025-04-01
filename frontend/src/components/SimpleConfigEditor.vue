<template>
  <div class="simple-config-editor">
    <!-- Basic Settings -->
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="maxPlayers" class="block text-sm font-medium text-gray-700">Max Players</label>
          <input
            type="number"
            id="maxPlayers"
            v-model="localConfig.maxPlayers"
            min="1"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            @change="updateConfig"
          />
        </div>
        <div>
          <label for="memory" class="block text-sm font-medium text-gray-700">Memory (GB)</label>
          <input
            type="number"
            id="memory"
            v-model="localConfig.memory"
            min="1"
            step="0.5"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            @change="updateConfig"
          />
        </div>
        <div>
          <label for="difficulty" class="block text-sm font-medium text-gray-700">Difficulty</label>
          <select
            id="difficulty"
            v-model="localConfig.difficulty"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            @change="updateConfig"
          >
            <option value="peaceful">Peaceful</option>
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label for="gameMode" class="block text-sm font-medium text-gray-700">Game Mode</label>
          <select
            id="gameMode"
            v-model="localConfig.gameMode"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            @change="updateConfig"
          >
            <option value="survival">Survival</option>
            <option value="creative">Creative</option>
            <option value="adventure">Adventure</option>
            <option value="spectator">Spectator</option>
          </select>
        </div>
      </div>

      <!-- Advanced Settings Toggle -->
      <div class="mt-4">
        <button
          type="button"
          @click="showAdvanced = !showAdvanced"
          class="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <span>{{ showAdvanced ? 'Hide' : 'Show' }} Advanced Settings</span>
          <svg
            class="w-5 h-5 ml-1"
            :class="{ 'transform rotate-180': showAdvanced }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <!-- Advanced Settings -->
      <div v-if="showAdvanced" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="port" class="block text-sm font-medium text-gray-700">Port</label>
          <input
            type="number"
            id="port"
            v-model="localConfig.port"
            min="1"
            max="65535"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            @change="updateConfig"
          />
        </div>
        <div>
          <label for="viewDistance" class="block text-sm font-medium text-gray-700">View Distance</label>
          <input
            type="number"
            id="viewDistance"
            v-model="localConfig.viewDistance"
            min="3"
            max="32"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            @change="updateConfig"
          />
        </div>
        <div>
          <label for="seed" class="block text-sm font-medium text-gray-700">World Seed</label>
          <input
            type="text"
            id="seed"
            v-model="localConfig.seed"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Leave empty for random"
            @change="updateConfig"
          />
        </div>
        <div>
          <label for="worldType" class="block text-sm font-medium text-gray-700">World Type</label>
          <select
            id="worldType"
            v-model="localConfig.worldType"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            @change="updateConfig"
          >
            <option value="default">Default</option>
            <option value="flat">Flat</option>
            <option value="large_biomes">Large Biomes</option>
            <option value="amplified">Amplified</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Generate Structures</label>
          <div class="mt-1">
            <label class="inline-flex items-center">
              <input
                type="checkbox"
                v-model="localConfig.generateStructures"
                class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                @change="updateConfig"
              />
              <span class="ml-2 text-sm text-gray-700">Enable structure generation</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const showAdvanced = ref(false)
const localConfig = ref({ ...props.modelValue })

// Watch for changes in props
watch(() => props.modelValue, (newValue) => {
  localConfig.value = { ...newValue }
}, { deep: true })

const updateConfig = () => {
  emit('update:modelValue', { ...localConfig.value })
}
</script>

<style scoped>
.simple-config-editor {
  @apply space-y-4;
}
</style> 