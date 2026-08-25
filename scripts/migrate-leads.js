import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env.')
}

const file = path.resolve('data/leads.json')
const leads = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

if (!leads.length) {
  console.log('Nenhum lead local para migrar.')
  process.exit(0)
}

const rows = leads.map((lead) => ({
  id: lead.id,
  visitor_id: lead.visitorId,
  payload: lead,
  first_seen: lead.firstSeen,
  last_seen: lead.lastSeen,
  updated_at: new Date().toISOString()
}))
const { error } = await supabase.from('lead_records').upsert(rows, { onConflict: 'visitor_id' })
if (error) throw error
console.log(`${rows.length} lead(s) migrado(s) para o Supabase.`)
