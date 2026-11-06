import { useState } from "react";

const GOLD = "#facc15";
const projects = [
  { icon: "🏟️", title: "Arena projects", text: "Community tournaments and esports events", color: "#22c55e" },
  { icon: "🎮", title: "Gaming creators", text: "Gaming and creator-led initiatives", color: "#a78bfa" },
  { icon: "🤝", title: "Player community", text: "Programs built for ClashX7 players", color: "#38bdf8" },
];

/** Investment landing screen. Real-money investing is unavailable until a secure backend and product terms exist. */
export default function CasinoInvestment({ onBack = () => {} }) {
  const [selected, setSelected] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const panel = { border: "1px solid #ffffff18", borderRadius: 18, background: "linear-gradient(145deg,#13271c,#0a1510)", padding: 16 };

  return (
    <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "12px 14px 36px", color: "#f5f5f4", background: "radial-gradient(ellipse at 50% -10%,#17452e 0%,#09140e 48%,#050a07 100%)", fontFamily: "system-ui,sans-serif" }}>
      <style>{`@keyframes investmentShine{0%,100%{box-shadow:0 10px 28px #0005}50%{box-shadow:0 10px 34px #facc1522}} .investProject:active{transform:scale(.985)} @media(max-width:360px){.investStats{grid-template-columns:1fr!important}}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 720, margin: "0 auto 18px" }}>
        <button type="button" onClick={onBack} style={{ border: "1px solid #d4af3780", borderRadius: 12, color: "#f5f5f4", background: "#16271d", padding: "10px 13px", fontWeight: 800, cursor: "pointer" }}>← Casino</button>
        <div style={{ flex: 1, color: GOLD, fontWeight: 900, fontSize: 16 }}>CLASHX7 <span style={{ color: "#f5f5f4" }}>· INVEST</span></div>
        <span style={{ border: "1px solid #facc1566", borderRadius: 99, padding: "5px 9px", color: GOLD, fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>COMING SOON</span>
      </div>

      <section style={{ ...panel, maxWidth: 688, margin: "0 auto 14px", padding: "22px 18px", background: "radial-gradient(ellipse at 92% 8%,#85640c55,transparent 45%),linear-gradient(135deg,#183d2b,#0d1b13 70%)", animation: "investmentShine 3.2s ease-in-out infinite" }}>
        <div style={{ color: GOLD, fontSize: 10, letterSpacing: 2, fontWeight: 900 }}>A NEW WAY TO BACK THE GAME</div>
        <h1 style={{ margin: "10px 0 8px", fontSize: 30, lineHeight: 1.12 }}>Invest in the future of <span style={{ color: GOLD }}>gaming.</span></h1>
        <p style={{ margin: 0, color: "#cbd5d0", lineHeight: 1.65, fontSize: 13 }}>Explore ideas supporting tournaments, creators and the player community—all in one place.</p>
        <div className="investStats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 18 }}>
          {[["PROJECT AREAS", "03"], ["INVESTING STATUS", "Not available yet"]].map(([label, value]) => <div key={label} style={{ borderRadius: 12, padding: 11, background: "#06110bd9", border: "1px solid #ffffff12" }}><div style={{ color: "#9ca3af", fontSize: 9, letterSpacing: 1, fontWeight: 800 }}>{label}</div><div style={{ color: label === "PROJECT AREAS" ? GOLD : "#fbbf24", fontSize: label === "PROJECT AREAS" ? 20 : 12, fontWeight: 900, marginTop: 5 }}>{value}</div></div>)}
        </div>
      </section>

      <section style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ margin: "20px 2px 10px" }}><div style={{ color: GOLD, fontSize: 10, letterSpacing: 1.6, fontWeight: 900 }}>EXPLORE</div><h2 style={{ margin: "4px 0 0", fontSize: 20 }}>Gaming project areas</h2></div>
        <div style={{ display: "grid", gap: 10 }}>
          {projects.map((project, index) => {
            const active = selected === index;
            return <button className="investProject" type="button" key={project.title} onClick={() => setSelected(index)} aria-pressed={active} style={{ ...panel, textAlign: "left", cursor: "pointer", border: `1px solid ${active ? project.color : "#ffffff18"}`, display: "flex", alignItems: "center", gap: 12, color: "inherit", padding: 13, transition: "transform .15s,border-color .15s" }}>
              <span style={{ width: 46, height: 46, flex: "0 0 46px", display: "grid", placeItems: "center", borderRadius: 14, fontSize: 23, background: `${project.color}20` }}>{project.icon}</span>
              <span style={{ flex: 1 }}><strong style={{ display: "block", fontSize: 14 }}>{project.title}</strong><span style={{ display: "block", color: "#a7b0aa", fontSize: 11, marginTop: 4 }}>{project.text}</span></span>
              <span aria-hidden="true" style={{ color: active ? project.color : "#68736c", fontSize: 19 }}>{active ? "◉" : "›"}</span>
            </button>;
          })}
        </div>

        <section style={{ ...panel, marginTop: 14, textAlign: "center", padding: "20px 16px" }}>
          <div style={{ width: 48, height: 48, margin: "0 auto 10px", borderRadius: 16, display: "grid", placeItems: "center", background: "#facc1518", fontSize: 24 }}>🔒</div>
          <div style={{ color: GOLD, fontSize: 10, letterSpacing: 1.4, fontWeight: 900 }}>INVESTING IS NOT OPEN</div>
          <h3 style={{ margin: "7px 0", fontSize: 18 }}>We’re building this responsibly</h3>
          <p style={{ color: "#aeb8b0", fontSize: 12, lineHeight: 1.6, margin: "0 auto", maxWidth: 460 }}>No deposits, wallet deductions, investment orders or returns are available on this screen. We’ll only enable real investing after the service, protections and full terms are ready.</p>
          <button type="button" onClick={() => setShowInfo(value => !value)} style={{ marginTop: 14, padding: "10px 14px", borderRadius: 11, border: "1px solid #facc1555", background: "#facc1512", color: GOLD, fontWeight: 800, cursor: "pointer" }}>{showInfo ? "Hide details" : "What happens next?"}</button>
          {showInfo && <p role="status" style={{ color: "#cbd5d0", fontSize: 11, lineHeight: 1.6, margin: "12px 0 0" }}>Project details, eligibility, fees, risk disclosures, and secure server-side funding and withdrawal support must be published before any real investment can be offered. Returns are never guaranteed.</p>}
        </section>
        <p style={{ margin: "14px 4px 0", color: "#8d9890", fontSize: 10, lineHeight: 1.5, textAlign: "center" }}>Investments can lose value. This screen does not accept or manage money.</p>
      </section>
    </main>
  );
}
