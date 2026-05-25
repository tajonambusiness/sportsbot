import { useEffect, useMemo, useState } from 'react'

const MARKET_PRICE = 44
const FALLBACKS = {
  accuweather: 70,
  nws: 58,
  openMeteo: 63,
}

const defaultMarket = {
  question: 'Will it rain in New York City tomorrow?',
  platform: 'Kalshi',
  marketType: 'Rain Market',
  location: {
    city: 'New York City',
    state: 'NY',
    country: 'US',
    latitude: 40.7128,
    longitude: -74.006,
    accuweatherLocationKey: '',
  },
}

const nextEdges = [
  { market: 'Will it rain in Miami tomorrow?', platform: 'Polymarket', forecast: '59%', price: '43¢', edge: '+16%', action: 'Watch', tone: 'watch' },
  { market: 'Will Chicago reach 80°F tomorrow?', platform: 'Kalshi', forecast: '57%', price: '47¢', edge: '+10%', action: 'Watch', tone: 'watch' },
  { market: 'Will it snow in Denver tomorrow?', platform: 'Kalshi', forecast: '27%', price: '31¢', edge: '-4%', action: 'Skip', tone: 'skip' },
]

const toneClass = {
  watch: 'text-watch border-watch/60 bg-watch/10',
  skip: 'text-skip border-skip/60 bg-skip/10',
}

function sourceResult(name, value, isLive, error = '') {
  return {
    name,
    value,
    status: isLive ? 'LIVE' : 'MOCK',
    isLive,
    error,
  }
}

export default function App() {
  const [market] = useState(defaultMarket)
  const [sources, setSources] = useState([
    sourceResult('AccuWeather', FALLBACKS.accuweather, false, 'Using mock seed value'),
    sourceResult('NWS', FALLBACKS.nws, false, 'Using mock seed value'),
    sourceResult('Open-Meteo', FALLBACKS.openMeteo, false, 'Using mock seed value'),
  ])
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState(new Date())

  useEffect(() => {
    const controller = new AbortController()
    const { location } = market

    async function loadOpenMeteo() {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=precipitation_probability_max&timezone=auto&forecast_days=2`
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) throw new Error('Open-Meteo request failed')
        const data = await response.json()
        const probability = data?.daily?.precipitation_probability_max?.[1]
        if (typeof probability === 'number' && probability >= 0 && probability <= 100) {
          return sourceResult('Open-Meteo', Math.round(probability), true)
        }
        throw new Error('Missing tomorrow precipitation probability')
      } catch (error) {
        return sourceResult('Open-Meteo', FALLBACKS.openMeteo, false, error?.message || 'Fallback used')
      }
    }

    async function loadNws() {
      try {
        const pointsRes = await fetch(`https://api.weather.gov/points/${location.latitude},${location.longitude}`, {
          signal: controller.signal,
          headers: { Accept: 'application/geo+json' },
        })
        if (!pointsRes.ok) throw new Error('NWS points failed')
        const pointsData = await pointsRes.json()
        const hourlyUrl = pointsData?.properties?.forecastHourly
        if (!hourlyUrl) throw new Error('NWS hourly URL missing')

        const hourlyRes = await fetch(hourlyUrl, {
          signal: controller.signal,
          headers: { Accept: 'application/geo+json' },
        })
        if (!hourlyRes.ok) throw new Error('NWS hourly fetch failed')
        const hourlyData = await hourlyRes.json()
        const periods = hourlyData?.properties?.periods
        if (!Array.isArray(periods)) throw new Error('NWS periods missing')

        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowYMD = tomorrow.toISOString().slice(0, 10)

        const tomorrowValues = periods
          .filter((p) => typeof p?.startTime === 'string' && p.startTime.slice(0, 10) === tomorrowYMD)
          .map((p) => p?.probabilityOfPrecipitation?.value)
          .filter((v) => typeof v === 'number')

        if (tomorrowValues.length) {
          const avg = Math.round(tomorrowValues.reduce((a, b) => a + b, 0) / tomorrowValues.length)
          return sourceResult('NWS', avg, true)
        }

        throw new Error('NWS tomorrow precipitation missing')
      } catch (error) {
        return sourceResult('NWS', FALLBACKS.nws, false, error?.message || 'Fallback used')
      }
    }

    async function loadAccuWeather() {
      const apiKey = import.meta.env.VITE_ACCUWEATHER_API_KEY
      if (!apiKey) {
        return sourceResult('AccuWeather', FALLBACKS.accuweather, false, 'Missing VITE_ACCUWEATHER_API_KEY')
      }

      try {
        let locationKey = location.accuweatherLocationKey

        if (!locationKey) {
          const lookupUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${location.latitude},${location.longitude}`
          const lookupRes = await fetch(lookupUrl, { signal: controller.signal })
          if (!lookupRes.ok) throw new Error('AccuWeather location lookup failed')
          const lookupData = await lookupRes.json()
          locationKey = lookupData?.Key
        }

        if (!locationKey) throw new Error('AccuWeather location key missing')

        const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/1day/${locationKey}?apikey=${apiKey}&details=true&metric=true`
        const forecastRes = await fetch(forecastUrl, { signal: controller.signal })
        if (!forecastRes.ok) throw new Error('AccuWeather forecast failed')
        const forecastData = await forecastRes.json()

        const dayChance = forecastData?.DailyForecasts?.[0]?.Day?.PrecipitationProbability
        const nightChance = forecastData?.DailyForecasts?.[0]?.Night?.PrecipitationProbability

        const vals = [dayChance, nightChance].filter((v) => typeof v === 'number')
        if (vals.length) {
          const probability = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          return sourceResult('AccuWeather', probability, true)
        }

        throw new Error('AccuWeather precipitation probability missing')
      } catch (error) {
        return sourceResult('AccuWeather', FALLBACKS.accuweather, false, error?.message || 'Fallback used')
      }
    }

    const adapters = [
      loadAccuWeather,
      loadNws,
      loadOpenMeteo,
    ]

    Promise.allSettled(adapters.map((adapter) => adapter())).then((results) => {
      const normalized = results.map((r, idx) => {
        if (r.status === 'fulfilled') return r.value
        return [
          sourceResult('AccuWeather', FALLBACKS.accuweather, false, 'Unhandled error'),
          sourceResult('NWS', FALLBACKS.nws, false, 'Unhandled error'),
          sourceResult('Open-Meteo', FALLBACKS.openMeteo, false, 'Unhandled error'),
        ][idx]
      })
      setSources(normalized)
      setLastWeatherUpdate(new Date())
    })

    return () => controller.abort()
  }, [market])

  const forecastProbability = useMemo(() => {
    const values = sources.map((s) => s.value)
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }, [sources])

  const sourceAgreement = useMemo(() => {
    const values = sources.map((s) => s.value)
    const spread = Math.max(...values) - Math.min(...values)
    return Math.max(0, Math.min(100, 100 - spread * 2))
  }, [sources])

  const edgeValue = forecastProbability - MARKET_PRICE
  const edgeDisplay = `${edgeValue >= 0 ? '+' : ''}${edgeValue}%`

  const confidence = useMemo(() => {
    const liveCount = sources.filter((s) => s.isLive).length
    const liveBoost = liveCount * 6
    return Math.max(35, Math.min(96, Math.round(sourceAgreement * 0.65 + 20 + liveBoost)))
  }, [sourceAgreement, sources])

  const action = edgeValue >= 8 && confidence >= 65 ? 'POSSIBLE YES ↑' : edgeValue >= 0 ? 'WATCH' : 'SKIP'

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
            <p className="text-lg font-semibold leading-tight sm:text-xl md:text-3xl">{market.question}</p>
            <p className="mt-1 text-sm text-slate-400 md:text-base">{market.platform} • {market.marketType} • {market.location.city}, {market.location.state}</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-xl border border-edge/20 bg-edge/5 p-3">
              <p className="text-[11px] uppercase text-slate-400">Edge</p>
              <p className={`mt-1 text-4xl font-bold leading-none sm:text-5xl ${edgeValue >= 0 ? 'text-edge' : 'text-skip'}`}>{edgeDisplay}</p>
              <p className={`mt-1.5 text-[11px] font-semibold uppercase tracking-wide sm:text-xs ${edgeValue >= 0 ? 'text-edge/90' : 'text-skip/90'}`}>
                {edgeValue >= 0 ? 'Strong Edge' : 'Negative Edge'}
              </p>
            </div>
            <div className="sm:col-span-2 rounded-xl border border-edge/40 bg-edge/10 p-3 text-center sm:p-4">
              <p className="text-4xl font-bold text-edge sm:text-5xl">{confidence}%</p>
              <p className="text-[11px] uppercase text-slate-300 sm:text-xs">Confidence</p>
            </div>
          </div>

          <div className="rounded-xl border border-edge/50 bg-gradient-to-r from-edge/25 to-edge/15 p-2.5 shadow-[0_0_0_1px_rgba(74,222,128,0.35),0_0_28px_rgba(74,222,128,0.28)]">
            <button className="w-full rounded-lg border border-edge/60 bg-edge/20 px-4 py-3 text-base font-bold tracking-wide text-edge transition hover:bg-edge/30">
              {action}
            </button>
            <p className="mt-2 text-center text-xs text-slate-300">Market looks undervalued.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-5">
            <Metric label="Market price" value={`${MARKET_PRICE}¢`} />
            <Metric label="Forecast probability" value={`${forecastProbability}%`} accent />
            <Metric label="Edge" value={edgeDisplay} accent={edgeValue >= 0} />
            <Metric label="Agreement" value={`${sourceAgreement}%`} />
            <Metric label="Liquidity" value="Good" accent />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="mb-2 text-[11px] uppercase text-slate-400 sm:text-xs">Sources</p>
            <div className="space-y-1.5 sm:space-y-2">
              {sources.map((source) => (
                <div key={source.name} className="flex items-center justify-between text-sm" title={source.error || undefined}>
                  <span className="inline-flex items-center gap-2">
                    {source.name}
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${source.isLive ? 'border-edge/60 bg-edge/10 text-edge' : 'border-watch/60 bg-watch/10 text-watch'}`}>
                      {source.status}
                    </span>
                  </span>
                  <span className="font-semibold text-electric">{source.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-center text-[11px] text-slate-300 sm:text-xs">
          Last weather update: <span className="font-semibold text-electric">{lastWeatherUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
        </div>

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
