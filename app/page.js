"use client";

import { useState, useRef, useEffect } from "react";
import {
  LayoutGrid, FolderPlus, Brain, Upload, FileText,
  Mic, Video, Send, Paperclip, LogOut,
  RefreshCw, Check, Mail, Lock, User,
  Search, Bell, ChevronDown, AlertCircle, Copy,
  Sparkles, ArrowLeft, Plus, MessageSquare, Target,
  Zap,
  Send as SendIcon
} from "lucide-react";
import { supabase } from "../lib/supabase";

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS — Claude Design Constitution v1.0
   ═══════════════════════════════════════════════════════════ */
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

const BRAIN_ID = "brain";
const TELEGRAM_BOT = "ProdSync_bot";  // without the @

/* ═══════════════════════════════════════════════════════════
   UI LABELS (Uzbek) — swap this object to add RU/EN later
   ═══════════════════════════════════════════════════════════ */
const L = {
  nav: { projects: "Loyihalar", brain: "Bilim bazasi", chat: "Chat", profile: "Profil" },
  stage: {
    uploading: "Yuklanmoqda",
    processing: "Qayta ishlanmoqda",
    transcribing: "Transkripsiya qilinmoqda",
    analyzing: "Tahlil qilinmoqda",
    done: "Tayyor",
    error: "Xatolik",
  },
};

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,500;6..12,600;6..12,700;6..12,800&display=swap');
    * { box-sizing: border-box; }
    ::placeholder { color: ${T.muted}; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: ${T.panel}; border-radius: 999px; }
    ::-webkit-scrollbar-track { background: transparent; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slide { 0% { left: -35%; } 100% { left: 100%; } }
    .indeterminate { animation: slide 1.4s ease-in-out infinite; }
    .fade-up { animation: fadeUp 180ms ${EASE}; }
    .spin { animation: spin 900ms linear infinite; }
    .hv { transition: background 120ms ease-out, border-color 120ms ease-out; cursor: pointer; }
    .hv:hover { background: ${T.s2}; }
    .btn { transition: background 120ms ease-out, transform 120ms ease-out, box-shadow 180ms ease-out, border-color 120ms ease-out; cursor: pointer; border: none; font-family: ${FONT}; }
    .btn:active { transform: scale(0.98); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .card { background: ${T.canvas}; border: 1px solid ${T.border}; border-radius: 16px; }
    .link { color: ${T.primary}; cursor: pointer; font-weight: 700; }
    input, textarea, select { outline: none; font-family: ${FONT}; }
    input:focus, textarea:focus, select:focus { border-color: ${T.primary} !important; box-shadow: 0 0 0 3px ${T.primaryGlow}; }
    @media (prefers-reduced-motion: reduce) { .fade-up, .spin { animation: none; } }
  `}</style>
);

/* ═══════════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════════ */
const initialsOf = (n) =>
  n.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U";
const fmtMB = (b) => (b / 1024 / 1024).toFixed(1);
const slugify = (s) =>
  "p_" + s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24);

/* Upload a file to R2, then notify n8n. clientId = "brain" or a project_id */
function uploadFile(file, clientId, docType, onProgress) {
  return new Promise(async (resolve, reject) => {
    try {
      const urlRes = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: file.name,
          content_type: file.type || "application/octet-stream",
          client_id: clientId,
        }),
      });
      if (!urlRes.ok) throw new Error(`URL error (${urlRes.status})`);
      const { uploadUrl, publicUrl } = await urlRes.json();

      await new Promise((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress)
            onProgress(Math.round((e.loaded / e.total) * 100), e.loaded, e.total);
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? res()
            : rej(new Error(`R2 error (${xhr.status})`));
        xhr.onerror = () => rej(new Error("Tarmoq uzildi"));
        xhr.timeout = 0;
        xhr.send(file);
      });

      const fileId = `${clientId}_${file.name}`;

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          doc_type: docType,
          file_name: file.name,
          file_url: publicUrl,
        }),
      });
      if (!res.ok) throw new Error(`n8n error (${res.status})`);
      const data = await res.json();
      resolve({ ...data, file_id: fileId });
    } catch (err) {
      reject(err);
    }
  });
}

/* Poll upload_status until the backend finishes (or times out) */
function watchStatus(fileId, onStage) {
  let stop = false;
  const started = Date.now();
  const MAX_MS = 30 * 60 * 1000; // give up after 30 min

  const tick = async () => {
    if (stop) return;
    if (Date.now() - started > MAX_MS) {
      onStage({ stage: "error", message: "Juda uzoq davom etdi" });
      return;
    }
    const { data } = await supabase
      .from("upload_status")
      .select("stage, progress, message")
      .eq("file_id", fileId)
      .order("updated_at", { ascending: false })
      .limit(1);

    const row = data && data[0];
    if (row) {
      onStage(row);
      if (row.stage === "done" || row.stage === "error") return;
    }
    setTimeout(tick, 4000);
  };

  setTimeout(tick, 3000);
  return () => { stop = true; };
}

/* ═══════════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState("projects");
  const [openProject, setOpenProject] = useState(null);
  // Chat messages live here so switching pages does not wipe them
  const [chatMessages, setChatMessages] = useState([]);
  // Uploads also live here — they keep running when you change page
  const [uploads, setUploads] = useState([]);
  const fileStore = useRef({});

  const patchUpload = (id, patch) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const runUpload = async (id, fileObj, clientId, docType) => {
    patchUpload(id, { stage: "uploading", progress: 0, errMsg: null });
    try {
      const r = await uploadFile(fileObj, clientId, docType, (pct, loaded, total) =>
        patchUpload(id, { progress: pct, loaded, total })
      );
      patchUpload(id, { stage: "processing", progress: 100, fileId: r.file_id });
      watchStatus(r.file_id, (s) =>
        patchUpload(id, {
          stage: s.stage,
          errMsg: s.stage === "error" ? s.message || "Xatolik" : null,
        })
      );
    } catch (err) {
      patchUpload(id, { stage: "error", errMsg: String(err.message || err) });
    }
  };

  const addUploads = (list, clientId, docType) => {
    Array.from(list).forEach((f, i) => {
      const id = Date.now() + i;
      fileStore.current[id] = { file: f, clientId, docType };
      setUploads((prev) => [
        {
          id, name: f.name, size: f.size, clientId, docType,
          kind: f.type.startsWith("video") ? "video"
              : f.type.startsWith("audio") ? "audio" : "text",
          stage: "uploading", progress: 0,
        },
        ...prev,
      ]);
      runUpload(id, f, clientId, docType);
    });
  };

  const retryUpload = (id) => {
    const s = fileStore.current[id];
    if (s) runUpload(id, s.file, s.clientId, s.docType);
  };

  const clearFinished = () =>
    setUploads((prev) => prev.filter((u) => u.stage !== "done"));

  // Real session check — runs once on load, and on every auth change
  useEffect(() => {
    const applySession = async (session) => {
      if (session && session.user) {
        const email = session.user.email;
        const meta = session.user.user_metadata || {};
        const name = meta.full_name || email.split("@")[0];
        setUser({ name, email, id: session.user.id });
        // keep app_users in sync for Telegram linking
        supabase.from("app_users")
          .upsert({ email, full_name: name }, { onConflict: "email" })
          .then(() => {});
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      applySession(session);
      setChatMessages([]);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setChatMessages([]);
    setView("projects");
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: T.bg, fontFamily: FONT, color: T.muted,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700,
      }}>
        <GlobalStyle />
        Yuklanmoqda...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: T.bg, fontFamily: FONT, color: T.text }}>
        <GlobalStyle />
        <AuthView />
      </div>
    );
  }

  const titles = {
    projects: L.nav.projects,
    brain: L.nav.brain,
    chat: L.nav.chat,
    profile: L.nav.profile,
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: T.bg, fontFamily: FONT, color: T.text, display: "flex",
      backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
      backgroundSize: "24px 24px",
    }}>
      <GlobalStyle />
      <Rail
        view={view}
        setView={(v) => { setView(v); setOpenProject(null); }}
        onLogout={logout}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh" }}>
        <TopBar
          title={openProject ? openProject.name : titles[view]}
          user={user}
          uploads={uploads}
          onClearFinished={clearFinished}
        />
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 240, pointerEvents: "none",
            background: "radial-gradient(600px 220px at 30% 0%, rgba(217,255,99,0.055), transparent 70%)",
          }} />
          <div style={{ position: "relative", padding: "24px 28px 48px" }}>
            {openProject ? (
              <ProjectDetail
                project={openProject}
                onBack={() => setOpenProject(null)}
                uploads={uploads}
                addUploads={addUploads}
                retryUpload={retryUpload}
              />
            ) : (
              <>
                {view === "projects" && <ProjectsView onOpen={setOpenProject} />}
                {view === "brain" && (
                  <BrainView
                    uploads={uploads}
                    addUploads={addUploads}
                    retryUpload={retryUpload}
                  />
                )}
                {view === "chat" && (
                  <ChatView
                    userId={user.email}
                    messages={chatMessages}
                    setMessages={setChatMessages}
                  />
                )}
                {view === "profile" && <ProfileView user={user} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RAIL + TOPBAR
   ═══════════════════════════════════════════════════════════ */
function Rail({ view, setView, onLogout }) {
  const nav = [
    { id: "projects", icon: LayoutGrid, label: L.nav.projects },
    { id: "brain", icon: Brain, label: L.nav.brain },
    { id: "chat", icon: MessageSquare, label: L.nav.chat },
    { id: "profile", icon: Zap, label: L.nav.profile },
  ];
  return (
    <aside style={{
      width: 68, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "16px 0", gap: 6, height: "100vh", position: "sticky", top: 0,
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
            width: 42, height: 42, borderRadius: 12, display: "flex",
            alignItems: "center", justifyContent: "center",
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

function TopBar({ title, user, uploads = [], onClearFinished }) {
  const [open, setOpen] = useState(false);
  const active = uploads.filter((u) =>
    ["uploading", "processing", "transcribing", "analyzing"].includes(u.stage)
  );
  const failed = uploads.filter((u) => u.stage === "error");
  const showPill = uploads.length > 0;

  return (
    <div style={{
      height: 64, flexShrink: 0, borderBottom: `1px solid ${T.border}`,
      display: "flex", alignItems: "center", padding: "0 28px", gap: 12,
      backgroundColor: T.bg, position: "relative",
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ flex: 1 }} />

      {showPill && (
        <div style={{ position: "relative" }}>
          <button className="btn" onClick={() => setOpen((o) => !o)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 14px",
            borderRadius: 999, backgroundColor: active.length ? "rgba(98,214,255,.1)"
              : failed.length ? "rgba(233,104,104,.1)" : "rgba(143,232,106,.1)",
            border: `1px solid ${active.length ? "rgba(98,214,255,.3)"
              : failed.length ? "rgba(233,104,104,.3)" : "rgba(143,232,106,.3)"}`,
            color: active.length ? T.info : failed.length ? T.danger : T.success,
            fontSize: 12, fontWeight: 800,
          }}>
            {active.length > 0 ? (
              <><RefreshCw size={12} className="spin" /> {active.length} ta fayl</>
            ) : failed.length > 0 ? (
              <><AlertCircle size={12} /> {failed.length} ta xatolik</>
            ) : (
              <><Check size={12} /> Barchasi tayyor</>
            )}
          </button>

          {open && (
            <>
              <div onClick={() => setOpen(false)} style={{
                position: "fixed", inset: 0, zIndex: 40,
              }} />
              <div className="fade-up" style={{
                position: "absolute", top: 44, right: 0, width: 340, zIndex: 50,
                backgroundColor: T.canvas, border: `1px solid ${T.border}`,
                borderRadius: 16, padding: 12, maxHeight: 420, overflowY: "auto",
                boxShadow: "0 20px 60px rgba(0,0,0,.55)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "4px 6px 10px",
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: T.text2,
                    textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>Yuklashlar</span>
                  {uploads.some((u) => u.stage === "done") && (
                    <button className="btn" onClick={onClearFinished} style={{
                      backgroundColor: "transparent", color: T.muted,
                      fontSize: 11, fontWeight: 700, padding: 0,
                    }}>Tugaganlarni yashirish</button>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {uploads.map((u) => (
                    <div key={u.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", backgroundColor: T.s1,
                      border: `1px solid ${T.border}`, borderRadius: 10,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                          overflow: "hidden", textOverflow: "ellipsis",
                        }}>{u.name}</div>
                        <div style={{ fontSize: 10.5, color: T.muted, fontWeight: 600, marginTop: 2 }}>
                          {L.stage[u.stage] || u.stage}
                          {u.stage === "uploading" ? ` ${u.progress}%` : ""}
                        </div>
                      </div>
                      {["uploading", "processing", "transcribing", "analyzing"].includes(u.stage) && (
                        <RefreshCw size={12} color={T.info} className="spin" />
                      )}
                      {u.stage === "done" && <Check size={12} color={T.success} />}
                      {u.stage === "error" && <AlertCircle size={12} color={T.danger} />}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="hv" style={{
        width: 36, height: 36, borderRadius: 999, border: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Search size={15} color={T.text2} />
      </div>
      <div style={{ width: 1, height: 24, backgroundColor: T.border, margin: "0 4px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 999, backgroundColor: T.secondaryDark,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800,
        }}>{initialsOf(user.name)}</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Prodyuser</div>
        </div>
        <ChevronDown size={14} color={T.muted} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROJECTS LIST
   ═══════════════════════════════════════════════════════════ */
function ProjectsView({ onOpen }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("project_overview")
      .select("*")
      .order("created_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (creating) {
    return <NewProject onCancel={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />;
  }

  const filtered = projects.filter((p) =>
    (p.name + " " + (p.field || "")).toLowerCase().includes(query.toLowerCase())
  );

  const totals = {
    all: projects.length,
    ready: projects.filter((p) => p.status === "questions_ready").length,
    done: projects.filter((p) => p.status === "interview_done").length,
  };

  return (
    <div className="fade-up" style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Loyihalar</div>
          <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, marginTop: 2 }}>
            Har bir mijoz uchun alohida loyiha
          </div>
        </div>
        <button className="btn" onClick={() => setCreating(true)} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "11px 20px",
          borderRadius: 12, background: T.primary, color: "#090909",
          fontSize: 14, fontWeight: 800, boxShadow: `0 0 24px ${T.primaryGlow}`,
        }}>
          <Plus size={16} /> Yangi loyiha
        </button>
      </div>

      {/* summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MiniStat label="Jami loyiha" value={totals.all} color={T.text} />
        <MiniStat label="Savollar tayyor" value={totals.ready} color={T.warning} />
        <MiniStat label="Tahlil qilingan" value={totals.done} color={T.success} />
      </div>

      {projects.length > 3 && (
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={15} color={T.muted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Loyiha qidirish…" style={{
              width: "100%", background: T.canvas, border: `1px solid ${T.border}`,
              borderRadius: 12, color: T.text, fontSize: 14, padding: "10px 14px 10px 40px",
            }} />
        </div>
      )}

      {loading && <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Yuklanmoqda…</div>}

      {!loading && projects.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <FolderPlus size={28} color={T.muted} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Hali loyiha yo&apos;q</div>
          <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>
            Birinchi mijoz uchun loyiha yarating
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map((p) => <ProjectCard key={p.project_id} p={p} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function ProjectCard({ p, onOpen }) {
  const steps = [
    { done: true, label: "Brief" },
    { done: p.question_sets > 0, label: "Savollar" },
    { done: p.interviews_analyzed > 0, label: "Tahlil" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="hv card fade-up" onClick={() => onOpen(p)} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: T.s2, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: T.secondaryLight,
        }}>{(p.name || "?").slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {p.name}
          </div>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginTop: 2 }}>
            {p.field || "—"}
          </div>
        </div>
        <StatusChip status={p.status} />
      </div>

      {/* progress steps */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{
              height: 4, borderRadius: 999,
              background: s.done ? T.primary : T.panel,
              transition: "background 220ms ease-out",
            }} />
            <div style={{
              fontSize: 10, fontWeight: 700, marginTop: 5,
              color: s.done ? T.text2 : T.muted,
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, paddingTop: 4, borderTop: `1px solid ${T.border}` }}>
        <CardStat icon={FileText} value={p.files_uploaded || 0} label="fayl" />
        <CardStat icon={Sparkles} value={p.question_sets || 0} label="savol to&apos;plami" />
        <CardStat icon={Mic} value={p.interviews_analyzed || 0} label="intervyu" />
      </div>
    </div>
  );
}

function CardStat({ icon: Icon, value, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 10 }}>
      <Icon size={13} color={T.muted} />
      <span style={{ fontSize: 13, fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    new: { label: "Yangi", color: T.info },
    questions_ready: { label: "Savollar tayyor", color: T.warning },
    interview_done: { label: "Intervyu tahlil qilindi", color: T.success },
  };
  const s = map[status] || map.new;
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, color: s.color,
      background: `${s.color}1a`, borderRadius: 999,
      padding: "4px 12px", whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

/* ═══════════════════════════════════════════════════════════
   NEW PROJECT FORM
   ═══════════════════════════════════════════════════════════ */
function NewProject({ onCancel, onCreated }) {
  const [form, setForm] = useState({ name: "", field: "", brief: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const inputStyle = {
    width: "100%", background: T.s2, border: `1px solid ${T.border}`, borderRadius: 12,
    color: T.text, fontSize: 15, lineHeight: "24px", padding: "11px 14px",
    transition: "border-color 120ms ease-out, box-shadow 180ms ease-out",
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 800, color: T.text2, marginBottom: 6,
    display: "block", textTransform: "uppercase", letterSpacing: "0.07em",
  };

  const save = async () => {
    if (!form.name.trim()) return setError("Mijoz nomini kiriting");
    if (form.brief.trim().length < 40) return setError("Brief juda qisqa — kamida bir necha jumla yozing");
    setError("");
    setSaving(true);

    const project_id = slugify(form.name) + "_" + Date.now().toString().slice(-4);

    const { error: dbError } = await supabase.from("projects").insert({
      project_id,
      name: form.name.trim(),
      field: form.field.trim(),
      brief: form.brief.trim(),
      status: "new",
    });

    if (dbError) {
      setSaving(false);
      return setError(dbError.message);
    }

    // Send the brief into the vector store under this project's id
    try {
      const blob = new Blob([`MIJOZ: ${form.name}\nSOHA: ${form.field}\n\n${form.brief}`], { type: "text/plain" });
      const file = new File([blob], "client_brief.txt", { type: "text/plain" });
      await uploadFile(file, project_id, "brief");
    } catch (e) { /* project still created; brief can be re-uploaded */ }

    setSaving(false);
    onCreated();
  };

  return (
    <div className="fade-up" style={{ maxWidth: 640 }}>
      <button className="btn" onClick={onCancel} style={{
        display: "flex", alignItems: "center", gap: 6, background: "transparent",
        color: T.text2, fontSize: 13, fontWeight: 700, marginBottom: 16, padding: 0,
      }}>
        <ArrowLeft size={15} /> Orqaga
      </button>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>Yangi loyiha</div>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginBottom: 22 }}>
          Mijoz haqida qisqa ma'lumot — AI shu asosda savollar tayyorlaydi
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Mijoz / kompaniya nomi</label>
          <input style={inputStyle} value={form.name} onChange={set("name")}
            placeholder="Masalan: Speak Up English" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Soha</label>
          <input style={inputStyle} value={form.field} onChange={set("field")}
            placeholder="Masalan: Onlayn ta'lim" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Qisqa ma'lumot (brief)</label>
          <textarea style={{ ...inputStyle, minHeight: 160, resize: "vertical" }}
            value={form.brief} onChange={set("brief")}
            placeholder={"• Nima sotadi (mahsulot/xizmat)\n• Narxi qancha\n• Auditoriyasi kim\n• Missiyasi nima\n• Hozirgi holati / muammosi"} />
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginTop: 6 }}>
            Qanchalik aniq yozsangiz, savollar shunchalik kuchli chiqadi
          </div>
        </div>

        {error && (
          <div className="fade-up" style={{ fontSize: 13, fontWeight: 700, color: T.danger, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button className="btn" onClick={save} disabled={saving} style={{
          padding: "12px 26px", borderRadius: 12, background: T.primary,
          color: "#090909", fontSize: 14, fontWeight: 800,
          boxShadow: `0 0 24px ${T.primaryGlow}`,
        }}>
          {saving ? "Saqlanmoqda…" : "Loyihani yaratish"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROJECT DETAIL — questions + interview upload + results
   ═══════════════════════════════════════════════════════════ */
function ProjectDetail({ project, onBack, uploads, addUploads, retryUpload }) {
  const [tab, setTab] = useState("questions");

  const tabs = [
    { id: "questions", label: "Savollar" },
    { id: "interview", label: "Intervyu" },
    { id: "results", label: "Natijalar" },
  ];

  return (
    <div className="fade-up" style={{ maxWidth: 900 }}>
      <button className="btn" onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 6, background: "transparent",
        color: T.text2, fontSize: 13, fontWeight: 700, marginBottom: 14, padding: 0,
      }}>
        <ArrowLeft size={15} /> Loyihalar
      </button>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{project.name}</div>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginTop: 2 }}>
          {project.field || "—"} · {project.project_id}
        </div>
      </div>

      <div style={{
        display: "inline-flex", gap: 4, background: T.canvas,
        border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, marginBottom: 20,
      }}>
        {tabs.map((t) => (
          <button key={t.id} className="btn" onClick={() => setTab(t.id)} style={{
            padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: tab === t.id ? T.panel : "transparent",
            color: tab === t.id ? T.primary : T.text2,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "questions" && <QuestionsTab project={project} />}
      {tab === "interview" && (
        <InterviewTab
          project={project}
          uploads={uploads}
          addUploads={addUploads}
          retryUpload={retryUpload}
        />
      )}
      {tab === "results" && <ResultsTab project={project} />}
    </div>
  );
}

/* ─── Questions tab ─────────────────────────────────────── */
function QuestionsTab({ project }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [profileType, setProfileType] = useState("expert");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("interview_questions")
        .select("raw_text")
        .eq("project_id", project.project_id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data[0]) setText(data[0].raw_text || "");
    })();
  }, [project.project_id]);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.project_id,
          brief: project.brief,
          profile_type: profileType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setText(data.questions || data.output || "");
      await supabase.from("projects")
        .update({ status: "questions_ready" })
        .eq("project_id", project.project_id);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const saveEdits = async () => {
    await supabase.from("interview_questions").insert({
      project_id: project.project_id,
      raw_text: text,
      edited: true,
    });
  };

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>
              Intervyu savollarini generatsiya qilish
            </div>
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
              AI bilim bazangiz va mijoz briefi asosida savollar tayyorlaydi
            </div>
          </div>

          <select value={profileType} onChange={(e) => setProfileType(e.target.value)} style={{
            background: T.s2, border: `1px solid ${T.border}`, borderRadius: 10,
            color: T.text, fontSize: 13, fontWeight: 700, padding: "9px 12px", cursor: "pointer",
          }}>
            <option value="expert">Ekspert ovozi</option>
            <option value="customer">Mijoz ovozi (CustDev)</option>
          </select>

          <button className="btn" onClick={generate} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 20px",
            borderRadius: 12, background: T.primary, color: "#090909",
            fontSize: 13, fontWeight: 800, boxShadow: `0 0 24px ${T.primaryGlow}`,
          }}>
            {loading
              ? <><RefreshCw size={15} className="spin" /> Generatsiya…</>
              : <><Sparkles size={15} /> Generatsiya qilish</>}
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: 14, fontSize: 13, fontWeight: 700, color: T.danger,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {text && (
        <div className="card fade-up" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Savollar (tahrirlash mumkin)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={copy} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                borderRadius: 10, background: "transparent", border: `1px solid ${T.border}`,
                color: copied ? T.success : T.text2, fontSize: 12, fontWeight: 700,
              }}>
                {copied ? <><Check size={13} /> Nusxalandi</> : <><Copy size={13} /> Nusxalash</>}
              </button>
              <button className="btn" onClick={saveEdits} style={{
                padding: "8px 14px", borderRadius: 10, background: T.panel,
                color: T.text, fontSize: 12, fontWeight: 700,
              }}>Saqlash</button>
            </div>
          </div>

          <textarea value={text} onChange={(e) => setText(e.target.value)} style={{
            width: "100%", minHeight: 460, background: T.s1,
            border: `1px solid ${T.border}`, borderRadius: 12, color: T.text,
            fontSize: 14, lineHeight: "23px", padding: 16, resize: "vertical",
          }} />
        </div>
      )}
    </div>
  );
}

/* ─── Interview tab ─────────────────────────────────────── */
function InterviewTab({ project, uploads = [], addUploads, retryUpload }) {
  const [drag, setDrag] = useState(false);
  const [profileType, setProfileType] = useState("expert");
  const inputRef = useRef(null);

  const myUploads = uploads.filter((u) => u.clientId === project.project_id);

  const add = (list) => addUploads(list, project.project_id, `interview_${profileType}`);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: T.text2, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Intervyu turi
        </span>
        <div style={{ display: "inline-flex", gap: 4, backgroundColor: T.canvas, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4 }}>
          {[{ id: "expert", label: "Ekspert" }, { id: "customer", label: "Mijoz" }].map((t) => (
            <button key={t.id} className="btn" onClick={() => setProfileType(t.id)} style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              backgroundColor: profileType === t.id ? T.panel : "transparent",
              color: profileType === t.id ? T.primary : T.text2,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${drag ? T.primary : T.border}`,
          backgroundColor: drag ? T.primaryGlow : T.canvas,
          borderRadius: 16, padding: "44px 24px", textAlign: "center", cursor: "pointer",
          transition: "border-color 180ms ease-out, background-color 180ms ease-out", marginBottom: 12,
        }}
      >
        <input ref={inputRef} type="file" multiple accept=".mp3,.m4a,.ogg,.wav,.mp4,.pdf,.txt"
          style={{ display: "none" }}
          onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 14 }}>
          <Mic size={20} color={T.muted} />
          <Video size={20} color={T.muted} />
          <FileText size={20} color={T.muted} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Intervyu audiosini yuklang</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>MP3, M4A, OGG, WAV, MP4</div>
      </div>

      <div style={{
        backgroundColor: T.s1, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: "10px 14px", marginBottom: 24, fontSize: 12, color: T.text2,
        fontWeight: 600, lineHeight: "18px",
      }}>
        💡 Uzun audio uchun: faylni <strong style={{ color: T.text }}>mono, 64kbps mp3</strong> qilib
        eksport qiling — hajmi bir necha barobar kichrayadi, yuklash tezlashadi.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {myUploads.map((f) => (
          <UploadRow key={f.id} f={f} onRetry={() => retryUpload(f.id)} />
        ))}
      </div>
    </div>
  );
}

function UploadRow({ f, onRetry }) {
  const Icon = f.kind === "video" ? Video : f.kind === "audio" ? Mic : FileText;
  const busy = ["uploading", "processing", "transcribing", "analyzing"].includes(f.stage);
  const colorFor = {
    uploading: T.info, processing: T.info, transcribing: T.secondaryLight,
    analyzing: T.warning, done: T.success, error: T.danger,
  }[f.stage] || T.info;

  return (
    <div className="fade-up" style={{
      padding: "12px 16px", background: T.canvas,
      border: `1px solid ${f.stage === "error" ? "rgba(233,104,104,.35)" : T.border}`,
      borderRadius: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 11, background: T.s2,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={16} color={T.secondaryLight} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {f.name}
          </div>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginTop: 2 }}>
            {f.size ? `${fmtMB(f.size)} MB` : ""}{f.errMsg ? ` · ${f.errMsg}` : ""}
          </div>
        </div>

        <span style={{
          fontSize: 11, fontWeight: 800, color: colorFor,
          background: `${colorFor}1a`, borderRadius: 999, padding: "4px 12px",
          display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
        }}>
          {busy && <RefreshCw size={11} className="spin" />}
          {f.stage === "done" && <Check size={11} />}
          {f.stage === "error" && <AlertCircle size={11} />}
          {L.stage[f.stage]}{f.stage === "uploading" ? ` ${f.progress}%` : ""}
        </span>

        {f.stage === "error" && (
          <button className="btn" onClick={onRetry} title="Qayta urinish" style={{
            width: 34, height: 34, borderRadius: 11, background: "transparent",
            border: `1px solid ${T.border}`, display: "flex", alignItems: "center",
            justifyContent: "center", marginLeft: 8, flexShrink: 0,
          }}>
            <RefreshCw size={14} color={T.text2} />
          </button>
        )}
      </div>

      {f.stage === "uploading" && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 4, borderRadius: 999, backgroundColor: T.panel, overflow: "hidden" }}>
            <div style={{
              width: `${f.progress}%`, height: "100%", borderRadius: 999,
              backgroundColor: T.primary, transition: "width 220ms ease-out",
            }} />
          </div>
          {f.total ? (
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginTop: 6 }}>
              {fmtMB(f.loaded || 0)} / {fmtMB(f.total)} MB
            </div>
          ) : null}
        </div>
      )}

      {["processing", "transcribing", "analyzing"].includes(f.stage) && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 4, borderRadius: 999, backgroundColor: T.panel, overflow: "hidden", position: "relative" }}>
            <div className="indeterminate" style={{
              position: "absolute", top: 0, left: 0, height: "100%", width: "35%",
              borderRadius: 999, backgroundColor: colorFor,
            }} />
          </div>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginTop: 6 }}>
            Fayl yuklandi — server hali ishlayapti. Bu bir necha daqiqa olishi mumkin.
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Results tab ───────────────────────────────────────── */

/* Human labels + display order for the extracted profile fields */
const FIELD_GROUPS = [
  {
    title: "Asosiy ma'lumot",
    icon: User,
    fields: [
      ["ism", "Ism"],
      ["soha", "Soha"],
      ["soha_kasb", "Soha / kasb"],
      ["hozirgi_daraja", "Hozirgi daraja"],
      ["tajriba_yillari", "Tajriba"],
      ["auditoriya", "Auditoriya"],
      ["hozirgi_holat", "Hozirgi holat"],
    ],
  },
  {
    title: "Biznes raqamlari",
    icon: Target,
    nested: "biznes_raqamlari",
    fields: [
      ["hozirgi_sotuv", "Hozirgi sotuv"],
      ["mijozlar_soni", "Mijozlar soni"],
      ["orta_chek", "O'rtacha chek"],
      ["obunachilar", "Obunachilar"],
      ["konversiya", "Konversiya"],
      ["jamoa_hajmi", "Jamoa hajmi"],
      ["boshqa_raqamlar", "Boshqa raqamlar"],
    ],
  },
  {
    title: "Maqsad va missiya",
    icon: Sparkles,
    nested: "maqsad_va_missiya",
    fields: [
      ["asosiy_maqsad", "Asosiy maqsad"],
      ["sotuv_maqsadi", "Sotuv maqsadi"],
      ["muddat", "Muddat"],
      ["missiya", "Missiya"],
      ["nima_kerak", "Nima kerak"],
    ],
  },
  {
    title: "Pozitsioner va ekspertlik",
    icon: Sparkles,
    fields: [
      ["avtorlik_metodika", "Avtorlik metodikasi"],
      ["farq_boshqalardan", "Boshqalardan farqi"],
      ["eng_katta_yutuq", "Eng katta yutuq"],
      ["raqobat", "Raqobatchilar"],
    ],
  },
  {
    title: "Og'riqlar va e'tirozlar",
    icon: AlertCircle,
    fields: [
      ["ogriq_nuqtalari", "Og'riq nuqtalari"],
      ["mijoz_muammolari", "Mijoz muammolari"],
      ["etirozlar", "E'tirozlar"],
      ["qorquvlar", "Qo'rquvlar"],
      ["hozirgi_yechim", "Hozirgi yechim"],
    ],
  },
  {
    title: "Offer va qiymat",
    icon: Target,
    fields: [
      ["mahsulot_va_narx", "Mahsulot va narx"],
      ["natija_kafolati", "Natija kafolati"],
      ["keyslar", "Keyslar"],
      ["byudjet_tayyorlik", "Byudjet tayyorligi"],
      ["qaror_jarayoni", "Qaror jarayoni"],
      ["kutilayotgan_natija", "Kutilayotgan natija"],
    ],
  },
  {
    title: "Kontent uchun material",
    icon: Mic,
    fields: [
      ["kuchli_iboralar", "Kuchli iboralar"],
      ["hikoyalar", "Professional hikoyalar"],
      ["kontent_gulari", "Kontent g'oyalari"],
      ["kelgusi_reja", "Kelgusi rejalar"],
    ],
  },
  {
    title: "Muhim faktlar",
    icon: FileText,
    fields: [
      ["muhim_faktlar", "Boshqa muhim faktlar"],
    ],
  },
  {
    title: "Yetishmayotgan ma'lumot",
    icon: AlertCircle,
    fields: [
      ["yetishmayotgan_malumot", "Keyingi intervyuda so'rash kerak"],
    ],
  },
];

/* profile may arrive as an object OR as a JSON string — normalise it */
function normaliseProfile(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return typeof p === "object" ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

function ResultsTab({ project }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = async () => {
    const { data } = await supabase
      .from("interview_profiles")
      .select("*")
      .eq("project_id", project.project_id)
      .order("created_at", { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [project.project_id]);

  if (loading) return <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Yuklanmoqda…</div>;

  if (profiles.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <FileText size={26} color={T.muted} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Natijalar hali yo&apos;q</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>
          Intervyu audiosini yuklang — tahlil tugagach natijalar shu yerda paydo bo&apos;ladi
        </div>
      </div>
    );
  }

  const open = profiles.find((p) => p.id === openId);
  if (open) {
    return <InterviewDetail p={open} project={project} onBack={() => setOpenId(null)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn" onClick={load} style={{
          display: "flex", alignItems: "center", gap: 6, backgroundColor: "transparent",
          border: `1px solid ${T.border}`, borderRadius: 10, padding: "6px 12px",
          color: T.text2, fontSize: 12, fontWeight: 700,
        }}>
          <RefreshCw size={12} /> Yangilash
        </button>
      </div>

      {profiles.map((p) => {
        const prof = normaliseProfile(p.profile);
        return (
          <div key={p.id} className="hv card fade-up" onClick={() => setOpenId(p.id)}
            style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontWeight: 800, color: T.secondaryLight,
                backgroundColor: "rgba(140,115,246,.12)", borderRadius: 999, padding: "5px 13px",
              }}>
                {p.profile_type === "customer" ? "Mijoz ovozi" : "Ekspert ovozi"}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{prof.ism || "Nomalum"}</span>
              {prof.soha && (
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>· {prof.soha}</span>
              )}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.primary,
                display: "flex", alignItems: "center", gap: 5 }}>
                Batafsil ko&apos;rish →
              </span>
            </div>

            {p.summary && (
              <div style={{
                fontSize: 13.5, lineHeight: "21px", color: T.text2,
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>{p.summary}</div>
            )}

            <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 12,
              borderTop: `1px solid ${T.border}`, flexWrap: "wrap" }}>
              {(prof.biznes_raqamlari || {}).hozirgi_sotuv && (
                <QuickStat label="Hozirgi sotuv" value={prof.biznes_raqamlari.hozirgi_sotuv} />
              )}
              {(prof.maqsad_va_missiya || {}).sotuv_maqsadi && (
                <QuickStat label="Maqsad" value={prof.maqsad_va_missiya.sotuv_maqsadi} />
              )}
              {Array.isArray(prof.ogriq_nuqtalari) && prof.ogriq_nuqtalari.length > 0 && (
                <QuickStat label="Og'riqlar" value={`${prof.ogriq_nuqtalari.length} ta`} />
              )}
              {Array.isArray(prof.kuchli_iboralar) && prof.kuchli_iboralar.length > 0 && (
                <QuickStat label="Iboralar" value={`${prof.kuchli_iboralar.length} ta`} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: T.muted,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text,
        maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </div>
    </div>
  );
}

/* ─── FULL DETAIL PAGE — everything from the interview ───── */
function InterviewDetail({ p, project, onBack }) {
  const profile = normaliseProfile(p.profile);
  const [tab, setTab] = useState("profile");
  const [transcript, setTranscript] = useState(null);
  const [loadingT, setLoadingT] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasValue = (v) =>
    Array.isArray(v) ? v.length > 0
    : (v && typeof v === "object") ? Object.values(v).some((x) => hasValue(x))
    : (v !== null && v !== undefined && String(v).trim() !== "");

  const getVal = (g, key) => (g.nested ? (profile[g.nested] || {})[key] : profile[key]);

  const loadTranscript = async () => {
    if (transcript !== null) return;
    setLoadingT(true);
    const { data } = await supabase
      .from("interview_transcripts")
      .select("transcript")
      .eq("project_id", p.project_id)
      .eq("file_id", p.file_id)
      .maybeSingle();
    setTranscript(data ? data.transcript : "");
    setLoadingT(false);
  };

  useEffect(() => { if (tab === "transcript") loadTranscript(); }, [tab]);

  const copyAll = () => {
    const lines = [`# ${profile.ism || "Intervyu"} — ${project.name}`, ""];
    if (p.summary) { lines.push("## XULOSA", p.summary, ""); }
    FIELD_GROUPS.forEach((g) => {
      const rows = g.fields.filter(([k]) => hasValue(getVal(g, k)));
      if (!rows.length) return;
      lines.push(`## ${g.title.toUpperCase()}`);
      rows.forEach(([k, label]) => {
        const v = getVal(g, k);
        if (Array.isArray(v)) {
          lines.push(`${label}:`);
          v.forEach((i) => lines.push(`  - ${i}`));
        } else lines.push(`${label}: ${v}`);
      });
      lines.push("");
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const tabs = [
    { id: "profile", label: "Tahlil" },
    { id: "transcript", label: "To'liq matn" },
    { id: "raw", label: "Xom JSON" },
  ];

  return (
    <div className="fade-up">
      <button className="btn" onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 6, backgroundColor: "transparent",
        color: T.text2, fontSize: 13, fontWeight: 700, marginBottom: 16, padding: 0,
      }}>
        <ArrowLeft size={15} /> Natijalarga qaytish
      </button>

      {/* header */}
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, backgroundColor: T.s2, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: T.secondaryLight,
          }}>{(profile.ism || "?").slice(0, 2).toUpperCase()}</div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>
              {profile.ism || "Nomalum"}
            </div>
            <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, marginTop: 3 }}>
              {[profile.soha, profile.hozirgi_daraja, profile.tajriba_yillari]
                .filter(Boolean).join(" · ") || "—"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontWeight: 800, color: T.secondaryLight,
                backgroundColor: "rgba(140,115,246,.12)", borderRadius: 999, padding: "4px 12px",
              }}>{p.profile_type === "customer" ? "Mijoz ovozi" : "Ekspert ovozi"}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: T.muted,
                backgroundColor: T.s1, borderRadius: 999, padding: "4px 12px",
              }}>{p.file_id}</span>
            </div>
          </div>

          <button className="btn" onClick={copyAll} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
            borderRadius: 12, backgroundColor: T.primary, color: "#090909",
            fontSize: 13, fontWeight: 800,
          }}>
            {copied ? <><Check size={14} /> Nusxalandi</> : <><Copy size={14} /> Hammasini nusxalash</>}
          </button>
        </div>

        {p.summary && (
          <div style={{
            marginTop: 18, backgroundColor: "rgba(217,255,99,.06)",
            border: "1px solid rgba(217,255,99,.2)", borderRadius: 12, padding: 16,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: T.primary, marginBottom: 6,
              textTransform: "uppercase", letterSpacing: "0.07em",
            }}>Prodyuser uchun xulosa</div>
            <div style={{ fontSize: 14.5, lineHeight: "23px" }}>{p.summary}</div>
          </div>
        )}
      </div>

      {/* tabs */}
      <div style={{
        display: "inline-flex", gap: 4, backgroundColor: T.canvas,
        border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, marginBottom: 18,
      }}>
        {tabs.map((t) => (
          <button key={t.id} className="btn" onClick={() => setTab(t.id)} style={{
            padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            backgroundColor: tab === t.id ? T.panel : "transparent",
            color: tab === t.id ? T.primary : T.text2,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FIELD_GROUPS.map((g) => {
            const rows = g.fields.filter(([k]) => hasValue(getVal(g, k)));
            if (rows.length === 0) return null;
            const Icon = g.icon;
            const isNumbers = g.nested === "biznes_raqamlari";
            const isGoals = g.nested === "maqsad_va_missiya";
            const accent = isNumbers ? T.info : isGoals ? T.primary : T.secondaryLight;
            return (
              <div key={g.title} className="card" style={{
                padding: 18,
                borderColor: (isNumbers || isGoals) ? `${accent}44` : T.border,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7, marginBottom: 14,
                  paddingBottom: 10, borderBottom: `1px solid ${T.border}`,
                }}>
                  <Icon size={14} color={accent} />
                  <span style={{
                    fontSize: 12, fontWeight: 800, color: accent,
                    textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>{g.title}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>
                    {rows.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {rows.map(([key, label]) => (
                    <FieldRow key={key} label={label} value={getVal(g, key)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "transcript" && (
        <div className="card" style={{ padding: 20 }}>
          {loadingT && <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Yuklanmoqda…</div>}
          {!loadingT && !transcript && (
            <div style={{ color: T.muted, fontSize: 13, fontWeight: 600, lineHeight: "20px" }}>
              To&apos;liq matn saqlanmagan.<br />
              Bu intervyu eski versiyada tahlil qilingan — qayta yuklasangiz matn saqlanadi.
            </div>
          )}
          {!loadingT && transcript && (
            <>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${T.border}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: T.text2,
                  textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Intervyu to&apos;liq matni
                </span>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>
                  {transcript.length.toLocaleString()} belgi
                </span>
              </div>
              <div style={{
                fontSize: 14, lineHeight: "24px", whiteSpace: "pre-wrap",
                maxHeight: "60vh", overflowY: "auto", color: T.text,
              }}>{transcript}</div>
            </>
          )}
        </div>
      )}

      {tab === "raw" && (
        <div className="card" style={{ padding: 20 }}>
          <pre style={{
            fontSize: 11.5, lineHeight: "18px", color: T.text2,
            whiteSpace: "pre-wrap", overflow: "auto", maxHeight: "60vh", margin: 0,
          }}>{JSON.stringify(profile, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value }) {
  const isList = Array.isArray(value);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 180px) 1fr", gap: 16, alignItems: "start" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, paddingTop: 2 }}>{label}</div>
      {isList ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {value.map((item, i) => (
            <div key={i} style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              fontSize: 13.5, lineHeight: "21px", color: T.text,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: 999, backgroundColor: T.primary,
                flexShrink: 0, marginTop: 8,
              }} />
              <span>{String(item)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13.5, lineHeight: "21px", color: T.text }}>{String(value)}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BRAIN — methodology upload (admin)
   ═══════════════════════════════════════════════════════════ */
function BrainView({ uploads = [], addUploads, retryUpload }) {
  const [drag, setDrag] = useState(false);
  const [docs, setDocs] = useState([]);
  const [chunks, setChunks] = useState(0);
  const inputRef = useRef(null);

  const myUploads = uploads.filter((u) => u.clientId === BRAIN_ID);
  const doneCount = myUploads.filter((u) => u.stage === "done").length;

  const loadStats = async () => {
    const { data } = await supabase
      .from("documents")
      .select("metadata")
      .filter("metadata->>client_id", "eq", BRAIN_ID);

    const rows = data || [];
    setChunks(rows.length);

    const byFile = {};
    rows.forEach((r) => {
      const m = r.metadata || {};
      const id = m.file_id || "—";
      if (!byFile[id]) byFile[id] = {
        file_id: id, file_name: m.file_name, doc_type: m.doc_type,
        date: m.uploaded_at, chunks: 0,
      };
      byFile[id].chunks += 1;
    });
    setDocs(Object.values(byFile).sort((a, b) => (b.date || "").localeCompare(a.date || "")));
  };

  useEffect(() => { loadStats(); }, []);
  // refresh the list whenever an upload finishes
  useEffect(() => { if (doneCount > 0) loadStats(); }, [doneCount]);

  return (
    <div className="fade-up" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Bilim bazasi</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, marginTop: 2 }}>
          Sizning metodikangiz — barcha loyihalar uchun umumiy
        </div>
      </div>

      <KnowledgeGauge docCount={docs.length} chunks={chunks} />

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addUploads(e.dataTransfer.files, BRAIN_ID, "knowledge"); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1px dashed ${drag ? T.primary : T.border}`,
          backgroundColor: drag ? T.primaryGlow : T.canvas,
          borderRadius: 16, padding: "40px 24px", textAlign: "center", cursor: "pointer",
          transition: "border-color 180ms ease-out, background-color 180ms ease-out",
          margin: "20px 0",
        }}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.md,.mp3,.m4a"
          style={{ display: "none" }}
          onChange={(e) => { addUploads(e.target.files, BRAIN_ID, "knowledge"); e.target.value = ""; }} />
        <Brain size={22} color={T.muted} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Metodika fayllarini yuklang</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>
          Savol shablonlari · Intervyu qoidalari · Yaxshi/yomon savollar · Checklist
        </div>
      </div>

      {myUploads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {myUploads.map((f) => (
            <UploadRow key={f.id} f={f} onRetry={() => retryUpload(f.id)} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.text2, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Bazadagi hujjatlar
        </div>
        <button className="btn" onClick={loadStats} style={{
          display: "flex", alignItems: "center", gap: 6, backgroundColor: "transparent",
          border: `1px solid ${T.border}`, borderRadius: 10, padding: "6px 12px",
          color: T.text2, fontSize: 12, fontWeight: 700,
        }}>
          <RefreshCw size={12} /> Yangilash
        </button>
      </div>

      {docs.length === 0 ? (
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, padding: "12px 4px" }}>
          Hali hujjat yo&apos;q — birinchi metodika faylini yuklang.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map((d) => (
            <div key={d.file_id} className="card" style={{
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, backgroundColor: T.s2, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <FileText size={15} color={T.secondaryLight} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {d.file_name || String(d.file_id).replace(/^brain_/, "")}
                </div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginTop: 2 }}>
                  {d.date ? new Date(d.date).toLocaleDateString("uz-UZ") : "—"} · {d.chunks} bo&apos;lak
                </div>
              </div>
              <Check size={14} color={T.success} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Knowledge level gauge — replaces the raw chunk counter */
function KnowledgeGauge({ docCount, chunks }) {
  const LEVELS = [
    { min: 0,  name: "Bo&apos;sh",        color: T.muted,          hint: "Metodika fayllarini yuklang" },
    { min: 1,  name: "Boshlang&apos;ich", color: T.danger,         hint: "Yana bir necha hujjat qo&apos;shing" },
    { min: 3,  name: "O&apos;rtacha",     color: T.warning,        hint: "Intervyu qoidalari va misollar qo&apos;shing" },
    { min: 6,  name: "Kuchli",            color: T.secondaryLight, hint: "Deyarli tayyor — checklist qo&apos;shing" },
    { min: 10, name: "Ekspert",           color: T.primary,        hint: "Bazangiz to&apos;liq — savollar maksimal sifatda" },
  ];

  let idx = 0;
  LEVELS.forEach((l, i) => { if (docCount >= l.min) idx = i; });
  const level = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const pct = Math.min(100, Math.round((docCount / 10) * 100));

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13, background: `${level.color}1a`, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Brain size={22} color={level.color} />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Bilim darajasi
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4, marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: level.color, letterSpacing: "-0.01em" }}
              dangerouslySetInnerHTML={{ __html: level.name }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text2 }}>{pct}%</span>
          </div>

          {/* segmented bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {LEVELS.slice(1).map((l, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 999,
                background: idx > i ? l.color : T.panel,
                transition: "background 300ms ease-out",
              }} />
            ))}
          </div>

          <div style={{ fontSize: 12, color: T.text2, fontWeight: 600, lineHeight: "18px" }}>
            <span dangerouslySetInnerHTML={{ __html: level.hint }} />
            {next && (
              <> · <span style={{ color: T.muted }}>
                {next.name.replace(/&apos;/g, "'")} darajasiga {next.min - docCount} ta hujjat qoldi
              </span></>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 22 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{docCount}</div>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>hujjat</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: T.text2 }}>{chunks}</div>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>bo&apos;lak</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHAT (brain-wide assistant)
   ═══════════════════════════════════════════════════════════ */
function ChatView({ userId, messages, setMessages }) {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  // seed the greeting only once, on first ever open
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 1, role: "agent",
        text: "Salom! Men bilim bazangiz asosida ishlayman. Metodika, savollar yoki loyihalar bo'yicha savol bering.",
      }]);
    }
  }, []);

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
        body: JSON.stringify({ message: text, client_id: BRAIN_ID, user_id: userId }),
      });
      const data = await res.json();
      setMessages((m) => [...m, {
        id: Date.now() + 1, role: "agent",
        text: data.output || data.text || "Javob bo'sh keldi.",
      }]);
    } catch {
      setMessages((m) => [...m, {
        id: Date.now() + 1, role: "agent", error: true,
        text: "Ulanishda xatolik.",
      }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="card fade-up" style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 170px)", minHeight: 420, maxWidth: 900, overflow: "hidden",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: T.success }} />
        <span style={{ fontSize: 13, fontWeight: 800 }}>AI Prodyuser</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>
          · {messages.filter((m) => m.role === "user").length} ta savol
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => setMessages([])} title="Suhbatni tozalash" style={{
          display: "flex", alignItems: "center", gap: 6, background: "transparent",
          border: `1px solid ${T.border}`, borderRadius: 10, padding: "5px 11px",
          color: T.text2, fontSize: 11, fontWeight: 700,
        }}>
          <RefreshCw size={11} /> Tozalash
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m) => (
          <div key={m.id} className="fade-up" style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%",
          }}>
            <div style={{
              padding: "10px 14px", fontSize: 14, lineHeight: "22px", borderRadius: 14,
              background: m.role === "user" ? T.panel : T.s1,
              border: `1px solid ${m.error ? "rgba(233,104,104,.4)" : m.role === "user" ? "transparent" : T.border}`,
              color: m.error ? T.danger : T.text, whiteSpace: "pre-wrap",
            }}>{m.text}</div>
          </div>
        ))}
        {thinking && (
          <div className="fade-up" style={{
            alignSelf: "flex-start", display: "flex", gap: 5, padding: "12px 16px",
            background: T.s1, border: `1px solid ${T.border}`, borderRadius: 16,
          }}>
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

      <div style={{ padding: "12px 14px 14px", borderTop: `1px solid ${T.border}` }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 6, background: T.s1,
          border: `1px solid ${T.border}`, borderRadius: 14, padding: 6,
        }}>
          <textarea rows={1} value={input} placeholder="Savolingizni yozing…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={{
              flex: 1, resize: "none", background: "transparent", border: "1px solid transparent",
              borderRadius: 11, color: T.text, fontSize: 14, lineHeight: "22px",
              padding: "8px 10px", maxHeight: 120, minWidth: 0,
            }} />
          <button className="btn" onClick={send} style={{
            width: 38, height: 38, borderRadius: 11,
            background: input.trim() ? T.primary : T.panel,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Send size={15} color={input.trim() ? "#090909" : T.muted} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════════════════ */
function AuthView() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  const submit = async () => {
    setError("");
    setInfo("");
    if (signup && name.trim().length < 2) return setError("Ismingizni kiriting");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Email noto'g'ri");
    if (password.length < 6) return setError("Parol kamida 6 ta belgi");

    setBusy(true);
    try {
      if (signup) {
        const { data, error: e } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (e) throw e;
        if (data.user && !data.session) {
          setInfo("Emailingizga tasdiqlash xati yuborildi. Havolani bosing va keyin kiring.");
          setMode("signin");
        }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (e) throw e;
      }
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.includes("Invalid login")) setError("Email yoki parol noto'g'ri");
      else if (msg.includes("already registered")) setError("Bu email allaqachon ro'yxatdan o'tgan");
      else if (msg.includes("Email not confirmed")) setError("Email hali tasdiqlanmagan — pochtangizni tekshiring");
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const wrap = { position: "relative", marginBottom: 12 };
  const inputStyle = {
    width: "100%", backgroundColor: T.s2, border: `1px solid ${T.border}`, borderRadius: 12,
    color: T.text, fontSize: 15, lineHeight: "24px", padding: "11px 14px 11px 42px",
  };
  const icon = { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      backgroundColor: T.bg,
      backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
      backgroundSize: "24px 24px", position: "relative",
    }}>
      <div className="fade-up" style={{
        width: "100%", maxWidth: 400, backgroundColor: T.canvas, borderRadius: 24,
        border: `1px solid ${T.border}`, padding: 32, position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,.55)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, backgroundColor: T.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#090909", fontWeight: 800, fontSize: 15, boxShadow: `0 0 28px ${T.primaryGlow}`,
          }}>KZ</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Kontent Zavod</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Prodyuser paneli
            </div>
          </div>
        </div>

        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: "36px", marginBottom: 24 }}>
          {signup ? "Hisob yaratish" : "Kirish"}
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
            autoComplete="email"
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
        </div>
        <div style={wrap}>
          <Lock size={16} color={T.muted} style={icon} />
          <input style={inputStyle} placeholder="Parol" type="password" value={password}
            autoComplete={signup ? "new-password" : "current-password"}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && !busy && submit()} />
        </div>

        {error && (
          <div className="fade-up" style={{
            fontSize: 13, fontWeight: 700, color: T.danger, marginBottom: 12,
            display: "flex", alignItems: "flex-start", gap: 6,
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
          </div>
        )}
        {info && (
          <div className="fade-up" style={{
            fontSize: 13, fontWeight: 700, color: T.success, marginBottom: 12, lineHeight: "19px",
          }}>{info}</div>
        )}

        <button className="btn" onClick={submit} disabled={busy} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, backgroundColor: T.primary,
          color: "#090909", fontSize: 15, fontWeight: 800,
          boxShadow: `0 0 24px ${T.primaryGlow}`, marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {busy && <RefreshCw size={15} className="spin" />}
          {signup ? "Hisob yaratish" : "Kirish"}
        </button>

        <div style={{ fontSize: 14, color: T.text2, textAlign: "center", fontWeight: 600 }}>
          {signup ? "Hisobingiz bormi? " : "Hisobingiz yo'qmi? "}
          <span className="link" onClick={() => { setMode(signup ? "signin" : "signup"); setError(""); setInfo(""); }}>
            {signup ? "Kirish" : "Hisob yaratish"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROFILE — Telegram linking
   ═══════════════════════════════════════════════════════════ */
function ProfileView({ user }) {
  const [row, setRow] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("app_users")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();
    setRow(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const makeCode = async () => {
    setGenerating(true);
    setErr("");
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c = "";
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    const full = "KZ-" + c;
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: e1 } = await supabase.from("app_users").upsert(
      { email: user.email, full_name: user.name },
      { onConflict: "email" }
    );
    if (e1) {
      setErr("Baza xatosi: " + e1.message + " — 05-fix-permissions.sql ni ishga tushiring");
      setGenerating(false);
      return;
    }

    const { error: e2 } = await supabase.from("telegram_link_codes").insert({
      code: full, email: user.email, expires_at: expires,
    });
    if (e2) {
      setErr("Kod saqlanmadi: " + e2.message);
      setGenerating(false);
      return;
    }

    setCode(full);
    setGenerating(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const unlink = async () => {
    await supabase.from("app_users")
      .update({ telegram_chat_id: null, telegram_username: null })
      .eq("email", user.email);
    setCode("");
    load();
  };

  const linked = row && row.telegram_chat_id;

  return (
    <div className="fade-up" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Profil</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, marginTop: 2 }}>
          {user.name} · {user.email}
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: linked ? "rgba(143,232,106,.12)" : T.s2,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <SendIcon size={19} color={linked ? T.success : T.muted} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Telegram bildirishnomalari</div>
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginTop: 2 }}>
              {loading
                ? "Tekshirilmoqda…"
                : linked
                  ? `Ulangan${row.telegram_username ? " · @" + row.telegram_username : ""}`
                  : "Hali ulanmagan"}
            </div>
          </div>
          {linked && (
            <span style={{
              fontSize: 11, fontWeight: 800, color: T.success,
              background: "rgba(143,232,106,.1)", borderRadius: 999, padding: "4px 12px",
              display: "flex", alignItems: "center", gap: 4,
            }}><Check size={11} /> Faol</span>
          )}
        </div>

        {!loading && !linked && (
          <>
            <div style={{
              backgroundColor: T.s1, border: `1px solid ${T.border}`, borderRadius: 12,
              padding: 16, fontSize: 13, lineHeight: "21px", color: T.text2,
              fontWeight: 600, marginBottom: 16,
            }}>
              <div style={{ color: T.text, fontWeight: 800, marginBottom: 8 }}>Qanday ulash:</div>
              1. Pastdagi tugmani bosib kod oling<br />
              2. Telegramda botni oching:{" "}
              <a href={`https://t.me/${TELEGRAM_BOT}`} target="_blank" rel="noreferrer"
                 style={{ color: T.primary, fontWeight: 800, textDecoration: "none" }}>
                @{TELEGRAM_BOT}
              </a><br />
              3. Botga <strong style={{ color: T.text }}>/start</strong> yuboring<br />
              4. Keyin kodni yuboring<br />
              <span style={{ color: T.muted }}>Kod 10 daqiqa amal qiladi</span>
            </div>

            <a href={`https://t.me/${TELEGRAM_BOT}`} target="_blank" rel="noreferrer"
               className="btn" style={{
                 display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                 padding: "11px 0", borderRadius: 12, backgroundColor: T.s2,
                 border: `1px solid ${T.border}`, color: T.text, fontSize: 13,
                 fontWeight: 700, textDecoration: "none", marginBottom: 16,
               }}>
              <SendIcon size={14} color={T.info} /> Botni Telegramda ochish
            </a>

            {err && (
              <div className="fade-up" style={{
                fontSize: 12, fontWeight: 700, color: T.danger, marginBottom: 14,
                lineHeight: "18px", display: "flex", gap: 6, alignItems: "flex-start",
              }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {err}
              </div>
            )}

            {code ? (
              <div className="fade-up">
                <div style={{
                  background: T.s2, border: `1px dashed ${T.primary}`, borderRadius: 12,
                  padding: "18px 20px", textAlign: "center", marginBottom: 12,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    Sizning kodingiz
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: T.primary, letterSpacing: "0.08em" }}>
                    {code}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={copy} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "11px 0", borderRadius: 12, background: T.panel,
                    color: copied ? T.success : T.text, fontSize: 13, fontWeight: 700,
                  }}>
                    {copied ? <><Check size={14} /> Nusxalandi</> : <><Copy size={14} /> Nusxalash</>}
                  </button>
                  <button className="btn" onClick={() => { setCode(""); load(); }} style={{
                    padding: "11px 18px", borderRadius: 12, background: "transparent",
                    border: `1px solid ${T.border}`, color: T.text2, fontSize: 13, fontWeight: 700,
                  }}>Tekshirish</button>
                </div>
              </div>
            ) : (
              <button className="btn" onClick={makeCode} disabled={generating} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 24px",
                borderRadius: 12, background: T.primary, color: "#090909",
                fontSize: 14, fontWeight: 800, boxShadow: `0 0 24px ${T.primaryGlow}`,
              }}>
                {generating ? <RefreshCw size={15} className="spin" /> : <SendIcon size={15} />}
                Telegram&apos;ni ulash
              </button>
            )}
          </>
        )}

        {linked && (
          <button className="btn" onClick={unlink} style={{
            padding: "10px 20px", borderRadius: 12, background: "transparent",
            border: `1px solid ${T.border}`, color: T.danger, fontSize: 13, fontWeight: 700,
          }}>Ulanishni uzish</button>
        )}
      </div>
    </div>
  );
}