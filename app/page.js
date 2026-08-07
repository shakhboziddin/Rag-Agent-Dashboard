"use client";

import { useState, useRef, useEffect } from "react";
import {
  LayoutGrid, MessageSquare, Upload, Target, History, Send, Paperclip,
  LogOut, FileText, Mic, Video, RefreshCw, Check, Database, Mail, Lock,
  User, Search, Bell, ChevronDown, AlertCircle
} from "lucide-react";

/* ─────────────────────────────────────────────
   TOKENS — Claude Design Constitution v1.0
   Font: Nunito Sans
   ───────────────────────────────────────────── */
const T = {
  bg: "#090909", canvas: "#111110", s1: "#171716", s2: "#1E1E1C",
  panel: "#232321", border: "#2C2C29",
  primary: "#D9FF63", primaryHover: "#C9F04F", primaryGlow: "rgba(217,255,99,.16)",
  secondary: "#8C73F6", secondaryLight: "#A99CF8", secondaryDark: "#6650D9",
  text: "#F5F5F5", text2: "#A6A6A6", muted: "#707070",
  success: "#8FE86A", warning: "#F3C64B", danger: "#E96868", info: "#62D6FF",
};
const FONT = "'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const EASE = "cubic-bezier(.22,.61,.36,1)";

/* Workspace ID — later this comes from the profiles table after Supabase Auth */
const CLIENT_ID = "kontent_zavod";

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,500;6..12,600;6..12,700;6..12,800&display=swap');
    * { box-sizing: border-box; }
    ::placeholder { color: ${T.muted}; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: ${T.panel}; border-radius: 999px; }
    ::-webkit-scrollbar-track { background: transparent; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .fade-up { animation: fadeUp 180ms ${EASE}; }
    .hv { transition: background 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out; cursor: pointer; }
    .hv:hover { background: ${T.s2}; }
    .btn { transition: background 120ms ease-out, transform 120ms ease-out, box-shadow 180ms ease-out, border-color 120ms ease-out; cursor: pointer; border: none; font-family: ${FONT}; }
    .btn:active { transform: scale(0.98); }
    .card { background: ${T.canvas}; border: 1px solid ${T.border}; border-radius: 16px; }
    .link { color: ${T.primary}; cursor: pointer; font-weight: 700; }
    .link:hover { color: ${T.primaryHover}; }
    input, textarea, select { outline: none; }
    input:focus, textarea:focus, select:focus { border-color: ${T.primary} !important; box-shadow: 0 0 0 3px ${T.primaryGlow}; }
    @media (prefers-reduced-motion: reduce) { .fade-up { animation: none; } }
  `}</style>
);

/* ───────────────────────────── data ── */
const DOC_TYPES = [
  { id: "knowledge", label: "Bilim" },
  { id: "interview", label: "Intervyu" },
  { id: "goal", label: "Maqsad" },
  { id: "case", label: "Keys" },
];
const typeLabel = (id) => (DOC_TYPES.find((t) => t.id === id) || {}).label || id;
const initialsOf = (name) =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U";
const greeting = (name) => [{
  id: 1, role: "agent",
  text: `Assalomu alaykum, ${name.split(" ")[0]}. Men sizning AI Prodyuseringizman. Bilim bazangizga fayl yuklang yoki zapusk bo'yicha savol bering.`,
}];
const mirrorData = Array.from({ length: 34 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 0.42)) + 0.35 * Math.abs(Math.sin(i * 1.31 + 2));
  const b = Math.abs(Math.sin(i * 0.36 + 1.4)) + 0.3 * Math.abs(Math.sin(i * 1.1));
  return { up: 12 + 58 * Math.min(a, 1.3) / 1.3, down: 8 + 44 * Math.min(b, 1.25) / 1.25 };
});

/* ───────────────────────────── root ── */
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dash");
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);

  const handleAuth = (u) => { setUser(u); setMessages(greeting(u.name)); setView("dash"); };
  const handleLogout = () => { setUser(null); setMessages([]); };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT, color: T.text }}>
        <GlobalStyle />
        <AuthView onAuth={handleAuth} />
      </div>
    );
  }

  const titles = {
    dash: "Boshqaruv paneli", chat: "AI Prodyuser", uploads: "Fayllarni yuklash",
    goal: "Zapusk maqsadi", history: "Yuklashlar tarixi",
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, fontFamily: FONT, color: T.text,
      display: "flex",
      backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
      backgroundSize: "24px 24px",
    }}>
      <GlobalStyle />
      <Rail view={view} setView={setView} onLogout={handleLogout} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh" }}>
        <TopBar title={titles[view]} user={user} />
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 260, pointerEvents: "none",
            background: "radial-gradient(600px 220px at 30% 0%, rgba(217,255,99,0.055), transparent 70%)",
          }} />
          <div style={{ position: "relative", padding: "24px 28px 40px" }}>
            {view === "dash" && <DashboardView messages={messages} setMessages={setMessages} userId={user.email} />}
            {view === "chat" && <ChatView messages={messages} setMessages={setMessages} userId={user.email} />}
            {view === "uploads" && <UploadsView files={files} setFiles={setFiles} />}
            {view === "goal" && <GoalView />}
            {view === "history" && <HistoryView files={files} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── rail ── */
function Rail({ view, setView, onLogout }) {
  const nav = [
    { id: "dash", icon: LayoutGrid, label: "Boshqaruv" },
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "uploads", icon: Upload, label: "Yuklash" },
    { id: "goal", icon: Target, label: "Maqsad" },
    { id: "history", icon: History, label: "Tarix" },
  ];
  return (
    <aside style={{
      width: 68, flexShrink: 0, borderRight: `1px solid ${T.border}`,
      background: T.bg, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "16px 0", gap: 6, height: "100vh", position: "sticky", top: 0,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, background: T.primary, marginBottom: 18,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#090909", fontWeight: 800, fontSize: 13, boxShadow: `0 0 28px ${T.primaryGlow}`,
      }}>KZ</div>
      {nav.map(({ id, icon: Icon, label }) => {
        const active = view === id;
        return (
          <div key={id} className="hv" onClick={() => setView(id)} title={label} style={{
            width: 42, height: 42, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: active ? T.s2 : "transparent", position: "relative",
          }}>
            {active && <span style={{
              position: "absolute", left: -13, top: 11, bottom: 11, width: 3,
              borderRadius: 999, background: T.primary,
            }} />}
            <Icon size={18} strokeWidth={2} color={active ? T.primary : T.muted} />
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <div className="hv" onClick={onLogout} title="Chiqish" style={{
        width: 42, height: 42, borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <LogOut size={17} color={T.muted} />
      </div>
    </aside>
  );
}

/* ───────────────────────────── topbar ── */
function TopBar({ title, user }) {
  return (
    <div style={{
      height: 64, flexShrink: 0, borderBottom: `1px solid ${T.border}`,
      display: "flex", alignItems: "center", padding: "0 28px", gap: 12, background: T.bg,
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ flex: 1 }} />
      <div className="hv" style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Search size={15} color={T.text2} />
      </div>
      <div className="hv" style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <Bell size={15} color={T.text2} />
        <span style={{ position: "absolute", top: 8, right: 9, width: 6, height: 6, borderRadius: 999, background: T.primary }} />
      </div>
      <div style={{ width: 1, height: 24, background: T.border, margin: "0 4px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 999, background: T.secondaryDark,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color: T.text,
        }}>{initialsOf(user.name)}</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Prodyuser · Admin</div>
        </div>
        <ChevronDown size={14} color={T.muted} />
      </div>
    </div>
  );
}

/* ───────────────────────────── dashboard ── */
function DashboardView({ messages, setMessages, userId }) {
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard label="Bilim bazasi" value="12" unit="hujjat" chip="+3 shu hafta" chipColor={T.success} bars={[3, 5, 4, 7, 6, 9, 8, 11]} />
        <StatCard label="Intervyular" value="8" unit="/ 15" chip="53% bajarildi" chipColor={T.warning} bars={[2, 3, 3, 5, 5, 6, 7, 8]} />
        <StatCard label="Budjet sarfi" value="16.2" unit="mln so'm" chip="32% ishlatildi" chipColor={T.secondaryLight} bars={[1, 2, 4, 4, 6, 8, 10, 12]} violet />
        <StatCard label="Vebinargacha" value="24" unit="kun" chip="3-QADAM · Traffik" chipColor={T.info} bars={[12, 10, 9, 8, 6, 5, 3, 2]} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)", gap: 16, alignItems: "stretch" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Zapusk faolligi</div>
                <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginTop: 2 }}>Kontent chiqishi va auditoriya reaksiyasi · haftalik</div>
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: 12, fontWeight: 700, color: T.text2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: T.primary }} />Kontent
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: T.secondary }} />Reaksiya
                </span>
              </div>
            </div>
            <svg viewBox="0 0 600 210" style={{ width: "100%", display: "block" }}>
              {[35, 70, 105, 140, 175].map((y) => (
                <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="rgba(255,255,255,.045)" strokeWidth="1" />
              ))}
              {mirrorData.map((d, i) => (
                <g key={i}>
                  <rect x={i * 17.6 + 3} y={105 - d.up} width="9" height={d.up} rx="2.5" fill={T.primary} opacity={i > 26 ? 0.35 : 0.95} />
                  <rect x={i * 17.6 + 3} y={108} width="9" height={d.down} rx="2.5" fill={T.secondary} opacity={i > 26 ? 0.3 : 0.8} />
                </g>
              ))}
              {["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg"].map((m, i) => (
                <text key={m} x={i * 76 + 12} y={202} fontSize="10" fontWeight="700" fill={T.muted} fontFamily={FONT}>{m}</text>
              ))}
            </svg>
          </div>

          <div className="card" style={{ padding: 20, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Voronka dekompozitsiyasi</div>
                <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginTop: 2 }}>Amaldagi ko'rsatkich va reja · 1-QADAM asosida</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>
                <span style={{ color: T.primary }}>■</span> amalda&nbsp;&nbsp;<span style={{ color: T.muted }}>■</span> reja
              </span>
            </div>
            <FunnelRow label="Traffik" fact="84 000" plan="120 000" pct={70} />
            <FunnelRow label="Lidlar" fact="2 380" plan="3 500" pct={54} />
            <FunnelRow label="Vebinar" fact="640" plan="1 200" pct={42} />
            <FunnelRow label="Sotuvlar" fact="18" plan="100" pct={18} last />
          </div>
        </div>

        <ChatView messages={messages} setMessages={setMessages} userId={userId} embedded />
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, chip, chipColor, bars, violet }) {
  const max = Math.max(...bars);
  return (
    <div className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: chipColor, whiteSpace: "nowrap" }}>{chip}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontSize: 30, fontWeight: 800, lineHeight: "34px", letterSpacing: "-0.02em" }}>{value}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{unit}</span>
        </div>
        <svg viewBox="0 0 66 30" style={{ width: 66, height: 30, flexShrink: 0 }}>
          {bars.map((b, i) => (
            <rect key={i} x={i * 8.4} y={30 - (b / max) * 28} width="5.5" rx="1.5"
              height={(b / max) * 28}
              fill={violet ? T.secondary : T.primary}
              opacity={i === bars.length - 1 ? 1 : 0.3} />
          ))}
        </svg>
      </div>
    </div>
  );
}

function FunnelRow({ label, fact, plan, pct, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: last ? 0 : 12 }}>
      <span style={{ width: 74, fontSize: 12, fontWeight: 700, color: T.text2, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: "flex", gap: 4, alignItems: "center" }}>
        <div style={{
          width: `${pct}%`, minWidth: 74, background: T.primary, borderRadius: 8,
          padding: "7px 12px", fontSize: 12, fontWeight: 800, color: "#141410",
          whiteSpace: "nowrap", transition: `width 300ms ${EASE}`,
        }}>{fact}</div>
        <div style={{
          flex: 1, background: T.panel, borderRadius: 8, padding: "7px 12px",
          fontSize: 12, fontWeight: 700, color: T.muted, whiteSpace: "nowrap", overflow: "hidden",
        }}>{plan} reja</div>
      </div>
    </div>
  );
}

/* ───────────────────────────── auth ── */
function AuthView({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const signup = mode === "signup";

  const submit = () => {
    if (signup && name.trim().length < 2) return setError("Ismingizni kiriting");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Email noto'g'ri kiritildi");
    if (password.length < 6) return setError("Parol kamida 6 ta belgi bo'lishi kerak");
    setError("");
    // PRODUCTION: supabase.auth.signInWithPassword / signUp
    onAuth({ name: signup ? name.trim() : email.split("@")[0], email });
  };
  const google = () => {
    // PRODUCTION: supabase.auth.signInWithOAuth({ provider: "google" })
    onAuth({ name: "Shohijahon", email: "demo@kontentzavod.uz" });
  };

  const wrap = { position: "relative", marginBottom: 12 };
  const inputStyle = {
    width: "100%", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12,
    color: T.text, fontSize: 15, lineHeight: "24px", padding: "11px 14px 11px 42px",
    fontFamily: FONT, transition: "border-color 120ms ease-out, box-shadow 180ms ease-out",
  };
  const icon = { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
      backgroundSize: "24px 24px", position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(560px 300px at 50% 0%, rgba(217,255,99,0.06), transparent 70%)",
      }} />
      <div className="fade-up" style={{
        width: "100%", maxWidth: 400, background: T.canvas, borderRadius: 24,
        border: `1px solid ${T.border}`, padding: 32, position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,.55)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: T.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#090909", fontWeight: 800, fontSize: 15, boxShadow: `0 0 28px ${T.primaryGlow}`,
          }}>KZ</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Kontent Zavod</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>AI Prodyuser</div>
          </div>
        </div>

        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: "36px", letterSpacing: "-0.01em", marginBottom: 4 }}>
          {signup ? "Hisob yaratish" : "Kirish"}
        </div>
        <div style={{ fontSize: 14, color: T.text2, lineHeight: "22px", marginBottom: 24, fontWeight: 600 }}>
          {signup ? "Jamoangiz workspace'iga qo'shiling" : "Suhbatlaringiz saqlanadi — qayerda to'xtagan bo'lsangiz, o'sha yerdan davom etasiz"}
        </div>

        {signup && (
          <div style={wrap}>
            <User size={16} color={T.muted} style={icon} />
            <input style={inputStyle} placeholder="Ism familiya" value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }} />
          </div>
        )}
        <div style={wrap}>
          <Mail size={16} color={T.muted} style={icon} />
          <input style={inputStyle} placeholder="Email" type="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
        </div>
        <div style={wrap}>
          <Lock size={16} color={T.muted} style={icon} />
          <input style={inputStyle} placeholder="Parol" type="password" value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>

        {error && <div className="fade-up" style={{ fontSize: 13, fontWeight: 700, color: T.danger, marginBottom: 12 }}>{error}</div>}

        <button className="btn" onClick={submit} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, background: T.primary,
          color: "#090909", fontSize: 15, fontWeight: 800,
          boxShadow: `0 0 24px ${T.primaryGlow}`, marginBottom: 16,
        }}>
          {signup ? "Hisob yaratish" : "Kirish"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>yoki</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        <button className="btn" onClick={google} style={{
          width: "100%", padding: "12px 0", borderRadius: 12, background: T.s1,
          border: `1px solid ${T.border}`, color: T.text, fontSize: 14, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: 999, background: T.s2, border: `1px solid ${T.border}`,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: T.text,
          }}>G</span>
          Google bilan davom etish
        </button>

        <div style={{ fontSize: 14, color: T.text2, textAlign: "center", marginTop: 24, fontWeight: 600 }}>
          {signup ? "Hisobingiz bormi? " : "Hisobingiz yo'qmi? "}
          <span className="link" onClick={() => { setMode(signup ? "signin" : "signup"); setError(""); }}>
            {signup ? "Kirish" : "Hisob yaratish"}
          </span>
        </div>

        <div style={{ fontSize: 12, color: T.muted, lineHeight: "18px", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}`, fontWeight: 600 }}>
          Yangi hisoblar admin tomonidan workspace'ga biriktiriladi. Har bir foydalanuvchining suhbat tarixi alohida saqlanadi.
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── chat (full page + embedded) ── */
function ChatView({ messages, setMessages, userId, embedded }) {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text }]);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, client_id: CLIENT_ID, user_id: userId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const answer = data.output || data.text || data.message || "Javob bo'sh keldi.";
      setMessages((m) => [...m, { id: Date.now() + 1, role: "agent", text: answer }]);
    } catch (err) {
      setMessages((m) => [...m, {
        id: Date.now() + 1, role: "agent", error: true,
        text: "Ulanishda xatolik: agent javob bermadi. n8n workflow faol ekanini va .env sozlamalarini tekshiring.",
      }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="card fade-up" style={{
      display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0,
      height: embedded ? "auto" : "calc(100vh - 160px)",
      minHeight: embedded ? 480 : 420,
    }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: T.success }} />
        <span style={{ fontSize: 13, fontWeight: 800 }}>AI Prodyuser</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>· tarix saqlanadi</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m) => <Message key={m.id} m={m} compact={embedded} />)}
        {thinking && (
          <div className="fade-up" style={{ alignSelf: "flex-start", display: "flex", gap: 5, padding: "12px 16px", background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: 999, background: T.muted,
                animation: `fadeUp 600ms ${EASE} ${i * 120}ms infinite alternate`,
              }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: "12px 14px 14px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 6, background: T.s1,
          border: `1px solid ${T.border}`, borderRadius: 14, padding: 6,
        }}>
          <button className="btn" title="Fayl biriktirish" style={{
            width: 38, height: 38, borderRadius: 11, background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Paperclip size={16} color={T.text2} />
          </button>
          <textarea
            rows={1} value={input} placeholder="Savolingizni yozing…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={{
              flex: 1, resize: "none", background: "transparent", border: "1px solid transparent",
              borderRadius: 11, color: T.text, fontSize: 14, lineHeight: "22px",
              fontFamily: FONT, padding: "8px 6px", maxHeight: 120, minWidth: 0,
            }}
          />
          <button className="btn" onClick={send} title="Yuborish" style={{
            width: 38, height: 38, borderRadius: 11,
            background: input.trim() ? T.primary : T.panel,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: input.trim() ? `0 0 24px ${T.primaryGlow}` : "none",
          }}>
            <Send size={15} color={input.trim() ? "#090909" : T.muted} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Message({ m, compact }) {
  const user = m.role === "user";
  return (
    <div className="fade-up" style={{ alignSelf: user ? "flex-end" : "flex-start", maxWidth: compact ? "92%" : "76%" }}>
      <div style={{
        padding: "10px 14px", fontSize: 14, lineHeight: "22px", borderRadius: 14,
        background: user ? T.panel : T.s1,
        border: `1px solid ${m.error ? "rgba(233,104,104,.4)" : user ? "transparent" : T.border}`,
        borderTopRightRadius: user ? 4 : 14,
        borderTopLeftRadius: user ? 14 : 4,
        color: m.error ? T.danger : T.text,
        whiteSpace: "pre-wrap",
      }}>
        {m.error && <AlertCircle size={13} style={{ marginRight: 6, verticalAlign: "-2px" }} />}
        {m.text}
      </div>
      {m.sources && (
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Database size={12} color={T.muted} />
          {m.sources.map((s) => (
            <span key={s} style={{
              fontSize: 11, fontWeight: 700, color: T.text2, background: T.s2,
              border: `1px solid ${T.border}`, borderRadius: 999, padding: "2px 10px",
            }}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── uploads ── */
function UploadsView({ files, setFiles }) {
  const [docType, setDocType] = useState("knowledge");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (list) => {
    Array.from(list).forEach(async (f, i) => {
      const id = Date.now() + i;
      const entry = {
        id, name: f.name, type: docType,
        kind: f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "audio" : "text",
        date: new Date().toLocaleDateString("uz-UZ"), status: "processing",
      };
      setFiles((prev) => [entry, ...prev]);

      try {
        if (f.size > 4 * 1024 * 1024) throw new Error("4MB dan katta fayl (v1 limit)");
        const fd = new FormData();
        fd.append("client_id", CLIENT_ID);
        fd.append("doc_type", docType);
        fd.append("file", f, f.name);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFiles((prev) => prev.map((x) => (x.id === id ? { ...x, status: "ready" } : x)));
      } catch (err) {
        setFiles((prev) => prev.map((x) => (x.id === id ? { ...x, status: "error", errMsg: String(err.message || err) } : x)));
      }
    });
  };

  return (
    <div className="fade-up" style={{ maxWidth: 860 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Hujjat turi</div>
      <div style={{ display: "inline-flex", gap: 4, background: T.canvas, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {DOC_TYPES.map((t) => (
          <button key={t.id} className="btn" onClick={() => setDocType(t.id)} style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: docType === t.id ? T.panel : "transparent",
            color: docType === t.id ? T.primary : T.text2,
          }}>{t.label}</button>
        ))}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{
          border: `1px dashed ${drag ? T.primary : T.border}`,
          background: drag ? T.primaryGlow : T.canvas,
          borderRadius: 16, padding: "44px 24px", textAlign: "center", cursor: "pointer",
          transition: "border-color 180ms ease-out, background 180ms ease-out", marginBottom: 28,
        }}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.md,.mp3,.m4a,.ogg,.wav,.mp4"
          style={{ display: "none" }}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 14 }}>
          <Video size={20} color={T.muted} />
          <Mic size={20} color={T.muted} />
          <FileText size={20} color={T.muted} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Fayllarni shu yerga tashlang</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>PDF, TXT, MP3, M4A, OGG · ovozli xabarlar ham · 4MB gacha (v1)</div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, color: T.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Oxirgi yuklanganlar</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {files.length === 0 && (
          <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, padding: "12px 4px" }}>
            Hali fayl yuklanmagan — birinchi faylni tashlang.
          </div>
        )}
        {files.map((f) => <FileRow key={f.id} f={f} />)}
      </div>
    </div>
  );
}

function FileRow({ f, action }) {
  const KindIcon = f.kind === "video" ? Video : f.kind === "audio" ? Mic : FileText;
  return (
    <div className="hv fade-up" style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
      background: T.canvas, border: `1px solid ${T.border}`, borderRadius: 16,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 11, background: T.s2,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <KindIcon size={16} color={T.secondaryLight} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontWeight: 600 }}>
          {typeLabel(f.type)} · {f.date}{f.errMsg ? ` · ${f.errMsg}` : ""}
        </div>
      </div>
      {f.status === "processing" && (
        <span style={{
          fontSize: 11, fontWeight: 800, color: T.warning, background: "rgba(243,198,75,.1)",
          borderRadius: 999, padding: "4px 12px", whiteSpace: "nowrap",
        }}>Qayta ishlanmoqda</span>
      )}
      {f.status === "ready" && (
        <span style={{
          fontSize: 11, fontWeight: 800, color: T.success, background: "rgba(143,232,106,.1)",
          borderRadius: 999, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
        }}><Check size={11} /> Tayyor</span>
      )}
      {f.status === "error" && (
        <span style={{
          fontSize: 11, fontWeight: 800, color: T.danger, background: "rgba(233,104,104,.1)",
          borderRadius: 999, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
        }}><AlertCircle size={11} /> Xatolik</span>
      )}
      {action}
    </div>
  );
}

/* ───────────────────────────── goal ── */
function GoalView() {
  const [form, setForm] = useState({ sales: "", check: "", budget: "", start: "", end: "", funnel: "webinar" });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setSaved(false); };

  const inputStyle = {
    width: "100%", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12,
    color: T.text, fontSize: 15, lineHeight: "24px", padding: "11px 14px", fontFamily: FONT,
    transition: "border-color 120ms ease-out, box-shadow 180ms ease-out",
  };
  const labelStyle = { fontSize: 11, fontWeight: 800, color: T.text2, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.07em" };

  const save = async () => {
    setSaved(true);
    // Send the goal as a text document into the knowledge base
    const goalText = `ZAPUSK MAQSADI\nSotuv maqsadi: ${form.sales} dona\nO'rtacha chek: ${form.check} so'm\nReklama budjeti: ${form.budget} so'm\nBoshlanish: ${form.start}\nTugash: ${form.end}\nVoronka turi: ${form.funnel}`;
    try {
      const blob = new Blob([goalText], { type: "text/plain" });
      const fd = new FormData();
      fd.append("client_id", CLIENT_ID);
      fd.append("doc_type", "goal");
      fd.append("file", blob, "launch_goal.txt");
      await fetch("/api/upload", { method: "POST", body: fd });
    } catch (e) { /* stays saved locally; upload retries on next save */ }
  };

  return (
    <div className="card fade-up" style={{ maxWidth: 640, padding: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Zapusk parametrlari</div>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 20 }}>Saqlanganda bilim bazasiga "launch_goal.txt" sifatida yoziladi — agent shu asosda ishlaydi</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Sotuv maqsadi (dona)</label>
          <input style={inputStyle} value={form.sales} onChange={set("sales")} placeholder="100" inputMode="numeric" />
        </div>
        <div>
          <label style={labelStyle}>O'rtacha chek (so'm)</label>
          <input style={inputStyle} value={form.check} onChange={set("check")} placeholder="2 500 000" inputMode="numeric" />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Reklama budjeti (so'm)</label>
        <input style={inputStyle} value={form.budget} onChange={set("budget")} placeholder="50 000 000" inputMode="numeric" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Boshlanish sanasi</label>
          <input type="date" style={inputStyle} value={form.start} onChange={set("start")} />
        </div>
        <div>
          <label style={labelStyle}>Tugash sanasi</label>
          <input type="date" style={inputStyle} value={form.end} onChange={set("end")} />
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Voronka turi</label>
        <select style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} value={form.funnel} onChange={set("funnel")}>
          <option value="webinar">Vebinar voronkasi</option>
          <option value="marathon">Marafon voronkasi</option>
          <option value="direct">To'g'ridan-to'g'ri sotuv</option>
          <option value="progrev">Progrev + konsultatsiya</option>
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button className="btn" onClick={save} style={{
          padding: "12px 26px", borderRadius: 12, background: T.primary, color: "#090909",
          fontSize: 14, fontWeight: 800, boxShadow: `0 0 24px ${T.primaryGlow}`,
        }}>Maqsadni saqlash</button>
        {saved && (
          <span className="fade-up" style={{ fontSize: 13, fontWeight: 700, color: T.success, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={15} /> Saqlandi — bilim bazasiga yozildi
          </span>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── history ── */
function HistoryView({ files }) {
  return (
    <div className="fade-up" style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {files.length === 0 && (
          <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>
            Tarix bo'sh — Yuklash sahifasidan birinchi faylni yuboring.
          </div>
        )}
        {files.map((f) => (
          <FileRow key={f.id} f={f} action={
            <button className="btn" title="Qayta yuklash (eski versiya o'chadi)" style={{
              width: 34, height: 34, borderRadius: 11, background: "transparent",
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center",
              justifyContent: "center", marginLeft: 8, flexShrink: 0,
            }}>
              <RefreshCw size={14} color={T.text2} />
            </button>
          } />
        ))}
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 16, lineHeight: "18px", fontWeight: 600 }}>
        Faylni qayta yuklasangiz, eski versiya avtomatik almashtiriladi — agent doim eng yangi ma'lumot bilan ishlaydi.
      </div>
    </div>
  );
}