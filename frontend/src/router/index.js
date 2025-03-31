import { createRouter, createWebHistory } from 'vue-router'
import NodesView from '../views/NodesView.vue'
import ServersView from '../views/ServersView.vue'

const routes = [
  {
    path: '/',
    redirect: '/nodes'
  },
  {
    path: '/nodes',
    name: 'nodes',
    component: NodesView
  },
  {
    path: '/servers',
    name: 'servers',
    component: ServersView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 