import { useMemo, useState } from "react";

const GOLD = "#facc15";
const rupees = value => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

const opportunities = [
  { id: "arena", icon: "🏟️", name: "Arena Growth", category: "Tournament pool", risk: "Moderate", tone: "#22c55e", copy: "Support community tournament events." },
  { id: "studio", icon: "🎮", name: "Game Studio", category: "Gaming projects", risk: "Higher", tone: "#a78bfa", copy: "Back early-stage gaming ideas." },
  { id: "community", icon: "🤝", name: "Community Fund", category: "Player community", risk: "Lower", tone: "#38bdf8", copy: "Help fund player-led activities." },
];

/**
 * Casino investment UI prototype. All figures and actions are local demo data;
 * this component does not connect to a wallet, accept funds, or promise returns.
 */
export default function CasinoInvestment({ onBack = () => {} }) {
  const [selected, setSelected] = useState(opportunities[0].id);
  const [amount, setAmount] = useState(500);
  const [demoPositions, setDemoPositions] = useState([]);
  const [notice, setNotice] = useState("");
  const totalDemo = useMemo(() => demoPositions.reduce((sum, item) => sum + item.amount, 0), [demoPositions]);
  const active = opportunities.find(item => item.id === selected) || opportunities[0];

  const previewAllocation = () => {
    const value = Math.floor(Number(amount));
    if (!Number.isFinite(value) || value < 100) {
      setNotice("Choose a demo amount of at least ₹100.");
      return;
    }
    setDemoPositions(items => [{ id: `${Date.now()}-${selected}`, name: active.name, amount: value }, ...items]);
    setNotice("Demo allocation added. No money was moved.");
  };

  const card = { border: "1px solid #ffffff16", borderRadius: 18, background: "linear-gradient(145deg,#12251c,#0b1712)", padding: 16 };
  const button = { border: "1px solid #d4af3780", borderRadius: 12, color: "#f5f5f4", background: "#16271d", padding: "11px 14px", fontWeight: 800, cursor: "pointer" };

  return (
    <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "12px 14px 36px", color: "#f5f5f4", background: "radial-gradient(ellipse at 50% -10%,#17452e 0%,#09140e 48%,#050a07 100%)", fontFamily: "system-ui,sans-serif" }}>
      <style>{`@keyframes investGlow{0%,100%{box-shadow:0 0 0 0 #facc1510}50%{box-shadow:0 0 28px 2px #facc1522}} @media(max-width:380px){.invest-grid{grid-template-columns:1fr!important}.invest-headline{font-size:26px!important}}`}</style>
      <header style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 720, margin: "0 auto 18px" }}>
        <button type="button" onClick={onBack} style={button}>← Casino</button>
        <div style={{ flex: 1, color: GOLD, fontWeight: 900, fontSize: 17 }}>CLASHX7 <span style={{ color: "#f5f5f4", fontWeight: 700 }}>· INVEST</span></div>
        <span aria-label="Demo mode" style={{ border: "1px solid #facc1566", borderRadius: 99, padding: "5px 9px", color: GOLD, fontSize: 10, fontWeight: 900 }}>DEMO</span>
      </header>

      <section style={{ ...card, maxWidth: 688, margin: "0 auto 14px", padding: "22px 18px", background: "radial-gradient(ellipse at 90% 10%,#85640c55,transparent 45%),linear-gradient(135deg,#183d2b,#0d1b13 70%)", animation: "investGlow 3s ease-in-out infinite" }}>
        <div style={{ color: GOLD, fontSize: 11, letterSpacing: 2, fontWeight: 900 }}>PLAY SMARTER. BUILD TOGETHER.</div>
        <h1 className="invest-headline" style={{ margin: "10px 0 7px", fontSize: 32, lineHeight: 1.1 }}>Gaming projects, <span style={{ color: GOLD }}>all in one place.</span></h1>
        <p style={{ margin: 0, color: "#cbd5d0", lineHeight: 1.6, fontSize: 13 }}>Explore community project concepts and preview a sample allocation. This is a visual demo—not a real investment product.</p>
        <div className="invest-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginTop: 18 }}>
          {[["DEMO PORTFOLIO", rupees(totalDemo)], ["PROJECTS", String(opportunities.length)], ["RETURNS", "Not guaranteed"]].map(([label, value]) => (
            <div key={label} style={{ borderRadius: 12, padding: 11, background: "#06110bd9", border: "1px solid #ffffff12" }}>
              <div style={{ color: "#9ca3af", fontSize: 9, letterSpacing: 1, fontWeight: 800 }}>{label}</div>
              <div style={{ color: label === "RETURNS" ? "#fbbf24" : "#fff", fontSize: label === "RETURNS" ? 12 : 19, fontWeight: 900, marginTop: 5 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", margin: "20px 2px 10px" }}>
          <div><div style={{ color: GOLD, fontSize: 10, letterSpacing: 1.6, fontWeight: 900 }}>THE PROJECTS</div><h2 style={{ margin: "4px 0 0", fontSize: 20 }}>Choose a concept</h2></div>
          <span style={{ color: "#9ca3af", fontSize: 11 }}>3 concepts</span>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {opportunities.map(item => {
            const on = selected === item.id;
            return <button type="button" key={item.id} onClick={() => { setSelected(item.id); setNotice(""); }} style={{ ...card, textAlign: "left", cursor: "pointer", border: `1px solid ${on ? item.tone : "#ffffff18"}`, boxShadow: on ? `0 0 0 1px ${item.tone}44` : "none", display: "flex", alignItems: "center", gap: 12, color: "inherit", padding: 13 }}>
              <span style={{ width: 46, height: 46, flex: "0 0 46px", display: "grid", placeItems: "center", borderRadius: 14, fontSize: 23, background: `${item.tone}20` }}>{item.icon}</span>
              <span style={{ flex: 1 }}><span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontWeight: 900 }}>{item.name}<span style={{ color: item.tone, fontSize: 9, border: `1px solid ${item.tone}70`, borderRadius: 99, padding: "3px 7px" }}>{item.risk.toUpperCase()} RISK</span></span><span style={{ display: "block", color: "#a7b0aa", fontSize: 11, marginTop: 4 }}>{item.category} · {item.copy}</span></span>
              <span style={{ color: on ? item.tone : "#68736c", fontSize: 19 }}>{on ? "◉" : "○"}</span>
            </button>;
          })}
        </div>

        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div><div style={{ color: "#9ca3af", fontSize: 10, letterSpacing: 1, fontWeight: 800 }}>DEMO ALLOCATION</div><div style={{ fontWeight: 900, marginTop: 4 }}>{active.icon} {active.name}</div></div><div style={{ textAlign: "right", color: "#fbbf24", fontSize: 11, fontWeight: 800 }}>{active.risk} risk<br /><span style={{ color: "#8d9890", fontWeight: 500 }}>Could lose value</span></div></div>
          <div style={{ display: "flex", gap: 8, marginTop: 15, flexWrap: "wrap" }}>
            {[500, 1000, 2500].map(value => <button type="button" key={value} onClick={() => setAmount(value)} style={{ ...button, flex: 1, minWidth: 75, borderColor: amount === value ? GOLD : "#ffffff20", background: amount === value ? "#51400c" : "#0b1711" }}>{rupees(value)}</button>)}
          </div>
          <label style={{ display: "block", color: "#a7b0aa", fontSize: 11, margin: "13px 0 6px" }}>Custom demo amount</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #ffffff24", background: "#07110b", borderRadius: 12, padding: "0 12px" }}><span style={{ color: GOLD, fontWeight: 900 }}>₹</span><input aria-label="Demo amount in rupees" type="number" min="100" step="100" value={amount} onChange={event => setAmount(event.target.value)} style={{ width: "100%", padding: "12px 0", color: "#fff", background: "transparent", border: 0, outline: 0, fontSize: 17, fontWeight: 800 }} /></div>
          <button type="button" onClick={previewAllocation} style={{ width: "100%", marginTop: 13, border: 0, borderRadius: 13, padding: 14, background: "linear-gradient(100deg,#fde68a,#d4af37)", color: "#111", fontSize: 14, fontWeight: 950, cursor: "pointer" }}>PREVIEW DEMO ALLOCATION · {rupees(amount)}</button>
          {notice && <p role="status" style={{ margin: "10px 0 0", color: "#86efac", fontSize: 12, textAlign: "center" }}>{notice}</p>}
        </div>

        {demoPositions.length > 0 && <div style={{ ...card, marginTop: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><b>My demo portfolio</b><span style={{ color: GOLD, fontWeight: 900 }}>{rupees(totalDemo)}</span></div>{demoPositions.map(position => <div key={position.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid #ffffff12", color: "#cbd5d0", fontSize: 12 }}><span>{position.name}</span><b style={{ color: "#fff" }}>{rupees(position.amount)}</b></div>)}</div>}

        <aside style={{ marginTop: 14, padding: 13, borderRadius: 14, background: "#3b2b0d55", border: "1px solid #facc1533", color: "#d6c9a1", fontSize: 11, lineHeight: 1.6 }}><b style={{ color: GOLD }}>⚠ Demo only · No real funds</b><br />This prototype stores sample allocations only in the current screen. It does not move wallet money, create an investment, or predict returns. Real investments can lose some or all of their value; do not rely on projected or guaranteed returns.</aside>
      </section>
    </main>
  );
}
