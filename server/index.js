import 'dotenv/config'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const app = express()
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dataDir = path.join(root, 'data')
const dataFile = path.join(dataDir, 'leads.json')
const integrationsFile = path.join(dataDir, 'integrations.json')
const PORT = process.env.PORT || 4174
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || 'aguaazul2026'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY
const supabase =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null
const verificationCodes = new Map()
const allowedProviders = new Set(['meta', 'google_ads', 'google_analytics', 'whatsapp'])
let mtMapCache = null

app.set('trust proxy', true)
app.use(express.json({ limit: '100kb' }))
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]')
if (!fs.existsSync(integrationsFile)) fs.writeFileSync(integrationsFile, '[]')

const readLocal = () => {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  } catch {
    return []
  }
}
const writeLocal = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2))
const read = async () => {
  if (!supabase) return readLocal()
  const { data, error } = await supabase
    .from('lead_records')
    .select('payload')
    .order('last_seen', { ascending: false })
    .limit(5000)
  if (error) throw error
  return data.map((row) => row.payload)
}
const write = async (data) => {
  if (!supabase) return writeLocal(data)
  const rows = data.map((lead) => ({
    id: lead.id,
    visitor_id: lead.visitorId,
    payload: lead,
    first_seen: lead.firstSeen,
    last_seen: lead.lastSeen,
    updated_at: new Date().toISOString()
  }))
  const { error } = await supabase.from('lead_records').upsert(rows, { onConflict: 'visitor_id' })
  if (error) throw error
}
const safe = (value, max = 300) =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .slice(0, max)
const adminAuthorized = (req) => req.headers.authorization === `Bearer ${PANEL_PASSWORD}`
const encryptionKey = () => {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!secret || secret.length < 32) throw new Error('INTEGRATION_ENCRYPTION_KEY não configurada')
  return crypto.scryptSync(secret, 'aguazul-integrations-v1', 32)
}
const encryptCredentials = (credentials) => {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), 'utf8'),
    cipher.final()
  ])
  return [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url')
  ].join('.')
}
const readIntegrations = async () => {
  if (!supabase) return JSON.parse(fs.readFileSync(integrationsFile, 'utf8'))
  const { data, error } = await supabase
    .from('integrations')
    .select('id,provider,account_name,status,connected_at,updated_at')
    .order('provider')
  if (error) throw error
  return data
}
const findIntegration = async (provider) =>
  (await readIntegrations()).find((item) => item.provider === provider)
const saveIntegration = async (record) => {
  if (supabase) {
    const { error } = await supabase.from('integrations').upsert(record, { onConflict: 'provider' })
    if (error) throw error
    return
  }
  const rows = await readIntegrations()
  const index = rows.findIndex((item) => item.provider === record.provider)
  if (index >= 0) rows[index] = { ...rows[index], ...record }
  else rows.push({ id: crypto.randomUUID(), connected_at: new Date().toISOString(), ...record })
  fs.writeFileSync(integrationsFile, JSON.stringify(rows, null, 2))
}

const socialSource = (source = '', referrer = '') => {
  const value = `${source} ${referrer}`.toLowerCase()
  const channels = [
    ['Instagram', ['instagram', 'ig']],
    ['Facebook', ['facebook', 'fb']],
    ['TikTok', ['tiktok']],
    ['YouTube', ['youtube', 'youtu.be']],
    ['WhatsApp', ['whatsapp', 'wa.me']],
    ['Google', ['google', 'googleads', 'gclid']],
    ['Bing', ['bing']],
    ['LinkedIn', ['linkedin']],
    ['X / Twitter', ['twitter', 't.co', 'x.com']]
  ]
  const matchedChannel = channels.find(([, terms]) =>
    terms.some((term) => value.includes(term))
  )?.[0]
  if (matchedChannel) return matchedChannel
  return source === 'Direto' ? 'Acesso direto' : safe(source, 120)
}

const visitorIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  return safe((Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) || req.ip, 80)
    .replace('::ffff:', '')
    .trim()
}

const isLocalIp = (ip) =>
  !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.')

async function locateIp(ip) {
  try {
    // Em desenvolvimento, consulta o IP público da conexão para que acessos
    // feitos na rede local também possam ser visualizados no mapa.
    const endpoint = isLocalIp(ip)
      ? 'https://ipwho.is/'
      : `https://ipwho.is/${encodeURIComponent(ip)}`
    const response = await fetch(`${endpoint}?fields=success,city,region,country,country_code`, {
      signal: AbortSignal.timeout(3500)
    })
    const geo = await response.json()
    if (!geo.success) throw new Error('location unavailable')
    return {
      geoCity: safe(geo.city, 100),
      geoState: safe(geo.region, 100),
      geoCountry: safe(geo.country, 100),
      geoCountryCode: safe(geo.country_code, 3)
    }
  } catch {
    return { geoCity: 'Não identificada', geoState: '', geoCountry: '' }
  }
}

app.post('/api/track', async (req, res) => {
  const {
    visitorId,
    event,
    page,
    source,
    medium,
    campaign,
    referrer,
    landingPage,
    data = {}
  } = req.body || {}
  if (!visitorId || !event) return res.status(400).json({ error: 'invalid' })
  const records = await read()
  const now = new Date().toISOString()
  let lead = records.find((item) => item.visitorId === visitorId)
  if (!lead) {
    const ip = visitorIp(req)
    const location = await locateIp(ip)
    lead = {
      id: crypto.randomUUID(),
      visitorId: safe(visitorId, 80),
      firstSeen: now,
      lastSeen: now,
      source: socialSource(source || 'Direto', referrer),
      sourceDetail: safe(source || 'Direto', 180),
      medium: safe(medium, 80),
      campaign: safe(campaign, 120),
      referrer: safe(referrer, 300),
      landingPage: safe(landingPage || page, 300),
      ...location,
      views: 0,
      whatsappClicks: 0,
      status: 'Novo',
      events: []
    }
    records.unshift(lead)
  } else if (!lead.geoCity || ['Ambiente local', 'Não identificada'].includes(lead.geoCity)) {
    Object.assign(lead, await locateIp(visitorIp(req)))
  }
  lead.lastSeen = now
  if (event === 'page_view') lead.views += 1
  if (event === 'whatsapp_click') lead.whatsappClicks += 1
  if (event === 'form_submit')
    Object.assign(lead, {
      name: safe(data.name, 100),
      email: safe(data.email, 150),
      phone: safe(data.phone, 40),
      city: safe(data.city, 100),
      size: safe(data.size, 40),
      timeline: safe(data.timeline, 40),
      message: safe(data.message, 500),
      status: 'Contato solicitado'
    })
  lead.events.unshift({ type: safe(event, 40), at: now, page: safe(page, 160) })
  lead.events = lead.events.slice(0, 50)
  await write(records.slice(0, 5000))
  res.json({ ok: true })
})

app.post('/api/admin/login', (req, res) =>
  res
    .status(req.body?.password === PANEL_PASSWORD ? 200 : 401)
    .json({ ok: req.body?.password === PANEL_PASSWORD })
)
app.get('/api/admin/leads', async (req, res) => {
  if (req.headers.authorization !== `Bearer ${PANEL_PASSWORD}`)
    return res.status(401).json({ error: 'unauthorized' })
  res.json(await read())
})
app.get('/api/admin/map/mt', async (req, res) => {
  if (req.headers.authorization !== `Bearer ${PANEL_PASSWORD}`)
    return res.status(401).json({ error: 'unauthorized' })
  try {
    if (!mtMapCache) {
      const url =
        'https://servicodados.ibge.gov.br/api/v3/malhas/estados/51?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio'
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) })
      if (!response.ok) throw new Error('IBGE unavailable')
      mtMapCache = await response.json()
      const citiesResponse = await fetch(
        'https://servicodados.ibge.gov.br/api/v1/localidades/estados/51/municipios',
        { signal: AbortSignal.timeout(12000) }
      )
      if (citiesResponse.ok) {
        const cities = await citiesResponse.json()
        const names = new Map(cities.map((city) => [String(city.id), city.nome]))
        mtMapCache.features?.forEach((feature) => {
          const code = String(
            feature.properties?.codarea || feature.properties?.id || feature.id || ''
          )
          feature.properties = { ...feature.properties, name: names.get(code) || code }
        })
      }
    }
    res.json(mtMapCache)
  } catch {
    res.status(503).json({ error: 'Não foi possível carregar a malha do IBGE.' })
  }
})
app.patch('/api/admin/leads/:id', async (req, res) => {
  if (req.headers.authorization !== `Bearer ${PANEL_PASSWORD}`)
    return res.status(401).json({ error: 'unauthorized' })
  const records = await read()
  const lead = records.find((x) => x.id === req.params.id)
  if (!lead) return res.status(404).json({ error: 'not found' })
  lead.status = safe(req.body.status, 40)
  await write(records)
  res.json({ ok: true })
})

app.get('/api/admin/integrations', async (req, res) => {
  if (!adminAuthorized(req)) return res.status(401).json({ error: 'unauthorized' })
  res.json(
    (await readIntegrations()).map(({ encrypted_credentials, ...integration }) => integration)
  )
})

app.post('/api/admin/integrations/:provider/request-code', async (req, res) => {
  if (!adminAuthorized(req)) return res.status(401).json({ error: 'unauthorized' })
  const provider = safe(req.params.provider, 40)
  if (!allowedProviders.has(provider)) return res.status(400).json({ error: 'Provedor inválido.' })
  if (!(await findIntegration(provider)))
    return res.status(400).json({ error: 'Esta integração ainda não possui dados para editar.' })
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, ADMIN_EMAIL } =
    process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !ADMIN_EMAIL)
    return res
      .status(503)
      .json({ error: 'O envio de e-mail ainda não foi configurado no servidor.' })
  const code = String(crypto.randomInt(100000, 999999))
  verificationCodes.set(provider, {
    hash: crypto.createHash('sha256').update(code).digest('hex'),
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0
  })
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
  })
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: ADMIN_EMAIL,
    subject: 'Código de segurança — Aguazul Controle',
    text: `Seu código para editar a integração ${provider} é ${code}. Ele expira em 10 minutos.`
  })
  res.json({ ok: true, destination: ADMIN_EMAIL.replace(/(^.).*(@.*$)/, '$1***$2') })
})

app.put('/api/admin/integrations/:provider', async (req, res) => {
  if (!adminAuthorized(req)) return res.status(401).json({ error: 'unauthorized' })
  const provider = safe(req.params.provider, 40)
  if (!allowedProviders.has(provider)) return res.status(400).json({ error: 'Provedor inválido.' })
  const existing = await findIntegration(provider)
  if (existing) {
    const verification = verificationCodes.get(provider)
    const suppliedHash = crypto
      .createHash('sha256')
      .update(String(req.body?.code || ''))
      .digest('hex')
    if (
      !verification ||
      verification.expiresAt < Date.now() ||
      verification.hash !== suppliedHash
    ) {
      if (verification) verification.attempts += 1
      if (verification?.attempts >= 5) {
        verificationCodes.delete(provider)
        return res.status(429).json({ error: 'Muitas tentativas. Solicite um novo código.' })
      }
      return res.status(403).json({ error: 'Código inválido ou expirado.' })
    }
  }
  const credentials = req.body?.credentials
  if (!credentials || typeof credentials !== 'object' || !Object.keys(credentials).length)
    return res.status(400).json({ error: 'Informe as credenciais da integração.' })
  const cleanCredentials = Object.fromEntries(
    Object.entries(credentials)
      .slice(0, 20)
      .map(([key, value]) => [safe(key, 60), safe(value, 2000)])
  )
  await saveIntegration({
    provider,
    account_name: safe(req.body.accountName, 120),
    encrypted_credentials: encryptCredentials(cleanCredentials),
    status: 'configured',
    updated_at: new Date().toISOString()
  })
  verificationCodes.delete(provider)
  res.json({ ok: true })
})

app.use('/api', (error, req, res, next) => {
  console.error('API error:', error.message)
  if (res.headersSent) return next(error)
  res.status(500).json({ error: error.message || 'Erro interno do servidor.' })
})

const dist = path.join(root, 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) =>
    req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()
  )
}
app.listen(PORT, () => console.log(`Aguazul API: http://localhost:${PORT}`))
