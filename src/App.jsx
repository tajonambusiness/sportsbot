const sourceData = [
  { name: 'AccuWeather', value: 70 },
  { name: 'NWS', value: 58 },
  { name: 'Open-Meteo', value: 62 },
]

const nextEdges = [
  { market: 'Will it rain in Miami tomorrow?', platform: 'Polymarket', forecast: '59%', price: '43¢', edge: '+16%', action: 'Watch', tone: 'watch' },
  { market: 'Will Chicago reach 80°F tomorrow?', platform: 'Kalshi', forecast: '57%', price: '47¢', edge: '+10%', action: 'Watch', tone: 'watch' },
  { market: 'Will it snow in Denver tomorrow?', platform: 'Kalshi', forecast: '27%', price: '31¢', edge: '-4%', action: 'Skip', tone: 'skip' },
]

const toneClass = {
  watch: 'text-watch border-watch/60 bg-watch/10',
  skip: 'text-skip border-skip/60 bg-skip/10',
}

export default function App() {
  return (
    <main className="min-h-screen bg-base text-slate-100 px-3 py-5 sm:px-6 md:py-8 lg:py-10">
      <div className="mx-auto w-full max-w-md space-y-4 md:max-w-2xl lg:max-w-3xl">
        <header className="rounded-2xl border border-electric/30 bg-gradient-to-b from-slate-900 to-panel/90 p-4 shadow-glow md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Weather<span className="text-electric">Edge</span></h1>
              <p className="mt-1 text-xs tracking-[0.2em] text-slate-400">WEATHER MARKET EDGE SCANNER</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <span className="rounded-full border border-edge/50 bg-edge/10 px-3 py-1 text-center text-xs font-semibold text-edge">Live</span>
              <span className="rounded-full border border-electric/40 bg-electric/10 px-3 py-1 text-center text-xs font-semibold text-blue-200">Bot Online</span>
            </div>
          </div>
        </header>

        <section className="space-y-4 rounded-2xl border border-electric/30 bg-gradient-to-b from-slate-900/95 to-slate-950 p-4 shadow-glow md:p-6">
          <div>
            <p className="text-xl font-semibold md:text-3xl">Will it rain in New York City tomorrow?</p>
            <p className="mt-1 text-slate-400">Kalshi • Rain Market</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-edge/20 bg-edge/5 p-3">
              <p className="text-xs uppercase text-slate-400">Edge</p>
              <p className="mt-1 text-5xl font-bold leading-none text-edge">+19%</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-edge/90">Strong Edge</p>
            </div>
            <div className="sm:col-span-2 rounded-xl border border-edge/40 bg-edge/10 p-4 text-center">
              <p className="text-5xl font-bold text-edge">81%</p>
              <p className="text-xs uppercase text-slate-300">Confidence</p>
              <button className="mt-4 w-full rounded-lg border border-edge/50 bg-edge/20 px-4 py-2.5 text-sm font-bold tracking-wide text-edge transition hover:bg-edge/30">
                POSSIBLE YES
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <Metric label="Market price" value="44¢" />
            <Metric label="Forecast probability" value="63%" accent />
            <Metric label="Time left" value="14h 32m" />
            <Metric label="Liquidity" value="Good" accent />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="mb-2 text-xs uppercase text-slate-400">Sources</p>
            <div className="space-y-2">
              {sourceData.map((source) => (
                <div key={source.name} className="flex items-center justify-between text-sm">
                  <span>{source.name}</span>
                  <span className="font-semibold text-electric">{source.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-electric/20 bg-panel/80 p-4 md:p-5">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-slate-300">Next Best Edges</h2>
          <div className="space-y-2">
            {nextEdges.map((row) => (
              <div key={row.market} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="font-medium">{row.market}</p>
                <p className="mb-2 text-xs text-slate-400">{row.platform}</p>
                <div className="grid grid-cols-4 items-center gap-2 text-sm">
                  <span>{row.forecast}</span>
                  <span>{row.price}</span>
                  <span className={row.edge.startsWith('+') ? 'font-semibold text-edge' : 'font-semibold text-skip'}>{row.edge}</span>
                  <span className={`rounded-full border px-2 py-1 text-center text-xs font-semibold ${toneClass[row.tone]}`}>{row.action}</span>
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
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className={`text-lg font-semibold ${accent ? 'text-electric' : 'text-slate-100'}`}>{value}</p>
    </div>
  )
}
