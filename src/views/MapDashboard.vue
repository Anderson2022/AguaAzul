<script setup>
import { computed, onMounted, ref } from 'vue'
import { geoIdentity, geoPath } from 'd3-geo'
import {
  ArrowLeft,
  ChartNoAxesCombined,
  Filter,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  Users
} from 'lucide-vue-next'

const password = ref(sessionStorage.getItem('az_token') || '')
const leads = ref([])
const mapItems = ref([])
const loading = ref(true)
const error = ref('')
const period = ref('all')
const source = ref('all')
const stage = ref('all')
const selected = ref(null)
const hovered = ref(null)

const normalize = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
const percentage = (value, total) => (total ? `${Math.round((value / total) * 100)}%` : '0%')

const sources = computed(() =>
  [...new Set(leads.value.map((lead) => lead.source).filter(Boolean))].sort()
)
const filtered = computed(() => {
  const cutoff = period.value === 'all' ? 0 : Date.now() - Number(period.value) * 86400000
  return leads.value.filter((lead) => {
    const inPeriod = !cutoff || new Date(lead.firstSeen).getTime() >= cutoff
    const inSource = source.value === 'all' || lead.source === source.value
    const inStage = stage.value === 'all' || lead.status === stage.value
    return inPeriod && inSource && inStage
  })
})
const leadCity = (lead) => {
  const estimated = normalize(lead.geoCity)
  const invalidEstimated = !estimated || ['ambiente local', 'nao identificada'].includes(estimated)
  return invalidEstimated ? lead.city : lead.geoCity
}
const cityCounts = computed(() =>
  filtered.value.reduce((counts, lead) => {
    const city = normalize(leadCity(lead))
    if (city) counts[city] = (counts[city] || 0) + 1
    return counts
  }, {})
)
const unlocatedCount = computed(
  () => filtered.value.filter((lead) => !normalize(leadCity(lead))).length
)
const rankedCities = computed(() =>
  mapItems.value
    .map((item) => ({ name: item.name, count: cityCounts.value[normalize(item.name)] || 0 }))
    .filter((item) => item.count)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
)
const maxCount = computed(() => Math.max(1, ...Object.values(cityCounts.value)))
const cityCount = (name) => cityCounts.value[normalize(name)] || 0
const color = (name) => {
  const count = cityCount(name)
  if (!count) return '#dcebed'
  const strength = count / maxCount.value
  return strength > 0.75
    ? '#006f94'
    : strength > 0.45
      ? '#009fc5'
      : strength > 0.2
        ? '#54c9dc'
        : '#a7e3eb'
}
const mapTransform = computed(() => {
  if (!selected.value) return 'translate(0 0) scale(1)'
  const [x, y] = selected.value.centroid
  return `translate(400 360) scale(2.35) translate(${-x} ${-y})`
})

function selectCity(item) {
  selected.value = selected.value?.name === item.name ? null : item
}

async function load() {
  if (!password.value) {
    location.href = '/painel-azul'
    return
  }
  try {
    const headers = { Authorization: `Bearer ${password.value}` }
    const [leadResponse, mapResponse] = await Promise.all([
      fetch('/api/admin/leads', { headers }),
      fetch('/api/admin/map/mt', { headers })
    ])
    if (leadResponse.status === 401) {
      sessionStorage.removeItem('az_token')
      location.href = '/painel-azul'
      return
    }
    if (!leadResponse.ok || !mapResponse.ok)
      throw new Error('Não foi possível carregar os dados do mapa.')
    leads.value = await leadResponse.json()
    const geojson = await mapResponse.json()
    // A malha simplificada do IBGE usa anéis com orientação que uma projeção
    // esférica interpreta como o complemento do polígono. Como o mapa mostra
    // somente Mato Grosso, uma projeção cartesiana preserva corretamente os municípios.
    const projection = geoIdentity().reflectY(true).fitSize([760, 680], geojson)
    const path = geoPath(projection)
    mapItems.value = geojson.features.map((feature) => ({
      name: feature.properties?.name || feature.properties?.nome || 'Município',
      path: path(feature),
      centroid: path.centroid(feature)
    }))
  } catch (cause) {
    error.value = cause.message
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="dashboard map-dashboard">
    <aside>
      <img src="/images/logo.png" />
      <router-link to="/painel-azul"><Users /> Oportunidades</router-link>
      <div class="side-active"><MapIcon /> Mapa</div>
      <router-link to="/painel-azul/controle"><ChartNoAxesCombined /> Controle</router-link>
      <a href="/"><ArrowLeft /> Ver site</a>
    </aside>
    <main>
      <header>
        <div>
          <small>INTELIGÊNCIA GEOGRÁFICA</small>
          <h1>Mapa de oportunidades</h1>
        </div>
        <span>Mato Grosso <i></i></span>
      </header>

      <section class="map-filters">
        <div class="filter-title">
          <Filter /><span><small>FILTROS DO MAPA</small><b>Refine os resultados</b></span>
        </div>
        <label
          >Período<select v-model="period">
            <option value="all">Todo o período</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select></label
        >
        <label
          >Origem<select v-model="source">
            <option value="all">Todos os canais</option>
            <option v-for="item in sources" :key="item">{{ item }}</option>
          </select></label
        >
        <label
          >Etapa<select v-model="stage">
            <option value="all">Todas as etapas</option>
            <option>Novo</option>
            <option>Contato solicitado</option>
            <option>Em atendimento</option>
            <option>Proposta enviada</option>
            <option>Convertido</option>
            <option>Descartado</option>
          </select></label
        >
      </section>

      <section class="map-layout">
        <article class="map-card">
          <div class="map-card-head">
            <div>
              <small>DISTRIBUIÇÃO DE PÚBLICO</small>
              <h2>{{ filtered.length }} pessoas no filtro atual</h2>
            </div>
            <button v-if="selected" @click="selected = null">
              <RotateCcw /> Ver estado inteiro
            </button>
          </div>
          <div class="mt-map-wrap">
            <div v-if="loading" class="map-message">Carregando mapa do IBGE...</div>
            <div v-else-if="error" class="map-message error">{{ error }}</div>
            <svg
              v-else
              class="mt-map"
              viewBox="0 0 800 720"
              role="img"
              aria-label="Mapa de Mato Grosso por municípios"
            >
              <g :transform="mapTransform">
                <path
                  v-for="item in mapItems"
                  :key="item.name"
                  :d="item.path"
                  :fill="color(item.name)"
                  :class="{ selected: selected?.name === item.name }"
                  @mouseenter="hovered = item"
                  @mouseleave="hovered = null"
                  @click="selectCity(item)"
                />
                <g
                  v-for="item in mapItems.filter((city) => cityCount(city.name))"
                  :key="`point-${item.name}`"
                  class="map-point"
                  :transform="`translate(${item.centroid[0]} ${item.centroid[1]})`"
                  @click="selectCity(item)"
                >
                  <text class="map-person-emoji" x="-7" y="4">👷</text>
                  <text class="map-count" x="17" y="3">{{ cityCount(item.name) }}</text>
                  <text class="map-city-label" x="-3" y="19">
                    {{ item.name }} · {{ cityCount(item.name) }} pessoa(s)
                  </text>
                </g>
              </g>
              <g
                v-if="unlocatedCount && !selected"
                class="map-point pending-map-point"
                transform="translate(405 355)"
              >
                <circle r="35" />
                <text class="map-person-emoji" x="-20" y="5">👷</text>
                <text class="map-count" x="15" y="4">{{ unlocatedCount }}</text>
                <text class="map-city-label" x="-48" y="51">
                  Localização pendente · {{ unlocatedCount }} pessoa(s)
                </text>
              </g>
            </svg>
            <div v-if="hovered" class="map-tooltip">
              <b>{{ hovered.name }}</b
              ><span>{{ cityCount(hovered.name) }} pessoa(s)</span>
            </div>
          </div>
          <div class="map-legend">
            <span>Menor interesse</span><i></i><i></i><i></i><i></i><span>Maior interesse</span>
          </div>
        </article>

        <section class="map-ranking">
          <header>
            <MapPin />
            <div>
              <small>DESTAQUES</small>
              <h2>Principais cidades</h2>
            </div>
          </header>
          <div v-for="(city, index) in rankedCities" :key="city.name" class="rank-city">
            <b>0{{ index + 1 }}</b>
            <div>
              <strong>{{ city.name }}</strong
              ><span>{{ city.count }} pessoa(s)</span>
            </div>
            <em>{{ percentage(city.count, filtered.length) }}</em>
          </div>
          <div v-if="!rankedCities.length" class="map-message">
            Ainda não há localização identificada para este filtro.
          </div>
          <footer>
            <small>Localização estimada por IP</small>
            <p>Os dados representam cidade aproximada e podem variar em redes móveis ou VPN.</p>
          </footer>
        </section>
      </section>
    </main>
  </div>
</template>
