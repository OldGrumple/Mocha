<template>
  <div class="server-config">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">Server Configuration</h2>
        <router-link
          :to="`/servers/${serverId}`"
          class="text-indigo-600 hover:text-indigo-800"
        >
          Back to Server
        </router-link>
      </div>

      <ServerPropertiesEditor
        :server-id="serverId"
        @config-saved="handleConfigSaved"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ServerPropertiesEditor from '../components/ServerPropertiesEditor.vue'

const route = useRoute()
const router = useRouter()
const serverId = ref(route.params.id)

const handleConfigSaved = () => {
  router.push(`/servers/${serverId.value}`)
}
</script>

<style scoped>
.server-config {
  @apply p-6;
}
</style> 