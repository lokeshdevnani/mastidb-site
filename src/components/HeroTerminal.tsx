import { useState } from 'react';

export function HeroTerminal() {
  const [tab, setTab] = useState<'cli' | 'python'>('cli');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const cliCode = `# 1. Install via pip (builds native C extensions via MyPyC)
pip install mastidb

# 2. Ingest the included Wikipedia edits demo (~24k rows)
mastidb demo wikipedia

# 3. Run a columnar query (filters via Roaring Bitmaps)
mastidb query -d /tmp/wikipedia "SELECT cityName, COUNT(id) WHERE countryName = 'India' GROUP BY cityName"`;

  const pythonCode = `from mastidb import Table, QueryExecutor

# Load memory-mapped columnar segment
table = Table.from_data_dir('/tmp/wikipedia')

# Execute query: two-pass evaluation with late materialization
results = QueryExecutor(table).execute(
    "SELECT cityName, COUNT(id) WHERE countryName = 'India' GROUP BY cityName LIMIT 5"
)

print(results.get_results())
# Output: [['Delhi', 7], ['Bengaluru', 6], ['Mumbai', 5], ...]`;

  return (
    <div className="w-full rounded-2xl border border-[var(--terminal-border)] bg-[var(--terminal)] text-slate-200 shadow-2xl overflow-hidden font-mono text-xs md:text-sm flex flex-col">
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--terminal-subtle)] border-b border-[var(--terminal-border)] select-none">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'cli'}
            onClick={() => setTab('cli')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === 'cli'
                ? 'bg-[var(--terminal)] text-white shadow-sm border border-[var(--terminal-border)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            CLI Terminal
          </button>
          <button
            role="tab"
            aria-selected={tab === 'python'}
            onClick={() => setTab('python')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === 'python'
                ? 'bg-[var(--terminal)] text-white shadow-sm border border-[var(--terminal-border)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Python API
          </button>
        </div>

        {/* Copy Button & Window Dots */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => copyToClipboard(tab === 'cli' ? cliCode : pythonCode, tab)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-[11px] text-slate-300 transition-colors border border-slate-700/60"
            title="Copy snippet"
          >
            {copied === tab ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block"></span>
          </div>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-4 md:p-5 overflow-x-auto leading-relaxed">
        {tab === 'cli' ? (
          <div className="space-y-3 whitespace-pre font-mono">
            <div>
              <span className="text-slate-500"># 1. Install via pip (compiles hot modules with MyPyC)</span>
              <div className="flex items-center justify-between text-slate-100">
                <span><span className="text-indigo-400 select-none">$ </span>pip install mastidb</span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-slate-500"># 2. Ingest Wikipedia sample (~24k edits)</span>
              <div className="text-slate-100">
                <span className="text-indigo-400 select-none">$ </span>mastidb demo wikipedia
              </div>
            </div>

            <div className="pt-1">
              <span className="text-slate-500"># 3. Fast columnar query execution</span>
              <div className="text-slate-100">
                <span className="text-indigo-400 select-none">$ </span>mastidb query -d /tmp/wikipedia \
                <br />
                <span className="text-amber-300">    "SELECT cityName, COUNT(id) WHERE countryName = 'India' GROUP BY cityName"</span>
              </div>
            </div>

            {/* Plausible output block */}
            <div className="mt-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
              <div className="text-slate-400 pb-1.5 border-b border-slate-800 flex justify-between">
                <span>MastiDB ResultSet (3 rows returned in 12ms)</span>
                <span className="text-emerald-400 font-semibold">Bitmap Match: 79 rows</span>
              </div>
              <div className="pt-2 text-slate-200">
                <div>cityName    │ COUNT(id)</div>
                <div className="text-slate-600">────────────┼──────────</div>
                <div>Delhi       │ 7</div>
                <div>Bengaluru   │ 6</div>
                <div>Mumbai      │ 5</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 whitespace-pre font-mono text-xs md:text-sm">
            <span className="text-slate-500"># Embedded analytical query execution in Python</span>
            <div><span className="text-indigo-400 font-semibold">from</span> mastidb <span className="text-indigo-400 font-semibold">import</span> Table, QueryExecutor</div>
            <div className="text-slate-600 py-1"># Memory-mapped columnar segment read</div>
            <div>table = Table.from_data_dir(<span className="text-emerald-300">'/tmp/wikipedia'</span>)</div>
            <div>executor = QueryExecutor(table)</div>
            <div className="py-1">
              <div>results = executor.execute(</div>
              <div className="pl-4 text-emerald-300">"SELECT cityName, COUNT(id) WHERE countryName = 'India' GROUP BY cityName LIMIT 5"</div>
              <div>)</div>
            </div>
            <div className="text-slate-600 py-1"># Output arrives as decoded matrix</div>
            <div>print(results.get_results())</div>
            <div className="text-indigo-300"># [['Delhi', 7], ['Bengaluru', 6], ['Mumbai', 5], ...]</div>
          </div>
        )}
      </div>
    </div>
  );
}
