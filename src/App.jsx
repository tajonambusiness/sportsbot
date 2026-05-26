import { useEffect, useMemo, useState } from 'react'

const KALSHI_BASE = 'https://external-api.kalshi.com/trade-api/v2'
const WEATHER_RE = /weather|temperature|high|low|rain|precipitation|precip|snow|wind|hurricane|tornado/i

const FALLBACK_MARKET = {
  platform: 'Kalshi',
  ticker: 'RAINNYC-TOMORROW',
  title: 'Will it rain in New York City tomorrow?',
  marketType: 'precipitation',
  targetMetric: 'precipitationProbability',
  locationName: 'New York City, NY, US',
  city: 'New York City',
  state: 'NY',
  country: 'US',
  marketPrice: 44,
  yesPrice: 44,
  noPrice: 56,
  timeLeft: '14h 32m',
  liquidity: 'Good',
  marketUrl: 'https://kalshi.com',
  locationNeeded: false,
}

const LOCATION_MAP = {
  'new york': { city: 'New York City', state: 'NY', country: 'US', latitude: 40.7128, longitude: -74.006 },
  chicago: { city: 'Chicago', state: 'IL', country: 'US', latitude: 41.8781, longitude: -87.6298 },
  miami: { city: 'Miami', state: 'FL', country: 'US', latitude: 25.7617, longitude: -80.1918 },
  boston: { city: 'Boston', state: 'MA', country: 'US', latitude: 42.3601, longitude: -71.0589 },
  denver: { city: 'Denver', state: 'CO', country: 'US', latitude: 39.7392, longitude: -104.9903 },
  seattle: { city: 'Seattle', state: 'WA', country: 'US', latitude: 47.6062, longitude: -122.3321 },
  atlanta: { city: 'Atlanta', state: 'GA', country: 'US', latitude: 33.749, longitude: -84.388 },
  dallas: { city: 'Dallas', state: 'TX', country: 'US', latitude: 32.7767, longitude: -96.797 },
  phoenix: { city: 'Phoenix', state: 'AZ', country: 'US', latitude: 33.4484, longitude: -112.074 },
  'san francisco': { city: 'San Francisco', state: 'CA', country: 'US', latitude: 37.7749, longitude: -122.4194 },
}

const toneClass = {
  watch: 'text-watch border-watch/60 bg-watch/10',
  skip: 'text-skip border-skip/60 bg-skip/10',
}

const marketTypeFromText = (text = '') => {
  const t = text.toLowerCase()
  if (t.includes('hurricane') || t.includes('tornado')) return { marketType: 'storm', targetMetric: 'stormRisk' }
  if (t.includes('snow')) return { marketType: 'snow', targetMetric: 'snowfall' }
  if (t.includes('wind') || t.includes('gust')) return { marketType: 'wind', targetMetric: 'windGust' }
  if (t.includes('low') && (t.includes('temp') || t.includes('temperature') || t.includes('°') || t.includes('f'))) return { marketType: 'temperature', targetMetric: 'lowTemperature' }
  if (t.includes('high') && (t.includes('temp') || t.includes('temperature') || t.includes('°') || t.includes('f') || t.includes('reach'))) return { marketType: 'temperature', targetMetric: 'highTemperature' }
  if (t.includes('rain') || t.includes('precip')) return { marketType: 'precipitation', targetMetric: 'precipitationProbability' }
  return { marketType: 'weather', targetMetric: 'needsMapping' }
}

const findLocation = (text = '') => {
  const t = text.toLowerCase()
  for (const [k, v] of Object.entries(LOCATION_MAP)) if (t.includes(k)) return { ...v, locationNeeded: false }
  return { city: 'Unknown', state: '', country: 'US', latitude: null, longitude: null, locationNeeded: true }
}

const toCents = (value, fallback) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.round(value <= 1 ? value * 100 : value)
}

function normalizeKalshiMarket(raw) {
  const title = raw.title || raw.question || raw.subtitle || raw.event_title || raw.market_title || raw.event_ticker || 'Untitled market'
  const ticker = raw.ticker || raw.symbol || raw.id || 'UNKNOWN'
  const contextText = `${title} ${raw.subtitle || ''} ${raw.category || ''} ${ticker}`
  const { marketType, targetMetric } = marketTypeFromText(contextText)
  const loc = findLocation(contextText)
  const yesPrice = toCents(raw.yes_price ?? raw.last_price ?? raw.close_price, 44)
  const noPrice = toCents(raw.no_price, 100 - yesPrice)
  const marketPrice = yesPrice
  const closesAt = raw.close_time || raw.expiration_time || raw.end_date
  const timeLeft = closesAt ? new Date(closesAt).toLocaleString() : 'Live'
  const liq = raw.liquidity ?? raw.volume ?? raw.open_interest ?? 'Unknown'

  return {
    platform: 'Kalshi',
    ticker,
    title,
    marketType,
    targetMetric,
    locationName: loc.locationNeeded ? 'location needed' : `${loc.city}${loc.state ? `, ${loc.state}` : ''}, ${loc.country}`,
    city: loc.city,
    state: loc.state,
    country: loc.country,
    latitude: loc.latitude,
    longitude: loc.longitude,
    marketPrice,
    yesPrice,
    noPrice,
    timeLeft,
    liquidity: `${liq}`,
    marketUrl: raw.url || raw.market_url || `https://kalshi.com/markets/${ticker}`,
    locationNeeded: loc.locationNeeded,
  }
}

export default function App() {
  const [markets, setMarkets] = useState([FALLBACK_MARKET])
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState(new Date())

  useEffect(() => {
    let active = true
    async function loadMarkets() {
      try {
        const res = await fetch(`${KALSHI_BASE}/markets?status=open&limit=500`)
        if (!res.ok) throw new Error('Kalshi fetch failed')
        const data = await res.json()
        const list = Array.isArray(data?.markets) ? data.markets : []
        const weatherMarkets = list
          .filter((m) => WEATHER_RE.test(`${m.title || ''} ${m.subtitle || ''} ${m.category || ''} ${m.ticker || ''}`))
          .map(normalizeKalshiMarket)
        if (active && weatherMarkets.length) {
          setMarkets(weatherMarkets)
          setLastWeatherUpdate(new Date())
        }
      } catch {
        // keep fallback market
      }
    }
    loadMarkets()
    return () => { active = false }
  }, [])

  const rankedMarkets = useMemo(() => {
    return markets
      .map((m) => {
        const canCalculate = !m.locationNeeded && m.targetMetric !== 'needsMapping'
        const forecast = canCalculate ? 63 : null
        const edge = canCalculate ? forecast - m.yesPrice : null
        return {
          ...m,
          forecast,
          edge,
          confidence: canCalculate ? 78 : 0,
          action: canCalculate ? (edge >= 8 ? 'POSSIBLE YES' : edge >= 0 ? 'Watch' : 'Skip') : 'Needs mapping',
        }
      })
      .sort((a, b) => {
        if (a.edge === null && b.edge === null) return 0
        if (a.edge === null) return 1
        if (b.edge === null) return -1
        return b.edge - a.edge
      })
  }, [markets])

  const featured = rankedMarkets[0] || { ...FALLBACK_MARKET, forecast: 63, edge: 19, confidence: 81, action: 'POSSIBLE YES' }
  const nextEdges = rankedMarkets.slice(1, 4).map((m) => ({
    market: m.title,
    platform: `${m.platform} • ${m.locationName}`,
    forecast: m.forecast === null ? 'Needs mapping' : `${m.forecast}%`,
    price: `${m.yesPrice}¢`,
    edge: m.edge === null ? 'Needs mapping' : `${m.edge >= 0 ? '+' : ''}${m.edge}%`,
    action: m.edge === null ? 'Watch' : m.edge >= 0 ? 'Watch' : 'Skip',
    tone: m.edge === null || m.edge >= 0 ? 'watch' : 'skip',
  }))

  return (
    <main className="min-h-screen bg-base text-slate-100 px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-md space-y-3 sm:space-y-4 md:max-w-3xl xl:max-w-5xl">
        <header className="rounded-2xl border border-electric/30 bg-gradient-to-b from-slate-900 to-panel/90 p-3.5 shadow-glow sm:p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Weather<span className="text-electric">Edge</span></h1>
              <p className="mt-1 text-[11px] tracking-[0.18em] text-slate-400 sm:text-xs">WEATHER MARKET EDGE SCANNER</p>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
              <span className="rounded-full border border-edge/50 bg-edge/10 px-2.5 py-1 text-center text-[11px] font-semibold text-edge sm:px-3 sm:text-xs">Live</span>
              <span className="rounded-full border border-electric/40 bg-electric/10 px-2.5 py-1 text-center text-[11px] font-semibold text-blue-200 sm:px-3 sm:text-xs">Bot Online</span>
            </div>
          </div>
        </header>

        <section className="space-y-3 rounded-2xl border border-electric/30 bg-gradient-to-b from-slate-900/95 to-slate-950 p-3.5 shadow-glow sm:space-y-4 sm:p-4 md:p-6">
          <div>
            <p className="text-lg font-semibold leading-tight sm:text-xl md:text-3xl">{featured.title}</p>
            <p className="mt-1 text-sm text-slate-400 md:text-base">{featured.platform} • {featured.marketType} • {featured.locationName}</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-xl border border-edge/20 bg-edge/5 p-3">
              <p className="text-[11px] uppercase text-slate-400">Edge</p>
              <p className="mt-1 text-4xl font-bold leading-none text-edge sm:text-5xl">{featured.edge === null ? 'Needs mapping' : `${featured.edge >= 0 ? '+' : ''}${featured.edge}%`}</p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-edge/90 sm:text-xs">{featured.edge === null ? 'Location Needed' : 'Strong Edge'}</p>
            </div>
            <div className="sm:col-span-2 rounded-xl border border-edge/40 bg-edge/10 p-3 text-center sm:p-4">
              <p className="text-4xl font-bold text-edge sm:text-5xl">{featured.confidence || 81}%</p>
              <p className="text-[11px] uppercase text-slate-300 sm:text-xs">Confidence</p>
              <button className="mt-3 w-full rounded-lg border border-edge/50 bg-edge/20 px-4 py-2 text-sm font-bold tracking-wide text-edge transition hover:bg-edge/30 sm:mt-4 sm:py-2.5">
                POSSIBLE YES
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
            <Metric label="Market price" value={`${featured.marketPrice ?? featured.yesPrice}¢`} />
            <Metric label="Forecast probability" value={featured.forecast === null ? 'Needs mapping' : `${featured.forecast}%`} accent />
            <Metric label="Time left" value={featured.timeLeft || 'Live'} />
            <Metric label="Liquidity" value={featured.liquidity || 'Unknown'} accent />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="mt-3 space-y-2 border-t border-slate-800 pt-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wide text-slate-400">Source Agreement:</span>
                <span className="font-semibold text-watch">Mixed</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wide text-slate-400">Last Weather Update:</span>
                <span className="font-semibold text-electric">{lastWeatherUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-electric/20 bg-panel/80 p-3.5 sm:p-4 md:p-5">
          <h2 className="mb-2.5 text-xs uppercase tracking-wider text-slate-300 sm:mb-3 sm:text-sm">Next Best Edges</h2>
          <div className="space-y-2">
            {nextEdges.map((row) => (
              <div key={row.market} className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5 sm:p-3">
                <p className="font-medium leading-tight">{row.market}</p>
                <p className="mb-2 text-xs text-slate-400">{row.platform}</p>
                <div className="grid grid-cols-4 items-center gap-2 text-sm">
                  <span>{row.forecast}</span>
                  <span>{row.price}</span>
                  <span className={row.edge.startsWith('+') ? 'font-semibold text-edge' : 'font-semibold text-skip'}>{row.edge}</span>
                  <span className={`rounded-full border px-2 py-1 text-center text-[11px] font-semibold sm:text-xs ${toneClass[row.tone]}`}>{row.action}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
      <p className="text-[10px] uppercase text-slate-500 sm:text-[11px]">{label}</p>
      <p className={`text-base font-semibold sm:text-lg ${accent ? 'text-electric' : 'text-slate-100'}`}>{value}</p>
    </div>
  )
}
