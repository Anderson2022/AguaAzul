<script setup>
import { computed, onMounted, ref } from 'vue'
import { geoIdentity, geoPath } from 'd3-geo'
import {
  ArrowLeft,
  Bold,
  Bot,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Italic,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Plus,
  PlusCircle,
  ShieldCheck,
  Smile,
  Sparkles,
  Target,
  Trash2,
  Users,
  Video,
  ZoomIn,
  ZoomOut
} from 'lucide-vue-next'

const password = ref(sessionStorage.getItem('az_token') || '')
const mode = ref('smart')
const creativePreview = ref('')
const adTextInput = ref(null)
const showEmojis = ref(false)
const analyzed = ref(false)
const integrations = ref([])
const previousLeads = ref([])
const suggestionApplied = ref(false)
const targetMapItems = ref([])
const targetMapSvg = ref(null)
const locationGroups = ref([{ id: 1, city: 'Cuiabá', state: 'MT', radius: 80 }])
const mapZoom = ref(1)
const mapPan = ref({ x: 0, y: 0 })
const mapDragging = ref(null)
const mapMoved = ref(false)
const form = ref({
  objective: 'Vender mais',
  product: '',
  price: 0,
  cost: 0,
  shipping: 0,
  fees: 0,
  dailyBudget: 100,
  monthlyGoal: 20,
  strategy: 'profit',
  audience: 'automatic',
  location: 'Mato Grosso',
  regionCity: 'Cuiabá',
  regionState: 'MT',
  regionRadius: 80,
  minimumAge: 25,
  maximumAge: 65,
  gender: 'Todos',
  interests: '',
  placements: ['Facebook', 'Instagram'],
  optimization: 'Conversões',
  bidStrategy: 'Menor custo',
  attribution: '7 dias após clique',
  remarketing: false,
  excludeCustomers: true,
  animation: 'none',
  text: '',
  title: ''
})

const money = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
const margin = computed(() =>
  Math.max(0, form.value.price - form.value.cost - form.value.shipping - form.value.fees)
)
const monthlyBudget = computed(() => form.value.dailyBudget * 30)
const targetCpa = computed(() =>
  form.value.monthlyGoal ? monthlyBudget.value / form.value.monthlyGoal : 0
)
const breakEvenCpa = computed(() => margin.value)
const minimumRoas = computed(() => (targetCpa.value ? form.value.price / targetCpa.value : 0))
const projectedProfit = computed(() => margin.value * form.value.monthlyGoal - monthlyBudget.value)
const viable = computed(
  () => margin.value > 0 && targetCpa.value > 0 && targetCpa.value <= breakEvenCpa.value
)
const score = computed(() => {
  if (!form.value.price || !targetCpa.value) return 0
  const marginHealth = Math.min(40, (margin.value / form.value.price) * 100)
  const cpaHealth = Math.min(35, (breakEvenCpa.value / Math.max(targetCpa.value, 1)) * 20)
  const dataHealth = form.value.monthlyGoal >= 10 ? 25 : form.value.monthlyGoal * 2.5
  return Math.round(Math.min(100, marginHealth + cpaHealth + dataHealth))
})
const adsConnected = computed(() =>
  integrations.value.some((item) => ['meta', 'google_ads'].includes(item.provider))
)
const recommendations = computed(() => {
  const items = []
  if (targetCpa.value > breakEvenCpa.value)
    items.push(
      'A meta de vendas exige um CPA acima da margem. Aumente o orçamento, reduza a meta ou melhore a margem.'
    )
  if (form.value.monthlyGoal < 10)
    items.push(
      'A meta gera poucos eventos para uma otimização confiável. Trabalhe inicialmente com recomendação e aprovação manual.'
    )
  if (margin.value / Math.max(form.value.price, 1) < 0.3)
    items.push(
      'A margem representa menos de 30% do preço; pequenas variações no CPA podem eliminar o lucro.'
    )
  if (!items.length)
    items.push(
      'Configuração financeiramente viável. Comece com orçamento controlado e revise após pelo menos 10 conversões.'
    )
  return items
})
const normalizeLocation = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
const locationMarkers = computed(() =>
  locationGroups.value
    .map((group) => ({
      ...group,
      point: targetMapItems.value.find(
        (item) => normalizeLocation(item.name) === normalizeLocation(group.city)
      )?.centroid
    }))
    .filter((item) => item.point)
)

async function load() {
  if (!password.value) return (location.href = '/painel-azul')
  const headers = { Authorization: `Bearer ${password.value}` }
  const [integrationResponse, leadsResponse, mapResponse] = await Promise.all([
    fetch('/api/admin/integrations', { headers }),
    fetch('/api/admin/leads', { headers }),
    fetch('/api/admin/map/mt', { headers })
  ])
  if (integrationResponse.ok) integrations.value = await integrationResponse.json()
  if (leadsResponse.ok) previousLeads.value = await leadsResponse.json()
  if (mapResponse.ok) {
    const geojson = await mapResponse.json()
    const projection = geoIdentity().reflectY(true).fitSize([620, 390], geojson)
    const path = geoPath(projection)
    targetMapItems.value = geojson.features.map((feature) => ({
      name: feature.properties.name || feature.properties.NM_MUN,
      path: path(feature),
      centroid: path.centroid(feature)
    }))
  }
}
function syncLocation() {
  form.value.location = locationGroups.value
    .map((item) => `${item.city}, ${item.state} + ${item.radius} km`)
    .join('; ')
}
function addLocationGroup() {
  locationGroups.value.push({ id: Date.now(), city: '', state: 'MT', radius: 40 })
}
function removeLocationGroup(id) {
  if (locationGroups.value.length === 1) return
  locationGroups.value = locationGroups.value.filter((item) => item.id !== id)
  syncLocation()
}
function mapPoint(event) {
  const svg = targetMapSvg.value
  if (!svg) return [0, 0]
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const local = point.matrixTransform(svg.getScreenCTM().inverse())
  return [(local.x - mapPan.value.x) / mapZoom.value, (local.y - mapPan.value.y) / mapZoom.value]
}
function zoomTargetMap(amount) {
  mapZoom.value = Math.min(4, Math.max(1, mapZoom.value + amount))
  if (mapZoom.value === 1) mapPan.value = { x: 0, y: 0 }
}
function resetTargetMap() {
  mapZoom.value = 1
  mapPan.value = { x: 0, y: 0 }
}
function startMapDrag(event) {
  mapDragging.value = { x: event.clientX, y: event.clientY, pan: { ...mapPan.value } }
  mapMoved.value = false
  event.currentTarget.setPointerCapture(event.pointerId)
}
function dragTargetMap(event) {
  if (!mapDragging.value || mapZoom.value === 1) return
  const rect = targetMapSvg.value.getBoundingClientRect()
  const scaleX = 620 / rect.width
  const scaleY = 390 / rect.height
  const dx = (event.clientX - mapDragging.value.x) * scaleX
  const dy = (event.clientY - mapDragging.value.y) * scaleY
  if (Math.abs(dx) + Math.abs(dy) > 3) mapMoved.value = true
  mapPan.value = { x: mapDragging.value.pan.x + dx, y: mapDragging.value.pan.y + dy }
}
function stopMapDrag() {
  mapDragging.value = null
}
function selectMapLocation(event) {
  if (mapMoved.value || !targetMapItems.value.length) return
  const point = mapPoint(event)
  const closest = targetMapItems.value.reduce((best, item) => {
    const distance = Math.hypot(item.centroid[0] - point[0], item.centroid[1] - point[1])
    return !best || distance < best.distance ? { item, distance } : best
  }, null)?.item
  if (!closest) return
  const emptyGroup = locationGroups.value.find((item) => !item.city)
  if (emptyGroup) emptyGroup.city = closest.name
  else locationGroups.value.push({ id: Date.now(), city: closest.name, state: 'MT', radius: 40 })
  syncLocation()
}
function suggestManualAudience() {
  const locationScores = previousLeads.value.reduce((scores, lead) => {
    const city = lead.city?.trim()
    const state = lead.state?.trim()
    if (!city) return scores
    const key = `${city}|${state || 'MT'}`
    const status = String(lead.status || '').toLowerCase()
    scores[key] = (scores[key] || 0) + (/(vend|ganh|fech|cliente)/.test(status) ? 4 : 1)
    return scores
  }, {})
  const bestLocation = Object.entries(locationScores).sort((a, b) => b[1] - a[1])[0]?.[0]
  const [city = 'Cuiabá', state = 'MT'] = bestLocation?.split('|') || []

  Object.assign(form.value, {
    regionCity: city,
    regionState: state,
    regionRadius: 80,
    location: `${city}, ${state} + 80 km`,
    minimumAge: 25,
    maximumAge: 65,
    gender: 'Todos',
    interests: 'Casa própria, arquitetura, área gourmet, decoração e lazer em família',
    placements: ['Facebook', 'Instagram'],
    optimization: 'Conversões',
    bidStrategy: 'Menor custo',
    attribution: '7 dias após clique'
  })
  locationGroups.value = [{ id: Date.now(), city, state, radius: 80 }]
  suggestionApplied.value = true
}
function analyze() {
  analyzed.value = true
  document.querySelector('.campaign-analysis')?.scrollIntoView({ behavior: 'smooth' })
}
function selectCreative(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (creativePreview.value) URL.revokeObjectURL(creativePreview.value)
  creativePreview.value = URL.createObjectURL(file)
}
function insertText(before, after = '') {
  const input = adTextInput.value
  const start = input?.selectionStart ?? form.value.text.length
  const end = input?.selectionEnd ?? start
  const selected = form.value.text.slice(start, end)
  form.value.text = `${form.value.text.slice(0, start)}${before}${selected}${after}${form.value.text.slice(end)}`
  requestAnimationFrame(() => {
    input?.focus()
    const cursor = start + before.length + selected.length + after.length
    input?.setSelectionRange(cursor, cursor)
  })
}
function insertEmoji(emoji) {
  insertText(emoji)
  showEmojis.value = false
}
onMounted(load)
</script>

<template>
  <div class="dashboard campaign-builder">
    <aside>
      <img src="/images/logo.png" />
      <router-link to="/painel-azul"><Users /> Oportunidades</router-link>
      <router-link to="/painel-azul/mapa"><MapIcon /> Mapa</router-link>
      <router-link to="/painel-azul/controle"><ChartNoAxesCombined /> Controle</router-link>
      <div class="side-active"><PlusCircle /> Nova campanha</div>
      <a href="/"><ArrowLeft /> Ver site</a>
    </aside>
    <main>
      <header>
        <div>
          <small>MOTOR DE OTIMIZAÇÃO</small>
          <h1>Nova campanha</h1>
        </div>
        <span>Lucro em primeiro lugar <i></i></span>
      </header>

      <div class="builder-modes">
        <button :class="{ active: mode === 'smart' }" @click="mode = 'smart'">
          <Sparkles /><span
            ><b>Modo inteligente</b><small>O sistema calcula a estratégia</small></span
          >
        </button>
        <button :class="{ active: mode === 'advanced' }" @click="mode = 'advanced'">
          <Target /><span><b>Modo avançado</b><small>Controle manual da campanha</small></span>
        </button>
      </div>

      <section v-if="mode === 'smart'" class="builder-layout">
        <form class="campaign-form" @submit.prevent="analyze">
          <section>
            <header>
              <b>01</b>
              <div>
                <h2>Objetivo e produto</h2>
                <p>Informe o que deseja vender e a economia real do produto.</p>
              </div>
            </header>
            <label
              >O que você quer?<select v-model="form.objective">
                <option>Vender mais</option>
                <option>Gerar leads</option>
                <option>Receber contatos no WhatsApp</option>
              </select></label
            ><label
              >Produto ou serviço<input
                v-model="form.product"
                required
                placeholder="Ex: Piscina Premium 7 metros"
            /></label>
            <div class="builder-row">
              <label
                >Preço<input v-model.number="form.price" type="number" min="0" required /></label
              ><label>Custo<input v-model.number="form.cost" type="number" min="0" /></label
              ><label
                >Frete médio<input v-model.number="form.shipping" type="number" min="0" /></label
              ><label
                >Taxas e comissão<input v-model.number="form.fees" type="number" min="0"
              /></label>
            </div>
          </section>
          <section class="budget-section">
            <header>
              <b>02</b>
              <div>
                <h2>Orçamento e prioridade</h2>
                <p>Defina o limite financeiro e o comportamento desejado.</p>
              </div>
            </header>
            <div class="budget-section-grid">
              <div class="budget-editor">
                <div class="builder-row two">
                  <label
                    >Orçamento diário<input
                      v-model.number="form.dailyBudget"
                      type="number"
                      min="1"
                      required /></label
                  ><label
                    >Meta de vendas/mês<input
                      v-model.number="form.monthlyGoal"
                      type="number"
                      min="1"
                      required
                  /></label>
                </div>
                <div class="strategy-options">
                  <label
                    v-for="item in [
                      {
                        id: 'profit',
                        name: 'Maximizar lucro',
                        desc: 'Equilibra margem, volume e custo.'
                      },
                      {
                        id: 'sales',
                        name: 'Maximizar vendas',
                        desc: 'Usa todo o orçamento buscando volume.'
                      },
                      { id: 'cpa', name: 'Menor CPA', desc: 'Prioriza aquisições mais baratas.' },
                      {
                        id: 'roas',
                        name: 'ROAS mínimo',
                        desc: 'Protege o retorno do investimento.'
                      }
                    ]"
                    :key="item.id"
                    :class="{ active: form.strategy === item.id }"
                    ><input v-model="form.strategy" type="radio" :value="item.id" /><b>{{
                      item.name
                    }}</b
                    ><span>{{ item.desc }}</span></label
                  >
                </div>
              </div>

              <aside class="live-economics">
                <small>ECONOMIA DA CAMPANHA</small>
                <h2>{{ form.product || 'Seu produto' }}</h2>
                <div>
                  <span>Margem antes de publicidade</span><b>{{ money(margin) }}</b>
                </div>
                <div>
                  <span>Orçamento mensal</span><b>{{ money(monthlyBudget) }}</b>
                </div>
                <div>
                  <span>CPA desejado</span><b>{{ money(targetCpa) }}</b>
                </div>
                <div>
                  <span>CPA de equilíbrio</span><b>{{ money(breakEvenCpa) }}</b>
                </div>
                <div>
                  <span>ROAS mínimo</span><b>{{ minimumRoas.toFixed(2) }}x</b>
                </div>
                <div class="profit-result">
                  <span>Lucro mensal projetado</span><b>{{ money(projectedProfit) }}</b>
                </div>
                <p>Valores estimados com base nos custos e metas informados.</p>
              </aside>
            </div>
          </section>
          <section class="creative-section">
            <header>
              <b>03</b>
              <div>
                <h2>Público e criativo</h2>
                <p>Forneça o material e deixe o sistema montar o teste inicial.</p>
              </div>
            </header>
            <div class="creative-section-grid">
              <div class="creative-editor">
                <div class="audience-switch">
                  <button
                    type="button"
                    :class="{ active: form.audience === 'automatic' }"
                    @click="form.audience = 'automatic'"
                  >
                    Automático recomendado</button
                  ><button
                    type="button"
                    :class="{ active: form.audience === 'manual' }"
                    @click="form.audience = 'manual'"
                  >
                    Configurar manualmente
                  </button>
                </div>
                <div v-if="form.audience === 'manual'" class="manual-audience">
                  <header>
                    <Target />
                    <div>
                      <b>Segmentação manual</b
                      ><span>Defina quem verá e como a plataforma entregará o anúncio.</span>
                    </div>
                    <button
                      type="button"
                      class="audience-suggestion"
                      @click="suggestManualAudience"
                    >
                      <Sparkles /> Sugerir melhor preenchimento
                    </button>
                  </header>
                  <div v-if="suggestionApplied" class="suggestion-feedback">
                    <CheckCircle2 /> Preenchido com base nas regiões com mais resultados anteriores.
                    Você pode editar qualquer campo.
                  </div>
                  <div class="region-targeting">
                    <div class="region-targeting-title">
                      <MapIcon />
                      <div>
                        <b>Região de exibição da propaganda</b>
                        <span
                          >Crie grupos de cidades e raios, como na segmentação do Meta Ads.</span
                        >
                      </div>
                      <button type="button" @click="addLocationGroup">
                        <Plus /> Adicionar local
                      </button>
                    </div>
                    <div class="location-target-layout">
                      <div class="location-groups">
                        <article v-for="(group, index) in locationGroups" :key="group.id">
                          <header>
                            <span><MapPin /> Grupo de local {{ index + 1 }}</span>
                            <button
                              type="button"
                              title="Remover grupo"
                              :disabled="locationGroups.length === 1"
                              @click="removeLocationGroup(group.id)"
                            >
                              <Trash2 />
                            </button>
                          </header>
                          <div class="manual-row region-row">
                            <label
                              >Cidade<input
                                v-model="group.city"
                                list="mt-city-options"
                                placeholder="Ex: Cuiabá"
                                @input="syncLocation"
                            /></label>
                            <label
                              >UF<input
                                v-model="group.state"
                                maxlength="2"
                                placeholder="MT"
                                @input="syncLocation"
                            /></label>
                            <label
                              >Raio<span class="radius-input"
                                ><input
                                  v-model.number="group.radius"
                                  type="number"
                                  min="1"
                                  max="500"
                                  @input="syncLocation"
                                /><b>km</b></span
                              ></label
                            >
                          </div>
                        </article>
                        <datalist id="mt-city-options">
                          <option
                            v-for="item in targetMapItems"
                            :key="item.name"
                            :value="item.name"
                          />
                        </datalist>
                      </div>
                      <div class="targeting-map">
                        <div class="targeting-map-controls">
                          <button type="button" title="Ampliar" @click="zoomTargetMap(0.4)">
                            <ZoomIn />
                          </button>
                          <button type="button" title="Diminuir" @click="zoomTargetMap(-0.4)">
                            <ZoomOut />
                          </button>
                          <button type="button" title="Centralizar mapa" @click="resetTargetMap">
                            <LocateFixed />
                          </button>
                        </div>
                        <svg
                          ref="targetMapSvg"
                          viewBox="0 0 620 390"
                          aria-label="Mapa interativo dos locais selecionados"
                          @click="selectMapLocation"
                          @wheel.prevent="zoomTargetMap($event.deltaY < 0 ? 0.3 : -0.3)"
                          @pointerdown="startMapDrag"
                          @pointermove="dragTargetMap"
                          @pointerup="stopMapDrag"
                          @pointercancel="stopMapDrag"
                        >
                          <g :transform="`translate(${mapPan.x} ${mapPan.y}) scale(${mapZoom})`">
                            <path
                              v-for="item in targetMapItems"
                              :key="item.name"
                              :d="item.path"
                              :class="{
                                selected: locationMarkers.some(
                                  (marker) =>
                                    normalizeLocation(marker.city) === normalizeLocation(item.name)
                                )
                              }"
                            />
                            <g
                              v-for="marker in locationMarkers"
                              :key="marker.id"
                              :transform="`translate(${marker.point[0]} ${marker.point[1]})`"
                              class="target-marker"
                            >
                              <circle :r="Math.min(30, 10 + marker.radius / 8)" />
                              <circle class="marker-core" r="4" />
                              <path class="marker-arrow" d="M 0 5 L -6 -7 L 6 -7 Z" />
                              <text y="-13" text-anchor="middle">{{ marker.city }}</text>
                            </g>
                          </g>
                        </svg>
                        <small
                          >Clique para marcar · use a roda para ampliar · arraste para mover ·
                          {{ locationGroups.length }} local(is)</small
                        >
                      </div>
                    </div>
                  </div>
                  <div class="manual-row three">
                    <label
                      >Idade mínima<input
                        v-model.number="form.minimumAge"
                        type="number"
                        min="18"
                        max="65"
                    /></label>
                    <label
                      >Idade máxima<input
                        v-model.number="form.maximumAge"
                        type="number"
                        min="18"
                        max="65"
                    /></label>
                    <label
                      >Gênero<select v-model="form.gender">
                        <option>Todos</option>
                        <option>Mulheres</option>
                        <option>Homens</option>
                      </select></label
                    >
                  </div>
                  <label
                    >Interesses e comportamentos<textarea
                      v-model="form.interests"
                      placeholder="Ex: arquitetura, área gourmet, casa própria, decoração"
                    ></textarea>
                  </label>
                  <div class="manual-field">
                    <small>POSICIONAMENTOS</small>
                    <div class="placement-options">
                      <label
                        v-for="item in ['Facebook', 'Instagram', 'Messenger', 'Audience Network']"
                        :key="item"
                        ><input v-model="form.placements" type="checkbox" :value="item" />{{
                          item
                        }}</label
                      >
                    </div>
                  </div>
                  <div class="manual-row">
                    <label
                      >Otimização<select v-model="form.optimization">
                        <option>Conversões</option>
                        <option>Leads</option>
                        <option>Cliques no link</option>
                        <option>Visualização da página</option>
                      </select></label
                    >
                    <label
                      >Estratégia de lance<select v-model="form.bidStrategy">
                        <option>Menor custo</option>
                        <option>Limite de custo</option>
                        <option>Limite de lance</option>
                        <option>ROAS mínimo</option>
                      </select></label
                    >
                  </div>
                  <label
                    >Janela de atribuição<select v-model="form.attribution">
                      <option>7 dias após clique</option>
                      <option>1 dia após clique</option>
                      <option>7 dias clique ou 1 dia visualização</option>
                    </select></label
                  >
                  <div class="manual-toggles">
                    <label
                      ><input v-model="form.remarketing" type="checkbox" /><span
                        ><b>Ativar remarketing</b
                        ><small
                          >Impactar pessoas que já visitaram ou entraram em contato.</small
                        ></span
                      ></label
                    ><label
                      ><input v-model="form.excludeCustomers" type="checkbox" /><span
                        ><b>Excluir clientes existentes</b
                        ><small>Evita gastar novamente com quem já comprou.</small></span
                      ></label
                    >
                  </div>
                </div>
                <div v-else class="automatic-audience-note">
                  <Sparkles />
                  <div>
                    <b>Público automático recomendado</b
                    ><span
                      >O sistema distribuirá o orçamento e aprenderá com as conversões, respeitando
                      localização, margem e limites financeiros.</span
                    >
                  </div>
                </div>
                <div class="upload-actions">
                  <label class="creative-upload"
                    ><ImagePlus /> Adicionar imagem<input
                      type="file"
                      accept="image/*"
                      @change="selectCreative"
                  /></label>
                  <label class="creative-upload"
                    ><Video /> Adicionar vídeo<input
                      type="file"
                      accept="video/*"
                      @change="selectCreative"
                  /></label>
                </div>
                <div class="ad-copy-editor">
                  <label for="ad-text">Texto do anúncio</label>
                  <div class="copy-toolbar" aria-label="Ferramentas de edição do anúncio">
                    <button type="button" title="Negrito" @click="insertText('**', '**')">
                      <Bold />
                    </button>
                    <button type="button" title="Itálico" @click="insertText('_', '_')">
                      <Italic />
                    </button>
                    <button type="button" title="Adicionar lista" @click="insertText('\n• ')">
                      <List />
                    </button>
                    <div class="emoji-tool">
                      <button
                        type="button"
                        title="Adicionar emoji"
                        :class="{ active: showEmojis }"
                        @click="showEmojis = !showEmojis"
                      >
                        <Smile /> Emoji
                      </button>
                      <div v-if="showEmojis" class="emoji-picker">
                        <button
                          v-for="emoji in [
                            '🏊',
                            '💦',
                            '☀️',
                            '🏡',
                            '✨',
                            '💙',
                            '🔥',
                            '✅',
                            '📲',
                            '🎯'
                          ]"
                          :key="emoji"
                          type="button"
                          @click="insertEmoji(emoji)"
                        >
                          {{ emoji }}
                        </button>
                      </div>
                    </div>
                    <span>{{ form.text.length }}/500</span>
                  </div>
                  <textarea
                    id="ad-text"
                    ref="adTextInput"
                    v-model="form.text"
                    maxlength="500"
                    placeholder="Apresente o principal benefício..."
                  ></textarea>
                </div>

                <div class="creative-meta-row">
                  <label
                    >Título<input
                      v-model="form.title"
                      maxlength="80"
                      placeholder="Uma chamada curta e forte"
                  /></label>
                  <label
                    >Animação da prévia<select v-model="form.animation">
                      <option value="none">Sem animação</option>
                      <option value="fade">Entrada suave</option>
                      <option value="zoom">Zoom suave</option>
                      <option value="slide">Deslizar</option>
                      <option value="pulse">Pulsar</option>
                    </select></label
                  >
                </div>
              </div>

              <div class="inline-ad-preview mobile-preview">
                <small>PRÉVIA MOBILE</small>
                <article class="social-ad-preview" :class="`preview-animation-${form.animation}`">
                  <header>
                    <img src="/images/logo.png" />
                    <div><b>Aguazul Piscinas</b><span>Patrocinado · 🌐</span></div>
                  </header>
                  <p>{{ form.text || 'O texto do seu anúncio aparecerá aqui.' }}</p>
                  <div class="ad-media">
                    <img v-if="creativePreview" :src="creativePreview" alt="Prévia mobile" />
                    <div v-else><ImagePlus /><span>Seu criativo</span></div>
                  </div>
                  <footer>
                    <div>
                      <small>{{ form.product || 'AGUAZUL PISCINAS' }}</small
                      ><b>{{ form.title || 'Transforme sua área de lazer' }}</b>
                    </div>
                    <button>Saiba mais</button>
                  </footer>
                  <nav><span>♡ Curtir</span><span>◯ Comentar</span><span>⌁ Enviar</span></nav>
                </article>
              </div>

              <div class="inline-ad-preview desktop-preview">
                <small>PRÉVIA DESKTOP</small>
                <article class="social-ad-preview" :class="`preview-animation-${form.animation}`">
                  <header>
                    <img src="/images/logo.png" />
                    <div><b>Aguazul Piscinas</b><span>Patrocinado · 🌐</span></div>
                  </header>
                  <p>
                    {{
                      form.text ||
                      'O texto do seu anúncio aparecerá aqui. Apresente o principal benefício da oferta.'
                    }}
                  </p>
                  <div class="ad-media">
                    <img v-if="creativePreview" :src="creativePreview" alt="Prévia desktop" />
                    <div v-else><ImagePlus /><span>Adicione uma imagem ou vídeo</span></div>
                  </div>
                  <footer>
                    <div>
                      <small>{{ form.product || 'AGUAZUL PISCINAS' }}</small
                      ><b>{{ form.title || 'Transforme sua área de lazer' }}</b>
                    </div>
                    <button>Saiba mais</button>
                  </footer>
                  <nav><span>♡ Curtir</span><span>◯ Comentar</span><span>⌁ Compartilhar</span></nav>
                </article>
              </div>
            </div>
          </section>
          <button class="analyze-campaign"><Bot /> Analisar campanha <ChevronRight /></button>
        </form>
      </section>

      <section v-else class="advanced-placeholder">
        <Target />
        <h2>Configuração avançada</h2>
        <p>
          Campanha, conjuntos, segmentação, posicionamentos, lances, atribuição, públicos,
          remarketing e testes controlados.
        </p>
        <div>
          <span>Campanha</span><ChevronRight /><span>Conjunto</span><ChevronRight /><span
            >Anúncio</span
          ><ChevronRight /><span>Criativo</span>
        </div>
        <button @click="mode = 'smart'">Começar pelo modo inteligente</button>
      </section>

      <section v-if="analyzed" class="campaign-analysis">
        <header>
          <div>
            <small>ANÁLISE PRÉ-PUBLICAÇÃO</small>
            <h2>Performance Score</h2>
          </div>
          <strong>{{ score }}<small>/100</small></strong>
        </header>
        <div class="score-bar"><i :style="{ width: `${score}%` }"></i></div>
        <div class="analysis-grid">
          <article>
            <small>VIABILIDADE</small>
            <h3 :class="{ good: viable }">
              {{ viable ? 'Configuração viável' : 'Requer ajustes' }}
            </h3>
            <p>CPA desejado {{ money(targetCpa) }} · Limite {{ money(breakEvenCpa) }}</p>
          </article>
          <article>
            <small>ESTRATÉGIA</small>
            <h3>{{ form.strategy === 'profit' ? 'Maximizar lucro' : 'Otimização controlada' }}</h3>
            <p>Nunca ultrapassar {{ money(form.dailyBudget) }} por dia.</p>
          </article>
          <article>
            <small>SEGURANÇA</small>
            <h3>Aprovação manual</h3>
            <p>Nenhuma alteração automática antes de 10 conversões.</p>
          </article>
        </div>
        <div class="recommendation-box">
          <Bot />
          <div>
            <b>Recomendação do motor</b>
            <p v-for="item in recommendations" :key="item">{{ item }}</p>
          </div>
        </div>
        <footer>
          <div v-if="!adsConnected">
            <ShieldCheck /><span
              ><b>Publicação bloqueada</b>Conecte Meta Ads ou Google Ads no Controle.</span
            >
          </div>
          <button :disabled="!adsConnected">Publicar campanha</button>
        </footer>
      </section>
    </main>
  </div>
</template>
