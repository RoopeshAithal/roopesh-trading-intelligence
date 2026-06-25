import { useState, useEffect, useCallback } from "react";

// ============================================================
// ROOPESH AITHAL — PRIVATE TRADING INTELLIGENCE SYSTEM v1.0
// © 2026 Roopesh Aithal. All pattern algorithms are proprietary.
// Storage: personal only (shared=false). No public access.
// ============================================================

const OWNER = "Roopesh Aithal";
const VERSION = "v1.0";

const TRADES = [
  { id: "aapl", symbol: "AAPL", contract: "$295 Call", expiry: "Jul 2, 2026", expiryDate: "2026-07-02", direction: "call", entry: 4.73, instrumentId: "00a93029-f53b-4ce3-b039-7a479be23a2b", type: "paper", emoji: "🍎", color: "#4A90D9", sector: "Tech" },
  { id: "tsla", symbol: "TSLA", contract: "$390 Call", expiry: "Jul 17, 2026", expiryDate: "2026-07-17", direction: "call", entry: 25.00, instrumentId: null, type: "paper", emoji: "⚡", color: "#E03F3F", sector: "EV" },
  { id: "spcx", symbol: "SPCX", contract: "$157.5 Put", expiry: "Jul 17, 2026", expiryDate: "2026-07-17", direction: "put", entry: 8.50, instrumentId: null, type: "paper", emoji: "🚀", color: "#9B59B6", sector: "Space" },
  { id: "fro", symbol: "FRO", contract: "$43 Call", expiry: "Jul 17, 2026", expiryDate: "2026-07-17", direction: "call", entry: 2.13, instrumentId: "f5eb426f-ce9f-418e-a8ca-117ba55e8aa6", type: "paper", emoji: "🛢️", color: "#27AE60", sector: "Energy" },
  { id: "sqqq", symbol: "SQQQ", contract: "$40 Call", expiry: "Jul 2, 2026", expiryDate: "2026-07-02", direction: "call", entry: 0.87, instrumentId: "65d56e64-9670-42ca-9a85-6de967d0f575", type: "real", emoji: "📉", color: "#F39C12", sector: "Inverse ETF" },
];

const STOP = -0.35;
const TARGET = 0.40;

// Pattern algorithm categories — proprietary to Roopesh Aithal
const PATTERN_TYPES = {
  NEWS_DRIVEN: "📰 News-Driven Move",
  DIVIDEND: "💰 Dividend Support",
  POST_IPO: "🚀 Post-IPO Fade",
  EARNINGS: "📊 Earnings Catalyst",
  MACRO: "🌍 Macro Driven",
  TECHNICAL: "📈 Technical Breakout",
  SECTOR: "🏭 Sector Rotation",
  WRONG_DIRECTION: "🔄 Direction Flip",
};

const TABS = ["trades", "history", "patterns", "journal", "algorithms"];
const TAB_LABELS = { trades: "📊 Trades", history: "📅 History", patterns: "🧠 Patterns", journal: "📓 Journal", algorithms: "⚗️ Algorithms" };

const pnlColor = (p) => p === null ? "#666" : p >= TARGET * 100 ? "#2ECC71" : p <= STOP * 100 ? "#E74C3C" : p > 0 ? "#58D68D" : "#EC7063";
const daysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

export default function App() {
  const [tab, setTab] = useState("trades");
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [journal, setJournal] = useState([]);
  const [algorithms, setAlgorithms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [toast, setToast] = useState("");
  const [newEntry, setNewEntry] = useState({ stock: "AAPL", newsEvent: "", premiumMove: "", directionRight: "yes", lesson: "", patternType: "NEWS_DRIVEN" });
  const [newAlgo, setNewAlgo] = useState({ name: "", condition: "", action: "", confidence: "Low", stocks: "" });
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showAlgoForm, setShowAlgoForm] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  async function loadAll() {
    try {
      const r = await window.storage.get("ra-trading-data");
      if (r?.value) {
        const d = JSON.parse(r.value);
        setHistory(d.history || []);
        setPatterns(d.patterns || []);
        setJournal(d.journal || []);
        setAlgorithms(d.algorithms || []);
      }
    } catch {}
  }

  async function saveAll(h, p, j, a) {
    try {
      await window.storage.set("ra-trading-data", JSON.stringify({ history: h, patterns: p, journal: j, algorithms: a }), false);
      showToast("✅ Saved privately");
    } catch { showToast("⚠️ Save failed"); }
  }

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    const liveIds = TRADES.filter(t => t.instrumentId).map(t => t.instrumentId);
    const idToTrade = {};
    TRADES.filter(t => t.instrumentId).forEach(t => { idToTrade[t.instrumentId] = t.id; });

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `You are a trading data assistant for ${OWNER}'s private trading system. Call get_option_quotes with the provided instrument IDs. Return ONLY a valid JSON object mapping each instrument_id to its mark_price number. No markdown, no explanation, just raw JSON like: {"id1": 1.23, "id2": 4.56}`,
          messages: [{ role: "user", content: `Get live option quotes and return JSON only for: ${JSON.stringify(liveIds)}` }],
          mcp_servers: [{ type: "url", url: "https://agent.robinhood.com/mcp/trading", name: "RoopeshRoobhinhood" }],
        }),
      });
      const data = await res.json();
      const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const newPrices = {};
        Object.entries(parsed).forEach(([id, price]) => {
          const tid = idToTrade[id];
          if (tid) newPrices[tid] = parseFloat(price);
        });
        setPrices(newPrices);

        const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const snap = { date: today, ts: Date.now(), prices: { ...newPrices } };
        const newHist = [...history.filter(h => h.date !== today), snap];

        // Auto-detect patterns from history
        const detectedPatterns = detectPatterns(newHist, journal);
        setHistory(newHist);
        setPatterns(detectedPatterns);
        await saveAll(newHist, detectedPatterns, journal, algorithms);
        setLastUpdated(new Date().toLocaleTimeString());
        showToast("🔄 Live prices updated");
      }
    } catch (e) { showToast("⚠️ Fetch error"); }
    setLoading(false);
  }, [history, journal, algorithms]);

  function detectPatterns(hist, jrnl) {
    const found = [];

    // Algorithm 1: News-Driven Move Detection
    jrnl.forEach(entry => {
      if (entry.directionRight === "yes" && entry.patternType === "NEWS_DRIVEN") {
        const existing = found.find(f => f.algo === "NEWS_DRIVEN" && f.stock === entry.stock);
        if (existing) { existing.count++; existing.confidence = existing.count >= 2 ? "High" : "Medium"; }
        else found.push({ algo: "NEWS_DRIVEN", stock: entry.stock, label: PATTERN_TYPES.NEWS_DRIVEN, detail: `News catalyst → correct direction on ${entry.stock}`, confidence: "Low", count: 1, color: "#3498DB", date: entry.date });
      }
    });

    // Algorithm 2: Dividend Support Pattern
    jrnl.forEach(entry => {
      if (entry.patternType === "DIVIDEND") {
        found.push({ algo: "DIVIDEND", stock: entry.stock, label: PATTERN_TYPES.DIVIDEND, detail: `Dividend/fundamentals support bullish call on ${entry.stock}`, confidence: "Medium", count: 1, color: "#27AE60", date: entry.date });
      }
    });

    // Algorithm 3: Post-IPO Fade
    jrnl.forEach(entry => {
      if (entry.patternType === "POST_IPO" && entry.directionRight === "yes") {
        found.push({ algo: "POST_IPO", stock: entry.stock, label: PATTERN_TYPES.POST_IPO, detail: `Post-IPO hype fade → Put profitable on ${entry.stock}`, confidence: "Medium", count: 1, color: "#9B59B6", date: entry.date });
      }
    });

    // Algorithm 4: Price Trend Detection from history
    TRADES.forEach(trade => {
      const pts = hist.map(h => h.prices[trade.id]).filter(p => p !== undefined);
      if (pts.length >= 3) {
        const last3 = pts.slice(-3);
        if (last3[2] > last3[1] && last3[1] > last3[0]) {
          found.push({ algo: "TREND_UP", stock: trade.symbol, label: "📈 3-Day Uptrend", detail: `${trade.symbol} premium rising 3 consecutive days`, confidence: "Medium", count: 1, color: "#2ECC71", date: new Date().toLocaleDateString() });
        }
        if (last3[2] < last3[1] && last3[1] < last3[0]) {
          found.push({ algo: "TREND_DOWN", stock: trade.symbol, label: "📉 3-Day Downtrend", detail: `${trade.symbol} premium falling — consider exiting`, confidence: "High", count: 1, color: "#E74C3C", date: new Date().toLocaleDateString() });
        }
      }
      // Hit take profit
      const cur = hist[hist.length - 1]?.prices[trade.id];
      if (cur) {
        const pct = ((cur - trade.entry) / trade.entry) * 100;
        if (pct >= TARGET * 100) found.push({ algo: "TAKE_PROFIT", stock: trade.symbol, label: "🏆 Take Profit Hit", detail: `${trade.symbol} hit +40% target → EXIT NOW`, confidence: "High", count: 1, color: "#F1C40F", date: new Date().toLocaleDateString() });
        if (pct <= STOP * 100) found.push({ algo: "STOP_LOSS", stock: trade.symbol, label: "🛑 Stop Loss Hit", detail: `${trade.symbol} hit −35% stop → EXIT NOW`, confidence: "High", count: 1, color: "#E74C3C", date: new Date().toLocaleDateString() });
      }
    });

    return found;
  }

  function addJournalEntry() {
    if (!newEntry.newsEvent || !newEntry.lesson) { showToast("⚠️ Fill in news event and lesson"); return; }
    const entry = { ...newEntry, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), id: Date.now() };
    const newJ = [entry, ...journal];
    const newP = detectPatterns(history, newJ);
    setJournal(newJ);
    setPatterns(newP);
    setNewEntry({ stock: "AAPL", newsEvent: "", premiumMove: "", directionRight: "yes", lesson: "", patternType: "NEWS_DRIVEN" });
    setShowJournalForm(false);
    saveAll(history, newP, newJ, algorithms);
  }

  function addAlgorithm() {
    if (!newAlgo.name || !newAlgo.condition) { showToast("⚠️ Fill in name and condition"); return; }
    const algo = { ...newAlgo, id: Date.now(), date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), owner: OWNER, verified: false, successCount: 0, failCount: 0 };
    const newA = [algo, ...algorithms];
    setAlgorithms(newA);
    setNewAlgo({ name: "", condition: "", action: "", confidence: "Low", stocks: "" });
    setShowAlgoForm(false);
    saveAll(history, patterns, journal, newA);
  }

  function getPct(trade) {
    const cur = prices[trade.id];
    return cur ? ((cur - trade.entry) / trade.entry) * 100 : null;
  }

  const gradReady = patterns.filter(p => p.algo === "TAKE_PROFIT").length >= 2;

  // ── STYLES ──
  const S = {
    app: { fontFamily: "'SF Pro Display', -apple-system, sans-serif", background: "#080810", minHeight: "100vh", color: "#E8E8F0", maxWidth: 480, margin: "0 auto", paddingBottom: 70 },
    header: { background: "linear-gradient(135deg, #0D0B1E 0%, #1A0A3E 100%)", padding: "20px 18px 14px", borderBottom: "1px solid #1E1A3E" },
    ownerBadge: { display: "inline-flex", alignItems: "center", gap: 5, background: "#1A0A3E", border: "1px solid #4A2C8A", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#A78BFA", marginBottom: 8 },
    title: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" },
    subtitle: { fontSize: 11, color: "#6B6B8A", marginTop: 3 },
    tabBar: { display: "flex", background: "#0D0B1E", borderBottom: "1px solid #1E1A3E", overflowX: "auto" },
    tab: (active) => ({ flex: "0 0 auto", padding: "9px 12px", background: "none", border: "none", borderBottom: active ? "2px solid #7C3AED" : "2px solid transparent", color: active ? "#A78BFA" : "#555570", fontSize: 11, fontWeight: active ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" }),
    card: { background: "#0D0B1E", border: "1px solid #1E1A3E", borderRadius: 12, marginBottom: 10, overflow: "hidden" },
    btn: (color = "#7C3AED") => ({ background: `linear-gradient(135deg, ${color}, ${color}CC)`, border: "none", borderRadius: 8, color: "#fff", padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" }),
    input: { background: "#0D0B1E", border: "1px solid #2A2A4A", borderRadius: 8, color: "#E8E8F0", padding: "9px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", marginBottom: 8 },
    label: { fontSize: 11, color: "#6B6B8A", marginBottom: 4, display: "block" },
    section: { padding: "12px 16px" },
    stat: { background: "#0D0B1E", padding: "10px 8px", textAlign: "center" },
    pill: (color) => ({ display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 10, background: color + "22", color: color, border: `1px solid ${color}44`, fontWeight: 500 }),
    toast: { position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#1A1A2E", border: "1px solid #2A2A4E", borderRadius: 8, padding: "8px 18px", fontSize: 12, color: "#A78BFA", zIndex: 999, whiteSpace: "nowrap" },
    bottomBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0D0B1E", borderTop: "1px solid #1E1A3E", padding: "8px 16px", textAlign: "center", fontSize: 10, color: "#444460" },
  };

  return (
    <div style={S.app}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* HEADER */}
      <div style={S.header}>
        <div style={S.ownerBadge}>🔒 Private · {OWNER} · {VERSION}</div>
        <div style={S.title}>⚗️ Trading Intelligence</div>
        <div style={S.subtitle}>Pattern algorithms · Trade tracker · Private journal</div>
      </div>

      {/* STATS BAR */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "#1E1A3E" }}>
        {[
          { label: "Trades", value: TRADES.length },
          { label: "Patterns", value: patterns.length },
          { label: "Journal", value: journal.length },
          { label: "Algorithms", value: algorithms.length },
        ].map((s, i) => (
          <div key={i} style={S.stat}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#A78BFA" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "#555570", marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={S.tabBar}>
        {TABS.map(t => <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{TAB_LABELS[t]}</button>)}
      </div>

      {/* ── TAB: TRADES ── */}
      {tab === "trades" && (
        <div style={S.section}>
          <button onClick={fetchPrices} disabled={loading} style={{ ...S.btn(), marginBottom: 12, opacity: loading ? 0.6 : 1 }}>
            {loading ? "⏳ Fetching Robinhood data..." : "🔄 Refresh Live Prices"}
          </button>
          {lastUpdated && <div style={{ fontSize: 10, color: "#555570", textAlign: "center", marginBottom: 10 }}>Updated {lastUpdated}</div>}

          {TRADES.map(trade => {
            const cur = prices[trade.id];
            const pct = getPct(trade);
            const days = daysLeft(trade.expiryDate);
            const urgent = days <= 3;
            return (
              <div key={trade.id} style={{ ...S.card, borderLeft: `3px solid ${trade.color}` }}>
                <div style={{ padding: "11px 13px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <span>{trade.emoji}</span>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{trade.symbol}</span>
                      <span style={S.pill(trade.color)}>{trade.contract}</span>
                      {trade.type === "real" && <span style={S.pill("#F39C12")}>💰 REAL</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "#555570" }}>
                      {trade.direction === "call" ? "🟢 Bull Call" : "🔴 Bear Put"} · {trade.sector} · {trade.expiry}
                      {urgent && <span style={{ color: "#E74C3C", fontWeight: 700 }}> · ⚠️ {days}d!</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: pnlColor(pct) }}>
                    {pct !== null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "—"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "#1E1A3E", margin: "0 13px 10px", borderRadius: 6, overflow: "hidden" }}>
                  {[
                    { l: "Entry", v: `$${trade.entry.toFixed(2)}` },
                    { l: "Now", v: cur ? `$${cur.toFixed(2)}` : "—" },
                    { l: "Stop", v: `$${(trade.entry * (1 + STOP)).toFixed(2)}`, c: "#E74C3C" },
                    { l: "Target", v: `$${(trade.entry * (1 + TARGET)).toFixed(2)}`, c: "#2ECC71" },
                  ].map((c, i) => (
                    <div key={i} style={{ background: "#0D0B1E", padding: "7px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.c || "#E8E8F0" }}>{c.v}</div>
                      <div style={{ fontSize: 9, color: "#555570" }}>{c.l}</div>
                    </div>
                  ))}
                </div>

                {pct !== null && (
                  <div style={{ padding: "0 13px 10px" }}>
                    <div style={{ height: 3, background: "#1E1A3E", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, ((pct + 35) / 75) * 100))}%`, background: pct >= 0 ? "#2ECC71" : "#E74C3C", transition: "width 0.4s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 8, color: "#555570" }}>
                      <span style={{ color: "#E74C3C" }}>−35%</span><span>0%</span><span style={{ color: "#2ECC71" }}>+40%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {gradReady && (
            <div style={{ background: "#0A2010", border: "1px solid #1A5030", borderRadius: 10, padding: 14, textAlign: "center", marginTop: 4 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🎓</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2ECC71" }}>Ready for Real Money!</div>
              <div style={{ fontSize: 11, color: "#555570", marginTop: 3 }}>2+ targets hit — graduation criteria met</div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: HISTORY ── */}
      {tab === "history" && (
        <div style={S.section}>
          <div style={{ fontSize: 11, color: "#555570", marginBottom: 10, textAlign: "center" }}>
            {history.length} days tracked · Private to {OWNER}
          </div>
          {history.length === 0 ? (
            <div style={{ ...S.card, padding: 30, textAlign: "center", color: "#555570" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
              <div>No history yet — tap Refresh in Trades tab</div>
            </div>
          ) : [...history].reverse().map((snap, i) => (
            <div key={i} style={{ ...S.card, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#A78BFA", marginBottom: 8 }}>📅 {snap.date}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {TRADES.map(trade => {
                  const p = snap.prices[trade.id];
                  const pct = p ? ((p - trade.entry) / trade.entry) * 100 : null;
                  return (
                    <div key={trade.id} style={{ background: "#13132A", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#555570" }}>{trade.emoji} {trade.symbol}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: pnlColor(pct), marginTop: 2 }}>
                        {pct !== null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "—"}
                      </div>
                      {p && <div style={{ fontSize: 9, color: "#444460" }}>${p.toFixed(2)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: PATTERNS ── */}
      {tab === "patterns" && (
        <div style={S.section}>
          <div style={{ fontSize: 10, color: "#555570", marginBottom: 10, textAlign: "center" }}>
            Auto-detected from your trades + journal · Private algorithms
          </div>

          {/* Graduation checklist */}
          <div style={{ ...S.card, padding: 14, marginBottom: 12, borderColor: "#2D1B69" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#A78BFA", marginBottom: 10 }}>🎓 Graduation to Real Money</div>
            {[
              { label: "2+ paper trades hit +40% target", done: patterns.filter(p => p.algo === "TAKE_PROFIT").length >= 2 },
              { label: "3+ days of price history", done: history.length >= 3 },
              { label: "5+ journal entries logged", done: journal.length >= 5 },
              { label: "2+ algorithms verified", done: algorithms.filter(a => a.verified).length >= 2 },
              { label: "No stop losses triggered", done: !patterns.some(p => p.algo === "STOP_LOSS") },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < 4 ? "1px solid #1E1A3E" : "none" }}>
                <span>{c.done ? "✅" : "⬜"}</span>
                <span style={{ fontSize: 11, color: c.done ? "#2ECC71" : "#555570" }}>{c.label}</span>
              </div>
            ))}
          </div>

          {patterns.length === 0 ? (
            <div style={{ ...S.card, padding: 28, textAlign: "center", color: "#555570" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🧠</div>
              <div style={{ fontSize: 13 }}>Patterns emerge from your journal + 3 days of data</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Add journal entries to unlock pattern detection</div>
            </div>
          ) : patterns.map((p, i) => (
            <div key={i} style={{ ...S.card, borderLeft: `3px solid ${p.color}`, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: p.color }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: "#555570", marginTop: 3 }}>{p.stock} · {p.detail}</div>
                  {p.count > 1 && <div style={{ fontSize: 10, color: "#A78BFA", marginTop: 2 }}>Seen {p.count}× — reliability increasing</div>}
                </div>
                <span style={S.pill(p.confidence === "High" ? "#2ECC71" : p.confidence === "Medium" ? "#F39C12" : "#666")}>{p.confidence}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: JOURNAL ── */}
      {tab === "journal" && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#555570" }}>{journal.length} entries · Private to {OWNER}</div>
            <button onClick={() => setShowJournalForm(!showJournalForm)} style={{ background: "#1A0A3E", border: "1px solid #4A2C8A", borderRadius: 6, color: "#A78BFA", padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
              {showJournalForm ? "✕ Cancel" : "+ Log Entry"}
            </button>
          </div>

          {showJournalForm && (
            <div style={{ ...S.card, padding: 14, marginBottom: 12, borderColor: "#4A2C8A" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#A78BFA", marginBottom: 10 }}>📓 New Journal Entry</div>
              <label style={S.label}>Stock</label>
              <select value={newEntry.stock} onChange={e => setNewEntry({ ...newEntry, stock: e.target.value })} style={S.input}>
                {TRADES.map(t => <option key={t.id} value={t.symbol}>{t.emoji} {t.symbol}</option>)}
              </select>
              <label style={S.label}>Pattern Type</label>
              <select value={newEntry.patternType} onChange={e => setNewEntry({ ...newEntry, patternType: e.target.value })} style={S.input}>
                {Object.entries(PATTERN_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <label style={S.label}>News Event</label>
              <input value={newEntry.newsEvent} onChange={e => setNewEntry({ ...newEntry, newsEvent: e.target.value })} placeholder="e.g. Record Q1 profit + $1.55 dividend" style={S.input} />
              <label style={S.label}>Premium Move</label>
              <input value={newEntry.premiumMove} onChange={e => setNewEntry({ ...newEntry, premiumMove: e.target.value })} placeholder="e.g. +29% in one day" style={S.input} />
              <label style={S.label}>Direction Correct?</label>
              <select value={newEntry.directionRight} onChange={e => setNewEntry({ ...newEntry, directionRight: e.target.value })} style={S.input}>
                <option value="yes">✅ Yes</option>
                <option value="no">❌ No</option>
                <option value="partial">⚠️ Partial</option>
              </select>
              <label style={S.label}>Lesson Learned</label>
              <input value={newEntry.lesson} onChange={e => setNewEntry({ ...newEntry, lesson: e.target.value })} placeholder="e.g. Strong fundamentals = call, not put" style={S.input} />
              <button onClick={addJournalEntry} style={S.btn("#27AE60")}>💾 Save Entry</button>
            </div>
          )}

          {journal.length === 0 ? (
            <div style={{ ...S.card, padding: 28, textAlign: "center", color: "#555570" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📓</div>
              <div>No journal entries yet</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Log your first observation above</div>
            </div>
          ) : journal.map((entry, i) => (
            <div key={i} style={{ ...S.card, padding: 12, marginBottom: 8, borderLeft: `3px solid ${entry.directionRight === "yes" ? "#2ECC71" : entry.directionRight === "no" ? "#E74C3C" : "#F39C12"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#E8E8F0" }}>{TRADES.find(t => t.symbol === entry.stock)?.emoji} {entry.stock}</span>
                <span style={{ fontSize: 10, color: "#555570" }}>{entry.date}</span>
              </div>
              <div style={{ fontSize: 10, color: "#A78BFA", marginBottom: 3 }}>{PATTERN_TYPES[entry.patternType]}</div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>📰 {entry.newsEvent}</div>
              {entry.premiumMove && <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>📈 {entry.premiumMove}</div>}
              <div style={{ fontSize: 11, color: "#E8E8F0", fontStyle: "italic" }}>💡 {entry.lesson}</div>
              <div style={{ marginTop: 5 }}>
                <span style={S.pill(entry.directionRight === "yes" ? "#2ECC71" : entry.directionRight === "no" ? "#E74C3C" : "#F39C12")}>
                  {entry.directionRight === "yes" ? "✅ Right" : entry.directionRight === "no" ? "❌ Wrong" : "⚠️ Partial"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: ALGORITHMS ── */}
      {tab === "algorithms" && (
        <div style={S.section}>
          {/* Ownership header */}
          <div style={{ background: "#0A0520", border: "1px solid #2D1B69", borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#A78BFA", marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Intellectual Property</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8E8F0" }}>© {OWNER}</div>
            <div style={{ fontSize: 10, color: "#555570", marginTop: 2 }}>All trading pattern algorithms in this system are the private intellectual property of {OWNER}. Not for public use or distribution.</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#555570" }}>{algorithms.length} custom algorithms</div>
            <button onClick={() => setShowAlgoForm(!showAlgoForm)} style={{ background: "#1A0A3E", border: "1px solid #4A2C8A", borderRadius: 6, color: "#A78BFA", padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
              {showAlgoForm ? "✕ Cancel" : "+ New Algorithm"}
            </button>
          </div>

          {showAlgoForm && (
            <div style={{ ...S.card, padding: 14, marginBottom: 12, borderColor: "#4A2C8A" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#A78BFA", marginBottom: 10 }}>⚗️ Define New Algorithm</div>
              <label style={S.label}>Algorithm Name</label>
              <input value={newAlgo.name} onChange={e => setNewAlgo({ ...newAlgo, name: e.target.value })} placeholder="e.g. Dividend Support Bull Call" style={S.input} />
              <label style={S.label}>Condition (When to trigger)</label>
              <input value={newAlgo.condition} onChange={e => setNewAlgo({ ...newAlgo, condition: e.target.value })} placeholder="e.g. Company announces dividend + record profits" style={S.input} />
              <label style={S.label}>Action (What to do)</label>
              <input value={newAlgo.action} onChange={e => setNewAlgo({ ...newAlgo, action: e.target.value })} placeholder="e.g. Buy ATM Call, expiry 3-4 weeks" style={S.input} />
              <label style={S.label}>Applicable Stocks</label>
              <input value={newAlgo.stocks} onChange={e => setNewAlgo({ ...newAlgo, stocks: e.target.value })} placeholder="e.g. FRO, any dividend stock" style={S.input} />
              <label style={S.label}>Initial Confidence</label>
              <select value={newAlgo.confidence} onChange={e => setNewAlgo({ ...newAlgo, confidence: e.target.value })} style={S.input}>
                <option value="Low">Low — needs more data</option>
                <option value="Medium">Medium — seen 2-3 times</option>
                <option value="High">High — proven pattern</option>
              </select>
              <button onClick={addAlgorithm} style={S.btn("#7C3AED")}>⚗️ Save Algorithm</button>
            </div>
          )}

          {/* Auto-detected algorithms from patterns */}
          {patterns.filter(p => ["NEWS_DRIVEN", "DIVIDEND", "POST_IPO"].includes(p.algo)).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#555570", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>🤖 Auto-Detected</div>
              {patterns.filter(p => ["NEWS_DRIVEN", "DIVIDEND", "POST_IPO"].includes(p.algo)).map((p, i) => (
                <div key={i} style={{ ...S.card, borderLeft: `3px solid ${p.color}`, padding: 10, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p.color }}>{p.label}</span>
                    <span style={S.pill(p.confidence === "High" ? "#2ECC71" : "#F39C12")}>{p.confidence}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#555570", marginTop: 3 }}>{p.detail}</div>
                </div>
              ))}
            </div>
          )}

          {/* Manual algorithms */}
          {algorithms.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "#555570", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>✍️ Your Custom Algorithms</div>
              {algorithms.map((algo, i) => (
                <div key={i} style={{ ...S.card, borderLeft: "3px solid #7C3AED", padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#A78BFA" }}>⚗️ {algo.name}</span>
                    <span style={S.pill(algo.confidence === "High" ? "#2ECC71" : algo.confidence === "Medium" ? "#F39C12" : "#666")}>{algo.confidence}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>
                    <span style={{ color: "#555570" }}>WHEN: </span>{algo.condition}
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>
                    <span style={{ color: "#555570" }}>DO: </span>{algo.action}
                  </div>
                  {algo.stocks && <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}><span style={{ color: "#555570" }}>STOCKS: </span>{algo.stocks}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#444460" }}>Added {algo.date}</span>
                    <button onClick={() => {
                      const updated = algorithms.map((a, j) => j === i ? { ...a, verified: !a.verified } : a);
                      setAlgorithms(updated);
                      saveAll(history, patterns, journal, updated);
                    }} style={{ background: algo.verified ? "#0A2010" : "#1A1A2E", border: `1px solid ${algo.verified ? "#2ECC71" : "#333"}`, borderRadius: 5, color: algo.verified ? "#2ECC71" : "#555570", padding: "3px 8px", fontSize: 10, cursor: "pointer" }}>
                      {algo.verified ? "✅ Verified" : "⬜ Verify"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {algorithms.length === 0 && patterns.filter(p => ["NEWS_DRIVEN", "DIVIDEND", "POST_IPO"].includes(p.algo)).length === 0 && (
            <div style={{ ...S.card, padding: 28, textAlign: "center", color: "#555570" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚗️</div>
              <div>No algorithms yet</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Add journal entries to auto-detect, or define your own above</div>
            </div>
          )}
        </div>
      )}

      <div style={S.bottomBar}>🔒 Private · {OWNER} · All data stored locally · Not shared</div>
    </div>
  );
}
