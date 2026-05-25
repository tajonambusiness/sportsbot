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
            <p className="text-lg font-semibold leading-tight sm:text-xl md:text-3xl">Will it rain in New York City tomorrow?</p>
            <p className="mt-1 text-sm text-slate-400 md:text-base">Kalshi • Rain Market</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-xl border border-edge/20 bg-edge/5 p-3">
              <p className="text-[11px] uppercase text-slate-400">Edge</p>
              <p className="mt-1 text-4xl font-bold leading-none text-edge sm:text-5xl">+19%</p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-edge/90 sm:text-xs">Strong Edge</p>
            </div>
            <div className="sm:col-span-2 rounded-xl border border-edge/40 bg-edge/10 p-3 text-center sm:p-4">
              <p className="text-4xl font-bold text-edge sm:text-5xl">81%</p>
              <p className="text-[11px] uppercase text-slate-300 sm:text-xs">Confidence</p>
            </div>
          </div>

          <div className="rounded-xl border border-edge/50 bg-gradient-to-r from-edge/25 to-edge/15 p-2.5 shadow-[0_0_0_1px_rgba(74,222,128,0.35),0_0_28px_rgba(74,222,128,0.28)]">
            <button className="w-full rounded-lg border border-edge/60 bg-edge/20 px-4 py-3 text-base font-bold tracking-wide text-edge transition hover:bg-edge/30">
              POSSIBLE YES ↑
            </button>
            <p className="mt-2 text-center text-xs text-slate-300">Market looks undervalued.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
            <Metric label="Market price" value="44¢" />
            <Metric label="Forecast probability" value="63%" accent />
            <Metric label="Time left" value="14h 32m" />
            <Metric label="Liquidity" value="Good" accent />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="mb-2 text-[11px] uppercase text-slate-400 sm:text-xs">Sources</p>
            <div className="space-y-1.5 sm:space-y-2">
              {sourceData.map((source) => (
                <div key={source.name} className="flex items-center justify-between text-sm">
                  <span>{source.name}</span>
                  <span className="font-semibold text-electric">{source.value}%</span>
                </div>
              ))}
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
