import { useState, useEffect, useCallback } from 'react';

interface Stage {
  id: number;
  title: string;
  badge: string;
  subtitle: string;
  explanation: string;
  whyFast: string;
}

const STAGES: Stage[] = [
  {
    id: 1,
    title: 'Parse Query',
    badge: 'AST Analysis',
    subtitle: 'ParsedQuery derives minimal dependencies',
    explanation: 'The SQL string is parsed into an abstract syntax tree. ParsedQuery computes the dependent columns needed: countryName and cityName. Every other column on disk is left untouched.',
    whyFast: 'No unnecessary columns are read. The engine knows before touching disk exactly which two column files will participate.',
  },
  {
    id: 2,
    title: 'Binary Search Dictionary',
    badge: 'O(log N) Lookup',
    subtitle: 'Resolve "India" without reading rows',
    explanation: 'Instead of scanning the dataset, MastiDB reads the sorted countryName dictionary. Because values are sorted at ingest, binary search lands on "India" at Dict ID 47 after 6 probes.',
    whyFast: 'No rows are scanned. Whether the table holds 24 thousand rows or 24 million, resolving the filter value takes fewer than 15 probes.',
  },
  {
    id: 3,
    title: 'Roaring Bitmap Evaluation',
    badge: 'O(1) Bitset Index',
    subtitle: 'Fetch matching row indices directly',
    explanation: 'MastiDB seeks straight to Dict ID 47 in the bitmap offsets array. Reading the serialized Roaring Bitmap yields all 79 matching row IDs [0, 2, 79, 142, 305, ...] at once.',
    whyFast: '24,354 non-matching rows are discarded in 0.2ms without reading a single byte of their payload data.',
  },
  {
    id: 4,
    title: 'Batched Fetch (Value Matrix)',
    badge: 'Integer Addressing',
    subtitle: 'Fetch cityName column as raw Dict IDs',
    explanation: 'For the 79 matching rows, the engine performs a batched contiguous read from cityName.mastidb. It fetches the values as 4-byte integer Dict IDs and leaves them encoded.',
    whyFast: 'Fetching integers is sequential and arithmetic (offset + row * 4). String decoding is random and expensive, so decoding is strictly delayed.',
  },
  {
    id: 5,
    title: 'Aggregate on Integer IDs',
    badge: 'Zero String Hashing',
    subtitle: 'AggregateBuffer hashes integer tuples',
    explanation: 'AggregateBuffer keeps a hash map whose keys are integer tuples (dict_id,). Each matched row increments one count slot. Across the 79 rows, tuple (7,) reaches 34, (3,) reaches 27, and (9,) reaches 18.',
    whyFast: 'The inner aggregation loop never touches strings, and hashing small integer tuples in Python is about 10x faster than allocating and hashing them.',
  },
  {
    id: 6,
    title: 'Late Materialization & Finalize',
    badge: 'Final ResultSet',
    subtitle: 'Decode only the surviving group keys',
    explanation: 'Only once all 79 rows are aggregated are the 3 surviving group IDs (3, 7, 9) decoded against the dictionary into "Bengaluru", "Delhi", and "Mumbai" for the final ResultSet.',
    whyFast: 'Out of 24,433 rows in the table, exactly 3 strings were decoded from disk. Every step before this one ran on integers.',
  },
];

export function QueryWalkthrough() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const stage = STAGES[currentStep];

  const goNext = useCallback(() => {
    setCurrentStep((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const replay = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  // Autoplay timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STAGES.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <section id="query-trace" className="section-spacing border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="site-container">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--brand)] mb-3">
              QUERY EXECUTION
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--ink)] tracking-tight mb-3">
              Follow a query through the engine
            </h2>
            <p className="text-base sm:text-lg text-[var(--muted)] prose-measure">
              Step through what MastiDB does with one analytical query, from SQL text to result. Bitmaps and integer dictionaries let it skip both the row scan and the string building.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-[var(--surface-tint)] p-1.5 rounded-xl border border-[var(--line)]">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="min-h-[44px] px-3.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--brand)]/30 text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer"
              title={isPlaying ? 'Pause trace' : 'Auto-play trace'}
            >
              {isPlaying ? (
                <>
                  <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block"></span>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <span className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-[var(--brand)] inline-block"></span>
                  <span>Auto-run</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={goPrev}
              disabled={currentStep === 0}
              aria-label="Previous query step"
              className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--brand)]/30 text-xs font-bold text-[var(--ink)] flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer"
            >
              ←
            </button>

            <div className="px-3 text-xs font-mono font-semibold text-[var(--muted)]">
              {currentStep + 1} / {STAGES.length}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={currentStep === STAGES.length - 1}
              aria-label="Next query step"
              className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--brand)]/30 text-xs font-bold text-[var(--ink)] flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer"
            >
              →
            </button>

            <button
              type="button"
              onClick={replay}
              className="min-h-[44px] px-3 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer"
              title="Reset query trace"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Query Banner */}
        <div className="p-4 md:p-5 rounded-2xl bg-[var(--terminal)] text-slate-100 border border-[var(--terminal-border)] mb-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs md:text-sm">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="text-indigo-400 font-bold select-none">$ SQL</span>
            <span className="text-slate-300">
              <span className="text-indigo-400 font-semibold">SELECT</span> cityName, <span className="text-emerald-400 font-semibold">COUNT(id)</span> <span className="text-indigo-400 font-semibold">WHERE</span> countryName = <span className="text-amber-300">'India'</span> <span className="text-indigo-400 font-semibold">GROUP BY</span> cityName
            </span>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-400 whitespace-nowrap self-start md:self-auto border border-slate-700/50">
            Wikipedia Edits (24,433 rows)
          </span>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* MOBILE VIEW (lg:hidden): Shows one focused stage & explicit controls */}
        {/* ------------------------------------------------------------------- */}
        <div className="lg:hidden flex flex-col gap-6">
          {/* Current Stage Indicator Pill */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--lavender)] border border-[var(--brand)]/30">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white font-mono text-xs font-bold flex items-center justify-center">
                {stage.id}
              </span>
              <div>
                <div className="text-xs font-mono font-bold uppercase text-[var(--brand)]">
                  Stage {stage.id} of {STAGES.length}
                </div>
                <div className="text-sm font-bold text-[var(--ink)]">
                  {stage.title}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]">
              {stage.badge}
            </span>
          </div>

          {/* Visual simulation card */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-md overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[var(--surface-tint)] border-b border-[var(--line)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]"></span>
                <span className="text-xs font-mono font-bold text-[var(--ink)] uppercase tracking-wider">
                  Engine State
                </span>
              </div>
              <span className="text-[11px] font-mono text-[var(--muted)]">Memory Resident</span>
            </div>
            <div className="p-4 sm:p-6">
              {currentStep === 0 && <StageVisualParse />}
              {currentStep === 1 && <StageVisualDict />}
              {currentStep === 2 && <StageVisualBitmap />}
              {currentStep === 3 && <StageVisualBatchedFetch />}
              {currentStep === 4 && <StageVisualAggregate />}
              {currentStep === 5 && <StageVisualFinalResult />}
            </div>
          </div>

          {/* Focused Stage Explanation */}
          <div className="p-5 rounded-2xl bg-[var(--surface-tint)] border border-[var(--line)]">
            <h4 className="text-xs font-mono font-bold text-[var(--brand)] uppercase tracking-wider mb-2">
              How Stage {stage.id} Works
            </h4>
            <p className="text-sm text-[var(--ink)] leading-relaxed mb-3">
              {stage.explanation}
            </p>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--muted)] flex items-start gap-2">
              <div>
                <strong className="text-[var(--ink)]">Why this is fast:</strong> {stage.whyFast}
              </div>
            </div>
          </div>

          {/* Explicit Back / Next Controls for Mobile (Min 44px touch target) */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentStep === 0}
              className="flex-1 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-tint)] text-sm font-bold text-[var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={currentStep === STAGES.length - 1 ? replay : goNext}
              className="flex-1 min-h-[48px] rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-sm font-bold text-white shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand)] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{currentStep === STAGES.length - 1 ? 'Replay Query' : 'Next Stage'}</span>
              <span>{currentStep === STAGES.length - 1 ? '↺' : '→'}</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* DESKTOP VIEW (hidden lg:grid): Interactive side-by-side guided tool */}
        {/* ------------------------------------------------------------------- */}
        <div className="hidden lg:grid grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Stage Selector & Explanations (5 cols) */}
          <div className="col-span-5 flex flex-col gap-3">
            <div className="space-y-2">
              {STAGES.map((s, idx) => {
                const isActive = idx === currentStep;
                const isPassed = idx < currentStep;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setCurrentStep(idx);
                      setIsPlaying(false);
                    }}
                    className={`w-full min-h-[48px] text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
                      isActive
                        ? 'bg-[var(--lavender)] border-[var(--brand)] shadow-sm'
                        : isPassed
                        ? 'bg-[var(--surface)] border-[var(--line)] hover:bg-[var(--surface-tint)] opacity-85'
                        : 'bg-[var(--surface)] border-[var(--line)] hover:bg-[var(--surface-tint)] opacity-50'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-[var(--brand)] text-white'
                          : isPassed
                          ? 'bg-[var(--result-green)] text-white'
                          : 'bg-[var(--line)] text-[var(--muted)]'
                      }`}
                    >
                      {isPassed ? '✓' : s.id}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isActive ? 'text-[var(--brand)]' : 'text-[var(--ink)]'}`}>
                          {s.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)]">
                          {s.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)] line-clamp-1 mt-0.5">
                        {s.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Stage Deep Explanation Card */}
            <div className="mt-3 p-5 rounded-2xl bg-[var(--surface-tint)] border border-[var(--line)]">
              <div className="text-xs font-mono font-bold text-[var(--brand)] uppercase tracking-wider mb-2">
                Stage {stage.id} Explanation
              </div>
              <p className="text-sm text-[var(--ink)] leading-relaxed mb-4">
                {stage.explanation}
              </p>
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--muted)] flex items-start gap-2">
                <div>
                  <strong className="text-[var(--ink)]">Why this is fast:</strong> {stage.whyFast}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Stage Simulation (7 cols) */}
          <div className="col-span-7">
            <div className="h-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-lg overflow-hidden min-h-[460px] flex flex-col">
              {/* Visual Panel Titlebar */}
              <div className="px-5 py-3.5 bg-[var(--surface-tint)] border-b border-[var(--line)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]"></span>
                  <span className="text-xs font-mono font-bold text-[var(--ink)] uppercase tracking-wider">
                    Engine State: Stage {stage.id}
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--muted)]">
                  Memory Resident
                </span>
              </div>

              {/* Dynamic Interactive Visual Content */}
              <div className="p-6 flex-1 flex flex-col justify-center">
                {currentStep === 0 && <StageVisualParse />}
                {currentStep === 1 && <StageVisualDict />}
                {currentStep === 2 && <StageVisualBitmap />}
                {currentStep === 3 && <StageVisualBatchedFetch />}
                {currentStep === 4 && <StageVisualAggregate />}
                {currentStep === 5 && <StageVisualFinalResult />}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

// ----------------------------------------------------
// Specialized visual state representations for each step
// ----------------------------------------------------

function StageVisualParse() {
  return (
    <div className="space-y-5">
      <div className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">
        Query Plan & Column Dependency Tree
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
        <div className="p-4 rounded-xl bg-[var(--dict-violet-bg)] border border-[var(--dict-violet-border)]">
          <div className="text-[var(--dict-violet)] font-bold mb-1">Filter Predicate</div>
          <div className="text-sm font-bold text-[var(--ink)]">countryName == 'India'</div>
          <div className="text-[11px] text-[var(--muted)] mt-2">Target column: countryName.mastidb</div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--result-blue-bg)] border border-[var(--result-blue-border)]">
          <div className="text-[var(--result-blue)] font-bold mb-1">Grouping Key</div>
          <div className="text-sm font-bold text-[var(--ink)]">GROUP BY cityName</div>
          <div className="text-[11px] text-[var(--muted)] mt-2">Target column: cityName.mastidb</div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--result-green-bg)] border border-[var(--result-green-border)]">
          <div className="text-[var(--result-green)] font-bold mb-1">Aggregation Function</div>
          <div className="text-sm font-bold text-[var(--ink)]">p0 = COUNT(id)</div>
          <div className="text-[11px] text-[var(--muted)] mt-2">Row counter (no value decode)</div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-tint)] border border-[var(--line)]">
          <div className="text-[var(--muted)] font-bold mb-1">Unreferenced Columns</div>
          <div className="text-sm font-bold text-slate-400 line-through">added, deleted, user, flags</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-2">0 bytes read from disk</div>
        </div>
      </div>
    </div>
  );
}

function StageVisualDict() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">
          Binary Search in countryName Dictionary
        </span>
        <span className="text-xs font-mono font-bold text-[var(--dict-violet)]">
          107 distinct values
        </span>
      </div>

      <div className="border border-[var(--line)] rounded-xl overflow-hidden font-mono text-xs">
        <div className="grid grid-cols-12 bg-[var(--surface-tint)] px-4 py-2 border-b border-[var(--line)] font-bold text-[var(--muted)]">
          <div className="col-span-2">Probe</div>
          <div className="col-span-3">Dict ID</div>
          <div className="col-span-4">String Value</div>
          <div className="col-span-3 text-right">Search Window</div>
        </div>

        <div className="divide-y divide-[var(--line)]">
          <div className="grid grid-cols-12 px-4 py-2 text-slate-400 bg-[var(--surface)]">
            <div className="col-span-2">1</div>
            <div className="col-span-3">53</div>
            <div className="col-span-4">Mexico</div>
            <div className="col-span-3 text-right text-[10px]">too high → hi = 52</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2 text-slate-400 bg-[var(--surface)]">
            <div className="col-span-2">2</div>
            <div className="col-span-3">26</div>
            <div className="col-span-4">Denmark</div>
            <div className="col-span-3 text-right text-[10px]">too low → lo = 27</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2 text-slate-400 bg-[var(--surface)]">
            <div className="col-span-2">3</div>
            <div className="col-span-3">39</div>
            <div className="col-span-4">Greece</div>
            <div className="col-span-3 text-right text-[10px]">too low → lo = 40</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2 text-slate-400 bg-[var(--surface)]">
            <div className="col-span-2">4</div>
            <div className="col-span-3">46</div>
            <div className="col-span-4">Iceland</div>
            <div className="col-span-3 text-right text-[10px]">too low → lo = 47</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2 text-slate-400 bg-[var(--surface)]">
            <div className="col-span-2">5</div>
            <div className="col-span-3">49</div>
            <div className="col-span-4">Iran</div>
            <div className="col-span-3 text-right text-[10px]">too high → hi = 48</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2.5 bg-[var(--dict-violet-bg)] font-bold text-[var(--dict-violet)] border-l-4 border-l-[var(--dict-violet)]">
            <div className="col-span-2">6</div>
            <div className="col-span-3">47</div>
            <div className="col-span-4 flex items-center gap-2">
              <span>India</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--dict-violet)] text-white">MATCH</span>
            </div>
            <div className="col-span-3 text-right text-xs">dict_id = 47</div>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[var(--lavender)] border border-[var(--brand)]/20 text-xs text-[var(--brand)] font-mono font-semibold flex items-center justify-between">
        <span>Target Dict ID Found: 47</span>
        <span>Probes: 6 of 107 values</span>
      </div>
    </div>
  );
}

function StageVisualBitmap() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">
          Roaring Bitmap Lookup for Dict ID 47
        </span>
        <span className="text-xs font-mono font-bold text-[var(--bitmap-amber)]">
          79 matching rows
        </span>
      </div>

      {/* Bitset visualization */}
      <div className="p-4 rounded-xl bg-[var(--bitmap-amber-bg)] border border-[var(--bitmap-amber-border)]">
        <div className="text-xs font-mono text-[var(--bitmap-amber)] font-bold mb-2">
          Bitset Slices (1 = match, 0 = skip)
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono text-xs">
          {[1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1].map((bit, idx) => (
            <div
              key={idx}
              className={`w-7 h-8 rounded flex items-center justify-center font-bold ${
                bit === 1
                  ? 'bg-[var(--bitmap-amber)] text-white shadow-sm'
                  : 'bg-[var(--surface)] text-slate-300 border border-[var(--line)]'
              }`}
            >
              {bit}
            </div>
          ))}
          <div className="flex items-center px-2 text-slate-400 font-bold">...</div>
        </div>
      </div>

      {/* Extracted row indices */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)]">
        <div className="text-xs font-mono text-[var(--muted)] font-bold mb-2">
          Extracted Matching Row IDs (Zero payload read):
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-xs">
          {[0, 2, 79, 142, 305, 510, 680, 892].map((r) => (
            <span key={r} className="px-2.5 py-1 rounded bg-[var(--surface-tint)] border border-[var(--line)] text-[var(--ink)] font-semibold">
              Row {r}
            </span>
          ))}
          <span className="px-2 py-1 text-slate-400">+ 71 more</span>
        </div>
      </div>

      <div className="text-xs text-emerald-700 font-mono font-semibold bg-[var(--result-green-bg)] p-3 rounded-xl border border-[var(--result-green-border)] flex justify-between">
        <span>Bypassed Non-Matching Rows:</span>
        <span>24,354 / 24,433 (99.7% skipped)</span>
      </div>
    </div>
  );
}

function StageVisualBatchedFetch() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">
          Value Matrix: Batched Integer Reads
        </span>
        <span className="text-xs font-mono font-bold text-[var(--encoded-coral)]">
          Format: int32 (4 bytes/row)
        </span>
      </div>

      <div className="border border-[var(--line)] rounded-xl overflow-hidden font-mono text-xs">
        <div className="grid grid-cols-12 bg-[var(--surface-tint)] px-4 py-2 border-b border-[var(--line)] font-bold text-[var(--muted)]">
          <div className="col-span-3">Row ID</div>
          <div className="col-span-4">cityName (Dict ID)</div>
          <div className="col-span-5 text-right">Materialization State</div>
        </div>

        <div className="divide-y divide-[var(--line)]">
          <div className="grid grid-cols-12 px-4 py-2 bg-[var(--surface)]">
            <div className="col-span-3 font-semibold">Row 0</div>
            <div className="col-span-4 font-bold text-[var(--brand)]">ID 7</div>
            <div className="col-span-5 text-right text-emerald-600">Kept as integer</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2 bg-[var(--surface)]">
            <div className="col-span-3 font-semibold">Row 2</div>
            <div className="col-span-4 font-bold text-[var(--brand)]">ID 3</div>
            <div className="col-span-5 text-right text-emerald-600">Kept as integer</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2 bg-[var(--surface)]">
            <div className="col-span-3 font-semibold">Row 79</div>
            <div className="col-span-4 font-bold text-[var(--brand)]">ID 7</div>
            <div className="col-span-5 text-right text-emerald-600">Kept as integer</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2 bg-[var(--surface)]">
            <div className="col-span-3 font-semibold">Row 142</div>
            <div className="col-span-4 font-bold text-[var(--brand)]">ID 9</div>
            <div className="col-span-5 text-right text-emerald-600">Kept as integer</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2 bg-[var(--surface)]">
            <div className="col-span-3 font-semibold">Row 305</div>
            <div className="col-span-4 font-bold text-[var(--brand)]">ID 3</div>
            <div className="col-span-5 text-right text-emerald-600">Kept as integer</div>
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[var(--lavender)] border border-[var(--brand)]/20 text-xs font-mono text-[var(--brand)]">
        Values are fetched using offset_list + (row_id * 4), a direct memory-map read with no index search and no object allocations.
      </div>
    </div>
  );
}

function StageVisualAggregate() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">
          AggregateBuffer (Integer Group Keys)
        </span>
        <span className="text-xs font-mono font-bold text-[var(--result-green)]">
          Buffer Key: (dict_id,)
        </span>
      </div>

      <div className="border border-[var(--line)] rounded-xl overflow-hidden font-mono text-xs">
        <div className="grid grid-cols-12 bg-[var(--surface-tint)] px-4 py-2 border-b border-[var(--line)] font-bold text-[var(--muted)]">
          <div className="col-span-4">Group Key (Tuple)</div>
          <div className="col-span-4">p0: COUNT(id)</div>
          <div className="col-span-4 text-right">Aggregation Op</div>
        </div>

        <div className="divide-y divide-[var(--line)]">
          <div className="grid grid-cols-12 px-4 py-2.5 bg-[var(--surface)] items-center">
            <div className="col-span-4 font-bold text-[var(--brand)]">(7,)</div>
            <div className="col-span-4 font-extrabold text-[var(--ink)] text-sm">34</div>
            <div className="col-span-4 text-right text-[11px] text-[var(--muted)]">state + 1</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2.5 bg-[var(--surface)] items-center">
            <div className="col-span-4 font-bold text-[var(--brand)]">(3,)</div>
            <div className="col-span-4 font-extrabold text-[var(--ink)] text-sm">27</div>
            <div className="col-span-4 text-right text-[11px] text-[var(--muted)]">state + 1</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-2.5 bg-[var(--surface)] items-center">
            <div className="col-span-4 font-bold text-[var(--brand)]">(9,)</div>
            <div className="col-span-4 font-extrabold text-[var(--ink)] text-sm">18</div>
            <div className="col-span-4 text-right text-[11px] text-[var(--muted)]">state + 1</div>
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[var(--result-green-bg)] border border-[var(--result-green-border)] text-xs font-mono text-emerald-800">
        The engine walks the rows once, and aggregates keep their partial states in buffer slots. No string has been decoded yet.
      </div>
    </div>
  );
}

function StageVisualFinalResult() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">
          Final ResultSet (Late Materialization)
        </span>
        <span className="text-xs font-mono font-bold text-[var(--result-green)]">
          Execution Complete
        </span>
      </div>

      <div className="border border-[var(--line)] rounded-xl overflow-hidden font-mono text-xs shadow-sm">
        <div className="grid grid-cols-12 bg-[var(--terminal)] text-white px-4 py-2.5 font-bold">
          <div className="col-span-6">cityName (Decoded String)</div>
          <div className="col-span-3">Dict ID</div>
          <div className="col-span-3 text-right">COUNT(id)</div>
        </div>

        <div className="divide-y divide-[var(--line)]">
          <div className="grid grid-cols-12 px-4 py-3 bg-[var(--surface)] items-center">
            <div className="col-span-6 font-bold text-[var(--ink)] text-sm">Delhi</div>
            <div className="col-span-3 text-[var(--muted)]">ID: 7</div>
            <div className="col-span-3 text-right font-bold text-[var(--brand)] text-sm">34</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-3 bg-[var(--surface)] items-center">
            <div className="col-span-6 font-bold text-[var(--ink)] text-sm">Bengaluru</div>
            <div className="col-span-3 text-[var(--muted)]">ID: 3</div>
            <div className="col-span-3 text-right font-bold text-[var(--brand)] text-sm">27</div>
          </div>
          <div className="grid grid-cols-12 px-4 py-3 bg-[var(--surface)] items-center">
            <div className="col-span-6 font-bold text-[var(--ink)] text-sm">Mumbai</div>
            <div className="col-span-3 text-[var(--muted)]">ID: 9</div>
            <div className="col-span-3 text-right font-bold text-[var(--brand)] text-sm">18</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center font-mono text-xs">
        <div className="p-3 rounded-xl bg-[var(--surface-tint)] border border-[var(--line)]">
          <div className="text-[var(--muted)] text-[10px] uppercase">Table Size</div>
          <div className="font-bold text-[var(--ink)] text-sm mt-0.5">24,433 rows</div>
        </div>
        <div className="p-3 rounded-xl bg-[var(--surface-tint)] border border-[var(--line)]">
          <div className="text-[var(--muted)] text-[10px] uppercase">Bitmap Matches</div>
          <div className="font-bold text-[var(--brand)] text-sm mt-0.5">79 rows</div>
        </div>
        <div className="p-3 rounded-xl bg-[var(--result-green-bg)] border border-[var(--result-green-border)]">
          <div className="text-emerald-700 text-[10px] uppercase">Strings Decoded</div>
          <div className="font-bold text-emerald-800 text-sm mt-0.5">3 total</div>
        </div>
      </div>
    </div>
  );
}
