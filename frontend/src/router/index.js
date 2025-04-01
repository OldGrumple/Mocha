import { createRouter, createWebHistory } from 'vue-router'
import ServerList from '../views/ServersView.vue'
import ServerCreate from '../views/ServerCreate.vue'
import ServerConfig from '../views/ServerConfig.vue'
import MinecraftCacheManager from '../components/MinecraftCacheManager.vue'
import ServerDetail from '../views/ServerDetail.vue'

const routes = [
  {
    path: '/',
    redirect: '/servers'
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
    name: 'server-detail',
    component: ServerDetail
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
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router 