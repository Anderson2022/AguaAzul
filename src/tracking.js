const key = 'aguazul_visitor'
const visitorId = localStorage.getItem(key) || crypto.randomUUID()
localStorage.setItem(key, visitorId)
const qs = new URLSearchParams(location.search)
export async function track(event, data = {}) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        event,
        data,
        page: location.pathname,
        source: qs.get('utm_source') || document.referrer || 'Direto',
        medium: qs.get('utm_medium') || '',
        campaign: qs.get('utm_campaign') || '',
        referrer: document.referrer || '',
        landingPage: `${location.pathname}${location.search}`
      })
    })
  } catch {}
}
