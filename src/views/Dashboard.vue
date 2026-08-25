<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  Eye,
  MapPin,
  Map as MapIcon,
  MessageCircle,
  MousePointerClick,
  Search,
  Trophy,
  Target,
  TrendingUp,
  Users
} from 'lucide-vue-next'
const password = ref(sessionStorage.getItem('az_token') || ''),
  input = ref(''),
  error = ref(''),
  leads = ref([]),
  search = ref(''),
  loading = ref(false),
  activeStatus = ref('Todos'),
  celebration = ref(null)
const statuses = [
  'Novo',
  'Contato solicitado',
  'Em atendimento',
  'Proposta enviada',
  'Convertido',
  'Descartado'
]
const filtered = computed(() =>
  leads.value.filter(
    (x) =>
      (activeStatus.value === 'Todos' || x.status === activeStatus.value) &&
      JSON.stringify(x).toLowerCase().includes(search.value.toLowerCase())
  )
)
const statusCount = (value) =>
  value === 'Todos'
    ? leads.value.length
    : leads.value.filter((lead) => lead.status === value).length
const contacts = computed(() => leads.value.filter((x) => x.name || x.whatsappClicks).length)
const percentage = (value, total = leads.value.length) =>
  total ? `${Math.round((value / total) * 100)}%` : '0%'
const funnel = computed(() => {
  const visitors = leads.value.length
  const interested = leads.value.filter((x) => x.whatsappClicks > 0 || x.name).length
  const qualified = leads.value.filter((x) =>
    ['Contato solicitado', 'Em atendimento', 'Proposta enviada', 'Convertido'].includes(x.status)
  ).length
  const proposals = leads.value.filter((x) =>
    ['Proposta enviada', 'Convertido'].includes(x.status)
  ).length
  const sales = leads.value.filter((x) => x.status === 'Convertido').length
  return [
    { label: 'Visitantes', value: visitors, rate: '100%' },
    { label: 'Interessados', value: interested, rate: percentage(interested, visitors) },
    { label: 'Qualificados', value: qualified, rate: percentage(qualified, visitors) },
    { label: 'Propostas', value: proposals, rate: percentage(proposals, visitors) },
    { label: 'Vendas', value: sales, rate: percentage(sales, visitors) }
  ]
})
const groupPerformance = (field, fallback) => {
  const grouped = leads.value.reduce((result, lead) => {
    const name = lead[field] || fallback
    if (!result[name]) result[name] = { name, visits: 0, contacts: 0, sales: 0 }
    result[name].visits += 1
    if (lead.name || lead.whatsappClicks) result[name].contacts += 1
    if (lead.status === 'Convertido') result[name].sales += 1
    return result
  }, {})
  return Object.values(grouped)
    .sort((a, b) => b.contacts - a.contacts || b.visits - a.visits)
    .slice(0, 5)
}
const channels = computed(() => groupPerformance('source', 'Acesso direto'))
const locations = computed(() => groupPerformance('geoCity', 'Não identificada'))
async function load() {
  loading.value = true
  const r = await fetch('/api/admin/leads', {
    headers: { Authorization: `Bearer ${password.value}` }
  })
  if (r.ok) leads.value = await r.json()
  else password.value = ''
  loading.value = false
}
async function login() {
  const r = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: input.value })
  })
  if (r.ok) {
    password.value = input.value
    sessionStorage.setItem('az_token', input.value)
    load()
  } else error.value = 'Senha incorreta'
}
async function status(lead, value) {
  const previousStatus = lead.status
  lead.status = value
  const response = await fetch(`/api/admin/leads/${lead.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password.value}` },
    body: JSON.stringify({ status: value })
  })
  if (!response.ok) {
    lead.status = previousStatus
    return
  }
  if (value === 'Convertido' && previousStatus !== 'Convertido') {
    celebration.value = lead.name || 'Novo cliente'
    activeStatus.value = 'Convertido'
    setTimeout(() => (celebration.value = null), 3200)
  }
}
const date = (v) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v))
onMounted(() => password.value && load())
</script>
<template>
  <div class="dash-login" v-if="!password">
    <a href="/"><ArrowLeft /> Voltar ao site</a>
    <form @submit.prevent="login">
      <img src="/images/logo.png" /><small>ÁREA RESTRITA</small>
      <h1>Central de oportunidades</h1>
      <p>Acompanhe as pessoas interessadas em transformar o quintal.</p>
      <input v-model="input" type="password" placeholder="Senha de acesso" autofocus /><button>
        Entrar no painel</button
      ><em>{{ error }}</em>
    </form>
  </div>
  <div class="dashboard" v-else>
    <aside>
      <img src="/images/logo.png" />
      <div class="side-active"><Users /> Oportunidades</div>
      <router-link to="/painel-azul/mapa"><MapIcon /> Mapa</router-link>
      <router-link to="/painel-azul/controle"><ChartNoAxesCombined /> Controle</router-link>
      <a href="/"><ArrowLeft /> Ver site</a>
    </aside>
    <main>
      <header>
        <div>
          <small>PAINEL COMERCIAL</small>
          <h1>Oportunidades</h1>
        </div>
        <span>Atualizado agora <i></i></span>
      </header>
      <section class="metrics">
        <article>
          <div>
            <small>Visitantes</small><b>{{ leads.length }}</b>
          </div>
          <Users />
        </article>
        <article>
          <div>
            <small>Interessados</small><b>{{ contacts }}</b>
          </div>
          <MessageCircle />
        </article>
        <article>
          <div>
            <small>Visualizações</small><b>{{ leads.reduce((a, x) => a + x.views, 0) }}</b>
          </div>
          <Eye />
        </article>
      </section>
      <section class="analytics-grid">
        <article class="funnel-panel">
          <header>
            <div>
              <TrendingUp /><span><small>CONVERSÃO</small><b>Funil de vendas</b></span>
            </div>
            <em>{{ percentage(funnel[4].value) }} de conversão final</em>
          </header>
          <div class="funnel-steps">
            <div v-for="(step, index) in funnel" :key="step.label" class="funnel-step">
              <span :style="{ width: `${100 - index * 10}%` }"></span>
              <div>
                <small>{{ step.label }}</small
                ><b>{{ step.value }}</b>
              </div>
              <em>{{ step.rate }}</em>
            </div>
          </div>
        </article>

        <article class="performance-panel">
          <header>
            <BarChart3 /><span><small>AQUISIÇÃO</small><b>Desempenho por origem</b></span>
          </header>
          <div class="performance-head">
            <span>Canal</span><span>Visitas</span><span>Contatos</span><span>Vendas</span>
          </div>
          <div v-for="channel in channels" :key="channel.name" class="performance-row">
            <b>{{ channel.name }}</b
            ><span>{{ channel.visits }}</span
            ><span>{{ channel.contacts }}</span
            ><strong>{{ channel.sales }}</strong>
          </div>
          <div v-if="!channels.length" class="analytics-empty">
            Dados serão exibidos após os primeiros acessos.
          </div>
        </article>

        <article class="performance-panel location-panel">
          <header>
            <MapPin /><span><small>LOCALIZAÇÃO</small><b>Cidades com mais interesse</b></span>
          </header>
          <div class="performance-head">
            <span>Cidade</span><span>Visitas</span><span>Contatos</span><span>Vendas</span>
          </div>
          <div v-for="location in locations" :key="location.name" class="performance-row">
            <b>{{ location.name }}</b
            ><span>{{ location.visits }}</span
            ><span>{{ location.contacts }}</span
            ><strong>{{ location.sales }}</strong>
          </div>
          <div v-if="!locations.length" class="analytics-empty">
            Dados serão exibidos após os primeiros acessos.
          </div>
        </article>
      </section>
      <section class="lead-box">
        <div class="lead-tools">
          <div>
            <h2>Todos os contatos</h2>
            <span>{{ filtered.length }} registros</span>
          </div>
          <label
            ><Search /><input v-model="search" placeholder="Buscar nome, cidade ou telefone"
          /></label>
        </div>
        <div class="lead-status-tabs" role="tablist" aria-label="Filtrar contatos por etapa">
          <button
            v-for="item in ['Todos', ...statuses]"
            :key="item"
            type="button"
            role="tab"
            :aria-selected="activeStatus === item"
            :class="{ active: activeStatus === item, converted: item === 'Convertido' }"
            @click="activeStatus = item"
          >
            {{ item }} <span>{{ statusCount(item) }}</span>
          </button>
        </div>
        <div class="lead-grid" v-if="filtered.length">
          <article class="lead-card" v-for="lead in filtered" :key="lead.id">
            <header class="lead-card-header">
              <div class="lead-avatar">{{ (lead.name || 'V').charAt(0).toUpperCase() }}</div>
              <div class="lead-identity">
                <small>CONTATO</small>
                <h3>{{ lead.name || 'Visitante anônimo' }}</h3>
                <a v-if="lead.phone" :href="`https://wa.me/55${lead.phone.replace(/\D/g, '')}`">
                  {{ lead.phone }}
                </a>
                <span v-else>ID {{ lead.visitorId.slice(0, 14) }}</span>
              </div>
              <select
                class="lead-status"
                :value="lead.status"
                @change="status(lead, $event.target.value)"
              >
                <option>Novo</option>
                <option>Contato solicitado</option>
                <option>Em atendimento</option>
                <option>Proposta enviada</option>
                <option>Convertido</option>
                <option>Descartado</option>
              </select>
            </header>

            <div class="lead-card-details">
              <section>
                <Target />
                <div>
                  <small>ORIGEM</small>
                  <b>{{ lead.source }}</b>
                  <span>{{ lead.campaign || lead.medium || lead.sourceDetail }}</span>
                </div>
              </section>
              <section>
                <MapPin />
                <div>
                  <small>LOCALIZAÇÃO ESTIMADA</small>
                  <b>{{ lead.geoCity || 'Não identificada' }}</b>
                  <span>{{
                    [lead.geoState, lead.geoCountry].filter(Boolean).join(' — ') || '—'
                  }}</span>
                </div>
              </section>
              <section>
                <CalendarDays />
                <div>
                  <small>PRIMEIRO ACESSO</small>
                  <b>{{ date(lead.firstSeen) }}</b>
                  <span>Último: {{ date(lead.lastSeen) }}</span>
                </div>
              </section>
              <section>
                <MousePointerClick />
                <div>
                  <small>ATIVIDADE</small>
                  <b>{{ lead.views }} visita(s)</b>
                  <span>{{ lead.whatsappClicks }} clique(s) no WhatsApp</span>
                </div>
              </section>
            </div>

            <footer class="lead-card-footer">
              <div>
                <small>TAMANHO</small><b>{{ lead.size || 'Não informado' }}</b>
              </div>
              <div>
                <small>CIDADE DECLARADA</small><b>{{ lead.city || 'Não informada' }}</b>
              </div>
              <div>
                <small>PRAZO</small><b>{{ lead.timeline || 'Não informado' }}</b>
              </div>
            </footer>
          </article>
        </div>
        <div v-else class="empty">
          {{ loading ? 'Carregando...' : 'Nenhum registro encontrado.' }}
        </div>
      </section>
    </main>
    <div v-if="celebration" class="sale-celebration" role="status" aria-live="assertive">
      <div class="confetti" aria-hidden="true">
        <i v-for="index in 28" :key="index" :style="{ '--i': index }"></i>
      </div>
      <article>
        <div class="happy-face">🥳</div>
        <Trophy />
        <small>VENDA REALIZADA</small>
        <h2>Temos um novo cliente!</h2>
        <p>{{ celebration }} foi movido para a aba Convertido.</p>
        <button type="button" @click="celebration = null">Continuar</button>
      </article>
    </div>
  </div>
</template>
