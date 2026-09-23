import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';

function computePhysicalLayout(rows: string[]) {
  const safeRows = rows.map((r) => (r === '' ? ' ' : r));
  const uniqueVals = Array.from(new Set(safeRows)).sort();

  const dict = uniqueVals.map((val, id) => {
    const bits = safeRows.map((r) => (r === val ? 1 : 0));
    return { id, str: val, bits };
  });

  const offsets = [0];
  let currentOffset = 0;
  const dictStringChars: { char: string; id: number }[] = [];

  dict.forEach((d) => {
    currentOffset += d.str.length;
    offsets.push(currentOffset);
    for (const char of d.str) {
      dictStringChars.push({ char, id: d.id });
    }
  });

  const encodedList = safeRows.map((r) => dict.findIndex((d) => d.str === r));

  return { dict, offsets, dictStringChars, encodedList };
}

export function ColumnExplorer() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [rawRows, setRawRows] = useState(['India', 'Germany', 'India', 'Argentina', 'Germany']);

  const { dict, offsets, dictStringChars, encodedList } = useMemo(
    () => computePhysicalLayout(rawRows),
    [rawRows]
  );

  const activeId = hoveredRow !== null ? encodedList[hoveredRow] : hoveredId;

  const updateRow = (idx: number, val: string) => {
    const newRows = [...rawRows];
    newRows[idx] = val;
    setRawRows(newRows);
  };

  const addRow = () => {
    if (rawRows.length < 10) setRawRows([...rawRows, 'New']);
  };

  const removeRow = (idx: number) => {
    if (rawRows.length > 1) {
      const newRows = [...rawRows];
      newRows.splice(idx, 1);
      setRawRows(newRows);
      setHoveredRow(null);
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Editor / Logical View (4 cols) */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                Logical Table Editor
              </h3>
              <span className="text-[11px] font-mono text-[var(--brand)] font-medium">
                Live React Sandbox
              </span>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden font-mono text-xs shadow-sm">
              <div className="grid grid-cols-12 bg-[var(--surface-tint)] text-[var(--muted)] px-3.5 py-2.5 border-b border-[var(--line)] font-bold">
                <div className="col-span-2">Row</div>
                <div className="col-span-8">countryName (Editable)</div>
                <div className="col-span-2 text-right">Del</div>
              </div>

              <AnimatePresence>
                {rawRows.map((val, idx) => {
                  const dictEntryId = encodedList[idx];
                  const isHovered =
                    hoveredRow !== null
                      ? idx === hoveredRow
                      : activeId !== null && activeId === dictEntryId;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      key={idx}
                      onMouseEnter={() => setHoveredRow(idx)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={`grid grid-cols-12 px-3.5 py-2 border-b border-[var(--line)] transition-colors items-center cursor-pointer ${
                        isHovered ? 'bg-[var(--lavender)]' : 'hover:bg-[var(--surface-tint)]'
                      }`}
                    >
                      <div className="col-span-2 text-[var(--muted)] font-semibold">{idx}</div>
                      <div className="col-span-8">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => updateRow(idx, e.target.value)}
                          className={`w-full bg-transparent outline-none transition-colors font-medium ${
                            isHovered ? 'text-[var(--brand)] font-bold' : 'text-[var(--ink)]'
                          }`}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          aria-label={`Delete row ${idx}`}
                          className="text-[var(--muted)] hover:text-rose-600 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {rawRows.length < 10 && (
                <button
                  type="button"
                  onClick={addRow}
                  className="w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--surface-tint)] transition-colors cursor-pointer border-t border-[var(--line)]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              )}
            </div>

            <div className="p-4 rounded-xl border-l-4 border-l-[var(--brand)] bg-[var(--surface-tint)] text-xs font-mono text-[var(--muted)] leading-relaxed">
              {activeId !== null && dict[activeId] ? (
                <span className="text-[var(--ink)]">
                  Tracing Dict ID <strong className="text-[var(--brand)] font-bold">#{activeId}</strong> ("{dict[activeId]?.str}"). Offsets [{offsets[activeId]}, {offsets[activeId + 1]}) define byte boundaries.
                </span>
              ) : (
                <span>
                  The table is shredded into columnar components. Hover any byte region on the right to trace pointers backwards into the logical rows.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Physical Layout - Memory-Mapped Address Space (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Memory-Mapped Address Space (.mastidb file)
            </h3>
            <span className="text-[11px] font-mono text-[var(--muted)]">
              Continuous binary layout
            </span>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden font-mono text-xs shadow-sm divide-y divide-[var(--line)]">
            
            {/* Region 1: Dictionary Offsets */}
            <div className="p-5">
              <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--dict-violet)]"></span>
                <span>1. Dictionary Offsets (int32 array)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {offsets.map((off, idx) => {
                  const isTarget = activeId !== null && (idx === activeId || idx === activeId + 1);
                  return (
                    <motion.div
                      layout
                      key={idx}
                      onMouseEnter={() => setHoveredId(idx === offsets.length - 1 ? idx - 1 : idx)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`px-3 py-1.5 rounded-lg border transition-all cursor-crosshair font-semibold text-xs ${
                        isTarget
                          ? 'bg-[var(--lavender)] border-[var(--brand)] text-[var(--brand)] shadow-sm'
                          : 'bg-[var(--surface-tint)] border-[var(--line)] text-[var(--ink)]'
                      }`}
                    >
                      {off}
                    </motion.div>
                  );
                })}
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-2">
                Maps each string ID to its byte start offset in Section 2.
              </div>
            </div>

            {/* Region 2: Raw Character Dictionary */}
            <div className="p-5">
              <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--brand-blue)]"></span>
                <span>2. Sorted Dictionary (UTF-8 Bytes, no separators)</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <AnimatePresence>
                  {dictStringChars.map((c, idx) => {
                    const isTarget = activeId === c.id;
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        key={`${c.id}-${idx}`}
                        className={`w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-crosshair font-bold text-xs ${
                          isTarget
                            ? 'bg-[var(--brand)] text-white shadow-sm scale-110 z-10'
                            : 'bg-[var(--surface-tint)] border border-[var(--line)] text-[var(--ink)]'
                        }`}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {c.char}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-2">
                Values stored back-to-back in sorted order to permit binary search.
              </div>
            </div>

            {/* Region 3: Encoded Row List */}
            <div className="p-5">
              <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--encoded-coral)]"></span>
                <span>3. Encoded Row List (Fixed-width int32 IDs)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {encodedList.map((encodedId, rowIdx) => {
                    const isTarget =
                      hoveredRow !== null
                        ? rowIdx === hoveredRow
                        : activeId !== null && activeId === encodedId;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        key={rowIdx}
                        onMouseEnter={() => setHoveredRow(rowIdx)}
                        onMouseLeave={() => setHoveredRow(null)}
                        className={`flex flex-col border rounded-lg overflow-hidden transition-all cursor-crosshair ${
                          isTarget
                            ? 'border-[var(--encoded-coral)] shadow-sm scale-105 z-10'
                            : 'border-[var(--line)]'
                        }`}
                      >
                        <div
                          className={`text-[9px] px-2 py-0.5 text-center border-b transition-colors font-mono ${
                            isTarget
                              ? 'bg-[var(--encoded-coral-bg)] text-[var(--encoded-coral)] border-[var(--encoded-coral-border)] font-bold'
                              : 'bg-[var(--surface-tint)] text-[var(--muted)] border-[var(--line)]'
                          }`}
                        >
                          R{rowIdx}
                        </div>
                        <div
                          className={`px-3 py-1.5 text-center font-bold text-xs transition-colors ${
                            isTarget
                              ? 'bg-[var(--encoded-coral)] text-white'
                              : 'bg-[var(--surface)] text-[var(--ink)]'
                          }`}
                        >
                          {encodedId}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-2">
                Fixed 4 bytes per row. The address of row i is offset_list + (i * 4).
              </div>
            </div>

            {/* Region 4: Roaring Bitmaps */}
            <div className="p-5">
              <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--bitmap-amber)]"></span>
                <span>4. Roaring Bitmaps (Serialized bytes per distinct value)</span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {dict.map((d) => {
                    const isTarget = activeId === d.id;
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        key={d.id}
                        onMouseEnter={() => setHoveredId(d.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`flex flex-col sm:flex-row border rounded-xl transition-all cursor-crosshair overflow-hidden ${
                          isTarget
                            ? 'border-[var(--bitmap-amber)] shadow-sm'
                            : 'border-[var(--line)] hover:border-[var(--line-strong)]'
                        }`}
                      >
                        <div
                          className={`px-3.5 py-1.5 border-r border-[var(--line)] flex items-center justify-between sm:justify-center min-w-[85px] font-bold text-xs ${
                            isTarget
                              ? 'bg-[var(--bitmap-amber-bg)] text-[var(--bitmap-amber)]'
                              : 'bg-[var(--surface-tint)] text-[var(--muted)]'
                          }`}
                        >
                          <span>ID {d.id}</span>
                          <span className="sm:hidden text-[10px] font-normal">({d.str})</span>
                        </div>
                        <div className="flex flex-1 p-1 gap-1 bg-[var(--surface)] flex-wrap items-center">
                          {d.bits.map((bit, rowIdx) => (
                            <div
                              key={rowIdx}
                              className={`flex-1 min-w-[22px] text-center py-1 rounded text-xs font-bold transition-colors ${
                                bit === 1 && isTarget
                                  ? 'bg-[var(--bitmap-amber)] text-white'
                                  : bit === 1
                                  ? 'bg-[var(--bitmap-amber-bg)] text-[var(--bitmap-amber)] border border-[var(--bitmap-amber-border)]'
                                  : 'bg-[var(--surface-tint)] text-slate-300'
                              }`}
                            >
                              {bit}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-2">
                Each distinct value owns a bitmap indicating which rows contain that value.
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
