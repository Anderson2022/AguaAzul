import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Dashboard from './views/Dashboard.vue'
import MapDashboard from './views/MapDashboard.vue'
import ControlDashboard from './views/ControlDashboard.vue'
import NewCampaign from './views/NewCampaign.vue'
import { track } from './tracking'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/painel-azul', component: Dashboard },
    { path: '/painel-azul/mapa', component: MapDashboard },
    { path: '/painel-azul/controle', component: ControlDashboard },
    { path: '/painel-azul/campanha/nova', component: NewCampaign }
  ]
})

router.afterEach((to) => {
  if (!to.path.startsWith('/painel-azul')) track('page_view')
})
createApp(App).use(router).mount('#app')
