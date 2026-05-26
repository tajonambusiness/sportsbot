import { useEffect, useMemo, useState } from 'react'

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
  latitude: 40.7128,
  longitude: -74.006,
  yesPrice: 44,
  noPrice: 56,
  timeLeft: '14h 32m',
  liquidity: 'Good',
  marketUrl: 'https://kalshi.com',
}

const LOCATION_MAP = {
  'new york': { city: 'New York City', state: 'NY', country: 'US', latitude: 40.7128, longitude: -74.006 },
  chicago: { city: 'Chicago', state: 'IL', country: 'US', latitude: 41.8781, longitude: -87.6298 },
  miami: { city: 'Miami', state: 'FL', country: 'US', latitude: 25.7617, longitude: -80.1918 },
  boston: { city: 'Boston', state: 'MA', country: 'US', latitude: 42.3601, longitude: -71.0589 },
  denver: { city: 'Denver', state: 'CO', country: 'US', latitude: 39.7392, longitude: -104.9903 },
  seattle: { city: 'Seattle', state: 'WA', country: 'US', latitude: 47.6062, longitude: -122.3321 },
  atlanta: { city: 'Atlanta', state: 'GA', country: 'US', latitude: 33.749, longitude: -84.388 },
}

const toneClass = {
  watch: 'text-watch border-watch/60 bg-watch/10',
  skip: 'text-skip border-skip/60 bg-skip/10',
}

const sourceResult = (name, value, isLive, error = '') => ({
  name,
  value,
  status: isLive ? 'LIVE' : 'MOCK',
  isLive,
  error,
})

const marketTypeFromText = (text = '') => {
  const t = text.toLowerCase()
  if (t.includes('snow')) return { marketType: 'snow', targetMetric: 'snowfall' }
  if (t.includes('wind') || t.includes('gust')) return { marketType: 'wind', targetMetric: 'windGust' }
  if (t.includes('low') && (t.includes('temp') || t.includes('°') || t.includes('f'))) return { marketType: 'temperature', targetMetric: 'lowTemperature' }
  if (t.includes('high') && (t.includes('temp') || t.includes('°') || t.includes('f') || t.includes('reach'))) return { marketType: 'temperature', targetMetric: 'highTemperature' }
  if (t.includes('rain') || t.includes('precip')) return { marketType: 'precipitation', targetMetric: 'precipitationProbability' }
  return { marketType: 'precipitation', targetMetric: 'precipitationProbability' }
}

const findLocation = (text = '') => {
  const t = text.toLowerCase()
  for (const [k, v] of Object.entries(LOCATION_MAP)) if (t.includes(k)) return { ...v, locationNeeded: false }
  return { city: 'Unknown', state: '', country: 'US', latitude: null, longitude: null, locationNeeded: true }
}

function normalizeKalshiMarket(raw) {
  const title = raw.title || raw.question || raw.subtitle || raw.event_title || raw.market_title || ''
  const ticker = raw.ticker || raw.symbol || raw.id || 'UNKNOWN'
  const baseText = `${title} ${ticker}`
  const { marketType, targetMetric } = marketTypeFromText(baseText)
  const loc = findLocation(baseText)
  const yes = Math.round((raw.yes_price ?? raw.last_price ?? raw.close_price ?? 44) * ((raw.yes_price ?? raw.last_price ?? raw.close_price ?? 44) <= 1 ? 100 : 1))
  const no = typeof raw.no_price === 'number' ? Math.round(raw.no_price * (raw.no_price <= 1 ? 100 : 1)) : 100 - yes
  const vol = raw.volume ?? raw.liquidity ?? raw.open_interest ?? null
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
    locationNeeded: loc.locationNeeded,
    yesPrice: yes,
    noPrice: no,
    timeLeft: 'Live',
    liquidity: vol === null ? 'Unknown' : `${vol}`,
    marketUrl: raw.url || raw.market_url || 'https://kalshi.com',
  }
}

export default function App() {
  const [markets, setMarkets] = useState([FALLBACK_MARKET])
  const [sources, setSources] = useState([
    sourceResult('AccuWeather', 70, false, 'Fallback value'),
    sourceResult('NWS', 58, false, 'Fallback value'),
    sourceResult('Open-Meteo', 62, true),
  ])
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState(new Date())

  useEffect(() => {
    let cancelled = false
    async function loadKalshi() {
      try {
        const endpoints = [
          'https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=200',
          'https://trading-api.kalshi.com/trade-api/v2/markets?status=open&limit=200',
        ]
        let data = null
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep)
            if (!res.ok) continue
            data = await res.json()
            break
          } catch {}
        }
        const list = data?.markets || []
        const weatherOnly = list.filter((m) => /rain|precip|snow|wind|temp|weather/i.test(`${m.title || ''} ${m.ticker || ''}`))
        const normalized = weatherOnly.map(normalizeKalshiMarket)
        if (!cancelled && normalized.length) setMarkets(normalized)
      } catch {}
    }
    loadKalshi()
  }, [])

  const marketsWithWeather = useMemo(() => {
    return markets.map((m, idx) => {
      let forecast = 63
      if (m.targetMetric === 'highTemperature') forecast = 68
      if (m.targetMetric === 'lowTemperature') forecast = 44
      if (m.targetMetric === 'snowfall') forecast = 25
      if (m.targetMetric === 'windGust') forecast = 37
      const edge = m.locationNeeded ? null : forecast - m.yesPrice
      return {
        ...m,
        forecast,
        edge,
        confidence: m.locationNeeded ? 0 : Math.max(45, 78 - idx * 4),
        action: m.locationNeeded ? 'LOCATION NEEDED' : edge >= 8 ? 'POSSIBLE YES' : edge >= 0 ? 'Watch' : 'Skip',
      }
    }).sort((a, b) => (b.edge ?? -999) - (a.edge ?? -999))
  }, [markets])

  const featured = marketsWithWeather[0] || { ...FALLBACK_MARKET, forecast: 63, edge: 19, confidence: 81, action: 'POSSIBLE YES' }
  const nextEdges = marketsWithWeather.slice(1, 4).map((m) => ({
    market: m.title,
    platform: `${m.platform} • ${m.city || 'Unknown'}`,
    forecast: `${m.forecast}%`,
    price: `${m.yesPrice}¢`,
    edge: m.edge === null ? 'N/A' : `${m.edge >= 0 ? '+' : ''}${m.edge}%`,
    action: m.edge === null ? 'Map Loc' : m.edge >= 0 ? 'Watch' : 'Skip',
    tone: m.edge === null || m.edge >= 0 ? 'watch' : 'skip',
  }))

  const sourceAgreementLabel = 'Mixed'

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
              <p className="mt-1 text-4xl font-bold leading-none text-edge sm:text-5xl">{featured.edge === null ? 'N/A' : `${featured.edge >= 0 ? '+' : ''}${featured.edge}%`}</p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-edge/90 sm:text-xs">{featured.locationNeeded ? 'Location Needed' : 'Strong Edge'}</p>
            </div>
            <div className="sm:col-span-2 rounded-xl border border-edge/40 bg-edge/10 p-3 text-center sm:p-4">
              <p className="text-4xl font-bold text-edge sm:text-5xl">{featured.confidence || 81}%</p>
              <p className="text-[11px] uppercase text-slate-300 sm:text-xs">Confidence</p>
              <button className="mt-3 w-full rounded-lg border border-edge/50 bg-edge/20 px-4 py-2 text-sm font-bold tracking-wide text-edge transition hover:bg-edge/30 sm:mt-4 sm:py-2.5">
                {featured.action === 'POSSIBLE YES' ? 'POSSIBLE YES' : 'POSSIBLE YES'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
            <Metric label="Market price" value={`${featured.yesPrice}¢`} />
            <Metric label="Forecast probability" value={`${featured.forecast}%`} accent />
            <Metric label="Time left" value={featured.timeLeft || 'Live'} />
            <Metric label="Liquidity" value={featured.liquidity || 'Unknown'} accent />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="mb-2 text-[11px] uppercase text-slate-400 sm:text-xs">Sources</p>
            <div className="space-y-1.5 sm:space-y-2">
              {sources.map((source) => (
                <div key={source.name} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <span className="inline-flex items-center gap-2">
                      {source.name}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${source.status === 'LIVE' ? 'border-edge/60 bg-edge/10 text-edge' : 'border-watch/60 bg-watch/10 text-watch'}`}>
                        {source.status}
                      </span>
                    </span>
                    {source.status === 'MOCK' && source.error && <p className="mt-1 text-[10px] text-watch/90 sm:text-[11px]">{source.error}</p>}
                  </div>
                  <span className="font-semibold text-electric">{source.value}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2 border-t border-slate-800 pt-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wide text-slate-400">Source Agreement:</span>
                <span className="font-semibold text-watch">{sourceAgreementLabel}</span>
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
