import { createRouter, createWebHistory } from 'vue-router'
import ServerList from '../views/ServersView.vue'
import ServerCreate from '../views/ServerCreate.vue'
import ServerDetails from '../views/ServerDetails.vue'
import ServerConfig from '../views/ServerConfig.vue'
import MinecraftCacheManager from '../components/MinecraftCacheManager.vue'

const routes = [
  {
    path: '/',
    redirect: '/nodes'
  },
  {
    path: '/nodes',
    name: 'nodes',
    component: () => import('../views/NodesView.vue')
  },
  {
    path: '/nodes/:id',
    name: 'node-detail',
    component: () => import('../views/NodeDetail.vue')
  },
  {
    path: '/servers',
    name: 'servers',
    component: ServerList
  },
  {
    path: '/servers/create',
    name: 'server-create',
    component: ServerCreate
  },
  {
    path: '/servers/:id',
    name: 'server-details',
    component: ServerDetails
  },
  {
    path: '/servers/:id/config',
    name: 'server-config',
    component: ServerConfig
  },
  {
    path: '/minecraft/cache',
    name: 'minecraft-cache',
    component: MinecraftCacheManager
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 