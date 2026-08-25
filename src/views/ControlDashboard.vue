<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Link2,
  LockKeyhole,
  Map as MapIcon,
  Mail,
  PlusCircle,
  MousePointerClick,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X
} from 'lucide-vue-next'

const password = ref(sessionStorage.getItem('az_token') || '')
const leads = ref([])
const period = ref('30')
const platform = ref('Todas')
const selectedCampaign = ref(null)
const integrations = ref([])
const integrationModal = ref(null)
const integrationError = ref('')
const integrationMessage = ref('')
const integrationSaving = ref(false)
const integrationForm = ref({ accountName: '', credentials: {}, code: '' })

const providerDefinitions = [
  {
    id: 'meta',
    name: 'Meta',
    description: 'Facebook + Instagram Ads',
    fields: [
      { key: 'appId', label: 'App ID' },
      { key: 'appSecret', label: 'App Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', secret: true },
      { key: 'adAccountId', label: 'ID da conta de anúncios' }
    ]
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Campanhas e conversões',
    fields: [
      { key: 'clientId', label: 'Client ID' },
      { key: 'clientSecret', label: 'Client Secret', secret: true },
      { key: 'developerToken', label: 'Developer Token', secret: true },
      { key: 'customerId', label: 'Customer ID' }
    ]
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    description: 'Eventos e jornada do site',
    fields: [
      { key: 'propertyId', label: 'GA4 Property ID' },
      { key: 'clientEmail', label: 'E-mail da Service Account' },
      { key: 'privateKey', label: 'Private Key', secret: true }
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Cloud API e conversas',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID' },
      { key: 'businessAccountId', label: 'Business Account ID' },
      { key: 'accessToken', label: 'Access Token', secret: true },
      { key: 'verifyToken', label: 'Verify Token', secret: true }
    ]
  }
]
const integrationRecord = (provider) =>
  integrations.value.find((item) => item.provider === provider)

const campaigns = [
  {
    id: 1,
    name: 'Remarketing Piscinas',
    platform: 'Meta Ads',
    spend: 340,
    revenue: 2320,
    impressions: 18400,
    reach: 12100,
    clicks: 370,
    leads: 42,
    sales: 17,
    ctr: 4.8,
    cpc: 0.92,
    targetCpa: 30,
    targetRoas: 4,
    status: 'Excelente',
    ads: [
      { name: 'Vídeo Família #01', roas: 8.1, cpa: 16, ctr: 5.7 },
      { name: 'Antes e Depois #04', roas: 5.4, cpa: 24, ctr: 4.2 },
      { name: 'Imagem Showroom #02', roas: 0.7, cpa: 112, ctr: 0.8 }
    ]
  },
  {
    id: 2,
    name: 'Piscina Premium Cuiabá',
    platform: 'Instagram',
    spend: 780,
    revenue: 936,
    impressions: 32600,
    reach: 24100,
    clicks: 510,
    leads: 31,
    sales: 8,
    ctr: 1.56,
    cpc: 1.53,
    targetCpa: 45,
    targetRoas: 3,
    status: 'Atenção',
    ads: [
      { name: 'Carrossel Premium', roas: 2.2, cpa: 68, ctr: 2.1 },
      { name: 'Story Oferta', roas: 0.4, cpa: 146, ctr: 0.7 }
    ]
  },
  {
    id: 3,
    name: 'Pesquisa Piscinas MT',
    platform: 'Google Ads',
    spend: 620,
    revenue: 3162,
    impressions: 12800,
    reach: 9700,
    clicks: 640,
    leads: 51,
    sales: 22,
    ctr: 5,
    cpc: 0.97,
    targetCpa: 35,
    targetRoas: 4,
    status: 'Excelente',
    ads: [
      { name: 'Piscina de Fibra Cuiabá', roas: 6.4, cpa: 21, ctr: 6.1 },
      { name: 'Comprar Piscina MT', roas: 4.3, cpa: 33, ctr: 4.2 }
    ]
  },
  {
    id: 4,
    name: 'Alcance Mato Grosso',
    platform: 'Meta Ads',
    spend: 400,
    revenue: 0,
    impressions: 48800,
    reach: 40300,
    clicks: 192,
    leads: 12,
    sales: 0,
    ctr: 0.39,
    cpc: 2.08,
    targetCpa: 30,
    targetRoas: 3,
    status: 'Crítico',
    ads: [{ name: 'Institucional #07', roas: 0, cpa: 0, ctr: 0.39 }]
  }
]
const visibleCampaigns = computed(() =>
  platform.value === 'Todas'
    ? campaigns
    : campaigns.filter((item) => item.platform === platform.value)
)
const totals = computed(() =>
  visibleCampaigns.value.reduce(
    (sum, item) => ({
      spend: sum.spend + item.spend,
      revenue: sum.revenue + item.revenue,
      impressions: sum.impressions + item.impressions,
      reach: sum.reach + item.reach,
      clicks: sum.clicks + item.clicks,
      leads: sum.leads + item.leads,
      sales: sum.sales + item.sales
    }),
    { spend: 0, revenue: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, sales: 0 }
  )
)
const money = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const number = (value) => new Intl.NumberFormat('pt-BR').format(value)
const ratio = (a, b) => (b ? a / b : 0)
const statusClass = (value) =>
  ({ Excelente: 'excelente', Atenção: 'atencao', Crítico: 'critico' })[value]
const funnel = computed(() => [
  { label: 'Impressões', value: totals.value.impressions },
  { label: 'Cliques', value: totals.value.clicks },
  { label: 'Leads', value: totals.value.leads },
  { label: 'Atendimento', value: Math.round(totals.value.leads * 0.42) },
  { label: 'Propostas', value: Math.round(totals.value.leads * 0.25) },
  { label: 'Vendas', value: totals.value.sales }
])
const dropRate = (index) =>
  index
    ? `${Math.round((1 - funnel.value[index].value / funnel.value[index - 1].value) * 100)}% perda`
    : 'Entrada'
const alerts = computed(() =>
  campaigns.flatMap((item) => {
    const list = []
    if (item.spend > 100 && item.sales === 0)
      list.push({
        level: 'danger',
        title: `${item.name} está gastando sem vender`,
        text: `${money(item.spend)} investidos e nenhuma venda.`
      })
    if (ratio(item.revenue, item.spend) > 5 && item.sales > 10)
      list.push({
        level: 'success',
        title: `Oportunidade para escalar ${item.name}`,
        text: `ROAS ${ratio(item.revenue, item.spend).toFixed(1)}x com ${item.sales} vendas.`
      })
    if (item.ctr < 1)
      list.push({
        level: 'warning',
        title: `CTR baixo em ${item.name}`,
        text: `CTR de ${item.ctr}% indica possível problema no criativo.`
      })
    return list
  })
)

async function load() {
  if (!password.value) return (location.href = '/painel-azul')
  const headers = { Authorization: `Bearer ${password.value}` }
  const [response, integrationResponse] = await Promise.all([
    fetch('/api/admin/leads', { headers }),
    fetch('/api/admin/integrations', { headers })
  ])
  if (response.ok) {
    leads.value = await response.json()
    if (integrationResponse.ok) integrations.value = await integrationResponse.json()
  } else location.href = '/painel-azul'
}
function openIntegration(provider) {
  integrationModal.value = provider
  integrationError.value = ''
  integrationMessage.value = ''
  integrationForm.value = {
    accountName: integrationRecord(provider.id)?.account_name || '',
    credentials: Object.fromEntries(provider.fields.map((field) => [field.key, ''])),
    code: ''
  }
}
async function requestEditCode() {
  integrationError.value = ''
  const response = await fetch(
    `/api/admin/integrations/${integrationModal.value.id}/request-code`,
    { method: 'POST', headers: { Authorization: `Bearer ${password.value}` } }
  )
  const result = await response.json()
  if (!response.ok) integrationError.value = result.error
  else integrationMessage.value = `Código enviado para ${result.destination}.`
}
async function saveIntegration() {
  integrationSaving.value = true
  integrationError.value = ''
  const response = await fetch(`/api/admin/integrations/${integrationModal.value.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${password.value}`
    },
    body: JSON.stringify(integrationForm.value)
  })
  const result = await response.json()
  integrationSaving.value = false
  if (!response.ok) return (integrationError.value = result.error)
  integrationModal.value = null
  await load()
}
onMounted(load)
</script>

<template>
  <div class="dashboard control-dashboard">
    <aside>
      <img src="/images/logo.png" />
      <router-link to="/painel-azul"><Users /> Oportunidades</router-link>
      <router-link to="/painel-azul/mapa"><MapIcon /> Mapa</router-link>
      <div class="side-active"><ChartNoAxesCombined /> Controle</div>
      <router-link to="/painel-azul/campanha/nova"><PlusCircle /> Nova campanha</router-link>
      <a href="/"><ArrowLeft /> Ver site</a>
    </aside>
    <main>
      <header>
        <div>
          <small>COCKPIT DE AQUISIÇÃO</small>
          <h1>Controle</h1>
        </div>
        <span class="demo-badge">Dados demonstrativos de Ads</span>
      </header>
      <section class="control-filters">
        <div>
          <small>PERÍODO</small
          ><button
            v-for="item in [
              ['1', 'Hoje'],
              ['7', '7 dias'],
              ['30', '30 dias']
            ]"
            :key="item[0]"
            :class="{ active: period === item[0] }"
            @click="period = item[0]"
          >
            {{ item[1] }}</button
          ><button>Personalizado</button>
        </div>
        <div>
          <small>CANAL</small
          ><button
            v-for="item in ['Todas', 'Meta Ads', 'Google Ads', 'Instagram']"
            :key="item"
            :class="{ active: platform === item }"
            @click="platform = item"
          >
            {{ item }}
          </button>
        </div>
      </section>

      <section class="control-kpis">
        <article>
          <CircleDollarSign /><small>GASTO TOTAL</small><b>{{ money(totals.spend) }}</b
          ><em class="good"><TrendingDown /> 12% menor</em>
        </article>
        <article>
          <TrendingUp /><small>RECEITA</small><b>{{ money(totals.revenue) }}</b
          ><em class="good">↑ 18% no período</em>
        </article>
        <article>
          <Target /><small>ROAS</small><b>{{ ratio(totals.revenue, totals.spend).toFixed(2) }}x</b
          ><em>R$ 1 → {{ money(ratio(totals.revenue, totals.spend)) }}</em>
        </article>
        <article>
          <Users /><small>CPA</small><b>{{ money(ratio(totals.spend, totals.sales)) }}</b
          ><em>por venda</em>
        </article>
      </section>
      <section class="secondary-kpis">
        <div>
          <Eye /><span
            ><small>Impressões</small><b>{{ number(totals.impressions) }}</b></span
          >
        </div>
        <div>
          <Users /><span
            ><small>Alcance</small><b>{{ number(totals.reach) }}</b></span
          >
        </div>
        <div>
          <MousePointerClick /><span
            ><small>Cliques</small><b>{{ number(totals.clicks) }}</b></span
          >
        </div>
        <div>
          <span
            ><small>CTR</small
            ><b>{{ (ratio(totals.clicks, totals.impressions) * 100).toFixed(2) }}%</b></span
          >
        </div>
        <div>
          <span
            ><small>CPC</small><b>{{ money(ratio(totals.spend, totals.clicks)) }}</b></span
          >
        </div>
        <div>
          <span
            ><small>Leads</small><b>{{ totals.leads }}</b></span
          >
        </div>
        <div>
          <span
            ><small>Vendas</small><b>{{ totals.sales }}</b></span
          >
        </div>
        <div>
          <span
            ><small>Conversão</small
            ><b>{{ (ratio(totals.sales, totals.leads) * 100).toFixed(1) }}%</b></span
          >
        </div>
      </section>

      <section class="control-grid">
        <article class="control-panel sales-funnel">
          <header>
            <div>
              <small>JORNADA</small>
              <h2>Funil de vendas</h2>
            </div>
            <span>Onde estamos perdendo clientes?</span>
          </header>
          <div class="horizontal-funnel">
            <div v-for="(step, index) in funnel" :key="step.label">
              <section :style="{ width: `${100 - index * 8}%` }">
                <small>{{ step.label }}</small
                ><b>{{ number(step.value) }}</b>
              </section>
              <em :class="{ danger: index > 2 }">{{ dropRate(index) }}</em>
            </div>
          </div>
          <footer>
            <Bot />
            <p>
              <b>Análise:</b> a maior perda acontece após a geração do lead. Revise velocidade do
              atendimento, proposta e acompanhamento comercial.
            </p>
          </footer>
        </article>
        <article class="control-panel alert-panel">
          <header>
            <div>
              <small>INTELIGÊNCIA</small>
              <h2>Alertas ativos</h2>
            </div>
            <b>{{ alerts.length }}</b>
          </header>
          <div v-for="alert in alerts" :key="alert.title" class="smart-alert" :class="alert.level">
            <AlertTriangle v-if="alert.level !== 'success'" /><CheckCircle2 v-else />
            <div>
              <b>{{ alert.title }}</b
              ><span>{{ alert.text }}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="control-panel campaign-panel">
        <header>
          <div>
            <small>PERFORMANCE</small>
            <h2>Campanhas</h2>
          </div>
          <span>Clique em uma campanha para analisar anúncios</span>
        </header>
        <div class="campaign-table">
          <div class="campaign-row campaign-head">
            <span>Campanha</span><span>Plataforma</span><span>Gasto</span><span>Leads</span
            ><span>Vendas</span><span>CPA</span><span>ROAS</span><span>Status</span><span></span>
          </div>
          <button
            v-for="item in visibleCampaigns"
            :key="item.id"
            class="campaign-row"
            @click="selectedCampaign = item"
          >
            <b>{{ item.name }}</b
            ><span>{{ item.platform }}</span
            ><span>{{ money(item.spend) }}</span
            ><span>{{ item.leads }}</span
            ><span>{{ item.sales }}</span
            ><span>{{ item.sales ? money(item.spend / item.sales) : '—' }}</span
            ><span>{{ ratio(item.revenue, item.spend).toFixed(1) }}x</span
            ><em :class="statusClass(item.status)">{{ item.status }}</em
            ><ChevronRight />
          </button>
        </div>
      </section>

      <section class="control-panel integrations-preview">
        <header>
          <div>
            <small>FONTES DE DADOS</small>
            <h2>Integrações</h2>
          </div>
        </header>
        <div>
          <article v-for="provider in providerDefinitions" :key="provider.id">
            <b>{{ provider.name }}</b
            ><span>{{ provider.description }}</span>
            <em :class="{ connected: integrationRecord(provider.id) }">
              {{ integrationRecord(provider.id) ? 'Configurado' : 'Não conectado' }}
            </em>
            <button @click="openIntegration(provider)">
              {{ integrationRecord(provider.id) ? 'Editar conexão' : 'Conectar' }}
            </button>
          </article>
        </div>
      </section>
    </main>

    <div v-if="selectedCampaign" class="campaign-modal" @click.self="selectedCampaign = null">
      <article>
        <button class="modal-close" @click="selectedCampaign = null"><X /></button
        ><small>DETALHE DA CAMPANHA</small>
        <h2>{{ selectedCampaign.name }}</h2>
        <span>{{ selectedCampaign.platform }}</span>
        <div class="campaign-detail-kpis">
          <div>
            <small>Gasto</small><b>{{ money(selectedCampaign.spend) }}</b>
          </div>
          <div>
            <small>Receita</small><b>{{ money(selectedCampaign.revenue) }}</b>
          </div>
          <div>
            <small>ROAS</small
            ><b>{{ ratio(selectedCampaign.revenue, selectedCampaign.spend).toFixed(2) }}x</b>
          </div>
          <div>
            <small>CPA</small
            ><b>{{
              selectedCampaign.sales ? money(selectedCampaign.spend / selectedCampaign.sales) : '—'
            }}</b>
          </div>
          <div>
            <small>CTR</small><b>{{ selectedCampaign.ctr }}%</b>
          </div>
          <div>
            <small>CPC</small><b>{{ money(selectedCampaign.cpc) }}</b>
          </div>
        </div>
        <h3>Campanha → conjunto → anúncio → criativo</h3>
        <div class="ad-list">
          <div v-for="ad in selectedCampaign.ads" :key="ad.name">
            <b>{{ ad.name }}</b
            ><span>CTR {{ ad.ctr }}%</span><span>CPA {{ money(ad.cpa) }}</span
            ><strong :class="{ bad: ad.roas < 1 }">ROAS {{ ad.roas }}x</strong>
          </div>
        </div>
      </article>
    </div>

    <div v-if="integrationModal" class="campaign-modal" @click.self="integrationModal = null">
      <form class="integration-form" @submit.prevent="saveIntegration">
        <button type="button" class="modal-close" @click="integrationModal = null"><X /></button>
        <small>CONEXÃO SEGURA</small>
        <h2>{{ integrationModal.name }}</h2>
        <p>{{ integrationModal.description }}</p>

        <label>
          Nome da conta
          <input
            v-model="integrationForm.accountName"
            required
            placeholder="Ex: Aguazul Principal"
          />
        </label>
        <label v-for="field in integrationModal.fields" :key="field.key">
          {{ field.label }}
          <input
            v-model="integrationForm.credentials[field.key]"
            :type="field.secret ? 'password' : 'text'"
            required
            autocomplete="off"
          />
        </label>

        <section v-if="integrationRecord(integrationModal.id)" class="edit-verification">
          <LockKeyhole />
          <div>
            <b>Alteração protegida</b>
            <span>Solicite o código enviado ao e-mail administrativo.</span>
          </div>
          <button type="button" @click="requestEditCode"><Mail /> Enviar código</button>
          <input
            v-model="integrationForm.code"
            inputmode="numeric"
            maxlength="6"
            placeholder="Código de 6 dígitos"
            required
          />
        </section>

        <p v-if="integrationMessage" class="integration-message">{{ integrationMessage }}</p>
        <p v-if="integrationError" class="integration-error">{{ integrationError }}</p>
        <button class="save-integration" :disabled="integrationSaving">
          <LockKeyhole /> {{ integrationSaving ? 'Criptografando...' : 'Salvar conexão segura' }}
        </button>
        <small class="security-note"
          >As credenciais são criptografadas no servidor e nunca retornam ao navegador.</small
        >
      </form>
    </div>
  </div>
</template>
