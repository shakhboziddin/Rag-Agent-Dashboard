"use client";

// This page is fully client-side — never prerender it at build time.
export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import {
  LayoutGrid, FolderPlus, Brain, Upload, FileText,
  Mic, Video, Send, Paperclip, LogOut,
  RefreshCw, Check, Mail, Lock, User,
  Search, Bell, ChevronDown, AlertCircle, Copy,
  Sparkles, ArrowLeft, Plus, MessageSquare, Target,
  Zap,
  Trash2, Database, ShieldCheck,
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

/* Admin panel password.
   NOTE: this is checked in the browser, so anyone who opens DevTools can read it.
   It hides the page from casual use — it is NOT real security.
   Replace with a proper role check before giving access to a wider team. */
const ADMIN_PASSWORD = "1234";

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
    .fade-up { animation: fadeUp 180ms ${EASE}; }
    .spin { animation: spin 900ms linear infinite; }
    .indeterminate { animation: slide 1.4s ease-in-out infinite; }

    /* ── Interactive surfaces ───────────────────────────────
       Hover only lights the element itself, never blank space.
       A soft radial follows the cursor (Windows 11 / Fluent style). */
    .hv, .btn, .card-int {
      position: relative;
      isolation: isolate;
      transition: background-color 140ms ease-out, border-color 140ms ease-out,
                  color 140ms ease-out, transform 140ms ease-out;
    }
    .hv::before, .btn::before, .card-int::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      opacity: 0;
      transition: opacity 180ms ease-out;
      background: radial-gradient(
        200px circle at var(--mx, 50%) var(--my, 50%),
        rgba(255,255,255,0.07),
        rgba(255,255,255,0.02) 40%,
        transparent 65%
      );
      z-index: 0;
    }
    .hv:hover::before, .btn:hover::before, .card-int:hover::before { opacity: 1; }
    .btn:disabled::before { opacity: 0 !important; }

    .hv { cursor: pointer; }
    .hv:hover { background-color: rgba(255,255,255,0.035); }

    .btn {
      cursor: pointer;
      border: none;
      font-family: ${FONT};
    }
    .btn:active { transform: scale(0.985); }
    .btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    .card {
      background-color: ${T.canvas};
      border: 1px solid ${T.border};
      border-radius: 16px;
    }
    .card-int:hover { border-color: rgba(255,255,255,0.14); }

    .link { color: ${T.primary}; cursor: pointer; font-weight: 700; }
    .link:hover { color: ${T.primaryHover}; }

    /* ── Inputs: subtle, no heavy ring ───────────────────── */
    input, textarea, select {
      outline: none;
      font-family: ${FONT};
      transition: background-color 140ms ease-out, border-color 140ms ease-out;
    }
    input:hover, textarea:hover, select:hover {
      border-color: rgba(255,255,255,0.14);
    }
    input:focus, textarea:focus, select:focus {
      border-color: rgba(217,255,99,0.35) !important;
      background-color: rgba(255,255,255,0.03);
      box-shadow: none !important;
    }

    /* inline editable fields — invisible until touched */
    .soft-input:hover { background-color: rgba(255,255,255,0.025); }
    .soft-input:focus {
      background-color: rgba(255,255,255,0.04);
      border-color: rgba(217,255,99,0.28) !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .fade-up, .spin, .indeterminate { animation: none; }
      .hv::before, .btn::before, .card-int::before { display: none; }
    }
  `}</style>
);

/* Tracks the cursor so the hover glow follows it (Fluent-style).
   Attached once at the root; costs nothing when nothing is hovered. */
function usePointerGlow() {
  useEffect(() => {
    const onMove = (e) => {
      const el = e.target.closest?.(".hv, .btn, .card-int");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
}

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
  usePointerGlow();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState("projects");
  const [openProject, setOpenProject] = useState(null);
  // Chat messages live here so switching pages does not wipe them
  const [chatMessages, setChatMessages] = useState([]);
  // Uploads also live here — they keep running when you change page
  const [uploads, setUploads] = useState([]);
  const fileStore = useRef({});
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pwPrompt, setPwPrompt] = useState(false);
  const [railOpen, setRailOpen] = useState(true);

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

  /* After a page refresh the browser has no memory of uploads that were
     still processing. The backend does — upload_status keeps the stage.
     Pull anything still in flight and resume watching it. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("upload_status")
        .select("*")
        .in("stage", ["uploading", "processing", "transcribing", "analyzing"])
        .gte("updated_at", cutoff)
        .order("updated_at", { ascending: false });

      if (cancelled || !data || data.length === 0) return;

      // one entry per file — keep the most recent row
      const seen = new Set();
      const restored = [];
      data.forEach((r) => {
        if (!r.file_id || seen.has(r.file_id)) return;
        seen.add(r.file_id);
        restored.push({
          id: "restored_" + r.file_id,
          fileId: r.file_id,
          name: r.file_name || String(r.file_id).split("_").slice(1).join("_") || r.file_id,
          clientId: r.project_id,
          kind: /\.(mp3|m4a|ogg|wav|mp4)$/i.test(r.file_name || "") ? "audio" : "text",
          stage: r.stage,
          progress: r.progress ?? 100,
          restored: true,
        });
      });

      if (restored.length === 0) return;

      setUploads((prev) => {
        const have = new Set(prev.map((u) => u.fileId).filter(Boolean));
        return [...restored.filter((r) => !have.has(r.fileId)), ...prev];
      });

      // keep polling each restored file until it finishes
      restored.forEach((r) => {
        watchStatus(r.fileId, (s) =>
          setUploads((prev) => prev.map((u) =>
            u.id === r.id
              ? { ...u, stage: s.stage, errMsg: s.stage === "error" ? (s.message || "Xatolik") : null }
              : u
          ))
        );
      });
    })();

    return () => { cancelled = true; };
  }, [user]);

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
    admin: "Admin panel",
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
        adminUnlocked={adminUnlocked}
        open={railOpen}
        setOpen={setRailOpen}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh" }}>
        <TopBar
          title={openProject ? openProject.name : titles[view]}
          user={user}
          uploads={uploads}
          onClearFinished={clearFinished}
          adminUnlocked={adminUnlocked}
          onAdminRequest={() => setPwPrompt(true)}
          onLogout={logout}
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
                {view === "admin" && adminUnlocked && <AdminContent />}
              </>
            )}
          </div>
        </div>
      </div>
      {pwPrompt && (
        <AdminGate
          onClose={() => setPwPrompt(false)}
          onSuccess={() => {
            setAdminUnlocked(true);
            setPwPrompt(false);
            setView("admin");
            setOpenProject(null);
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RAIL + TOPBAR
   ═══════════════════════════════════════════════════════════ */
function Rail({ view, setView, onLogout, adminUnlocked, open, setOpen }) {
  const nav = [
    { id: "projects", icon: LayoutGrid, label: L.nav.projects },
    { id: "brain", icon: Brain, label: L.nav.brain },
    { id: "chat", icon: MessageSquare, label: L.nav.chat },
    { id: "profile", icon: Zap, label: L.nav.profile },
  ];
  if (adminUnlocked) {
    nav.push({ id: "admin", icon: ShieldCheck, label: "Admin panel", danger: true });
  }

  const W = open ? 216 : 68;

  return (
    <aside style={{
      width: W, flexShrink: 0, borderRight: `1px solid ${T.border}`,
      backgroundColor: T.bg, display: "flex", flexDirection: "column",
      padding: open ? "16px 12px" : "16px 0", gap: 4,
      height: "100vh", position: "sticky", top: 0,
      alignItems: open ? "stretch" : "center",
      transition: "width 200ms cubic-bezier(.22,.61,.36,1), padding 200ms ease-out",
      overflow: "hidden",
    }}>
      {/* logo row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
        paddingLeft: open ? 2 : 0, justifyContent: open ? "flex-start" : "center",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, backgroundColor: T.primary, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#090909", fontWeight: 800, fontSize: 13,
          boxShadow: `0 0 28px ${T.primaryGlow}`,
        }}>KZ</div>
        {open && (
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>Kontent Zavod</div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.muted, whiteSpace: "nowrap",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>Prodyuser</div>
          </div>
        )}
      </div>

      {nav.map(({ id, icon: Icon, label, danger }) => {
        const active = view === id;
        const color = active ? (danger ? T.danger : T.primary) : T.muted;
        return (
          <div key={id} onClick={() => setView(id)} title={open ? "" : label}
            style={{
              height: 42, display: "flex", alignItems: "center",
              justifyContent: open ? "flex-start" : "center",
              position: "relative", cursor: "pointer",
            }}>
            {/* the hover/active surface — square when collapsed, full row when open */}
            <div className="hv" style={{
              position: "absolute",
              left: open ? 0 : "50%",
              transform: open ? "none" : "translateX(-50%)",
              width: open ? "100%" : 42,
              height: 42, borderRadius: 12,
              backgroundColor: active ? T.s2 : "transparent",
              transition: "width 200ms cubic-bezier(.22,.61,.36,1), background-color 140ms ease-out",
              zIndex: 0,
            }} />
            {active && (
              <span style={{
                position: "absolute",
                left: open ? -12 : -13,
                top: 11, bottom: 11, width: 3, borderRadius: 999,
                backgroundColor: danger ? T.danger : T.primary, zIndex: 2,
              }} />
            )}
            <div style={{
              position: "relative", zIndex: 1, display: "flex", alignItems: "center",
              gap: 11, paddingLeft: open ? 12 : 0, pointerEvents: "none",
            }}>
              <Icon size={18} strokeWidth={2} color={color} style={{ flexShrink: 0 }} />
              {open && (
                <span style={{
                  fontSize: 13.5, fontWeight: active ? 800 : 600,
                  color: active ? T.text : T.text2, whiteSpace: "nowrap",
                }}>{label}</span>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* collapse toggle */}
      <RailRow open={open} icon={ChevronDown} label="Yig&apos;ish"
        onClick={() => setOpen(!open)}
        iconStyle={{
          transform: open ? "rotate(90deg)" : "rotate(-90deg)",
          transition: "transform 200ms ease-out",
        }} />

      <RailRow open={open} icon={LogOut} label="Chiqish" onClick={onLogout} />
    </aside>
  );
}

function RailRow({ open, icon: Icon, label, onClick, iconStyle }) {
  return (
    <div onClick={onClick} title={open ? "" : label} style={{
      height: 40, display: "flex", alignItems: "center",
      justifyContent: open ? "flex-start" : "center",
      position: "relative", cursor: "pointer",
    }}>
      <div className="hv" style={{
        position: "absolute",
        left: open ? 0 : "50%",
        transform: open ? "none" : "translateX(-50%)",
        width: open ? "100%" : 42, height: 40, borderRadius: 12,
        transition: "width 200ms cubic-bezier(.22,.61,.36,1)",
        zIndex: 0,
      }} />
      <div style={{
        position: "relative", zIndex: 1, display: "flex", alignItems: "center",
        gap: 11, paddingLeft: open ? 12 : 0, pointerEvents: "none",
      }}>
        <Icon size={17} color={T.muted} style={{ flexShrink: 0, ...iconStyle }} />
        {open && (
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text2, whiteSpace: "nowrap" }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function TopBar({ title, user, uploads = [], onClearFinished, adminUnlocked, onAdminRequest, onLogout }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  const active = uploads.filter((u) =>
    ["uploading", "processing", "transcribing", "analyzing"].includes(u.stage)
  );
  const failed = uploads.filter((u) => u.stage === "error");
  const showPill = uploads.length > 0;

  return (
    <div style={{
      height: 64, flexShrink: 0, borderBottom: `1px solid ${T.border}`,
      display: "flex", alignItems: "center", padding: "0 28px", gap: 12,
      backgroundColor: T.bg, position: "relative", zIndex: 30,
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ flex: 1 }} />

      {showPill && (
        <div style={{ position: "relative" }}>
          <button className="btn" onClick={() => setOpen((o) => !o)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 14px",
            borderRadius: 999,
            backgroundColor: active.length ? "rgba(98,214,255,.1)"
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
              <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
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

      <div style={{ width: 1, height: 24, backgroundColor: T.border, margin: "0 4px" }} />

      {/* profile dropdown */}
      <div style={{ position: "relative" }}>
        <div className="hv" onClick={() => setMenu((m) => !m)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "5px 8px 5px 5px",
          borderRadius: 999, cursor: "pointer",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 999, backgroundColor: T.secondaryDark,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, flexShrink: 0,
          }}>{initialsOf(user.name)}</div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>
              {adminUnlocked ? "Admin" : "Prodyuser"}
            </div>
          </div>
          <ChevronDown size={14} color={T.muted} style={{
            transform: menu ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease-out",
          }} />
        </div>

        {menu && (
          <>
            <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <div className="fade-up" style={{
              position: "absolute", top: 50, right: 0, width: 240, zIndex: 50,
              backgroundColor: T.canvas, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: 6,
              boxShadow: "0 20px 60px rgba(0,0,0,.55)",
            }}>
              <div style={{ padding: "10px 12px 12px", borderBottom: `1px solid ${T.border}`, marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{user.name}</div>
                <div style={{
                  fontSize: 11.5, color: T.muted, fontWeight: 600, marginTop: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{user.email}</div>
              </div>

              {!adminUnlocked ? (
                <div className="hv" onClick={() => { setMenu(false); onAdminRequest(); }} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, cursor: "pointer",
                }}>
                  <ShieldCheck size={15} color={T.text2} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Admin panel</span>
                  <div style={{ flex: 1 }} />
                  <Lock size={12} color={T.muted} />
                </div>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10,
                }}>
                  <ShieldCheck size={15} color={T.danger} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.danger }}>Admin ochilgan</span>
                  <div style={{ flex: 1 }} />
                  <Check size={13} color={T.success} />
                </div>
              )}

              <div className="hv" onClick={() => { setMenu(false); onLogout(); }} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, cursor: "pointer",
              }}>
                <LogOut size={15} color={T.text2} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Chiqish</span>
              </div>
            </div>
          </>
        )}
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

  const q = query.trim().toLowerCase();
  const filtered = q
    ? projects.filter((p) =>
        [p.name, p.field, p.brief, p.project_id, p.status]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      )
    : projects;

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

      {projects.length > 0 && (
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={15} color={T.muted} style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            pointerEvents: "none",
          }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Loyiha nomi, soha yoki brief bo'yicha qidirish…" style={{
              width: "100%", backgroundColor: T.canvas, border: `1px solid ${T.border}`,
              borderRadius: 12, color: T.text, fontSize: 14,
              padding: query ? "10px 40px 10px 40px" : "10px 14px 10px 40px",
            }} />
          {query && (
            <button className="btn" onClick={() => setQuery("")} title="Tozalash" style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              width: 26, height: 26, borderRadius: 8, backgroundColor: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.muted, fontSize: 16, lineHeight: 1,
            }}>×</button>
          )}
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

      {q && filtered.length === 0 && projects.length > 0 && (
        <div className="card" style={{ padding: 36, textAlign: "center" }}>
          <Search size={22} color={T.muted} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>Hech narsa topilmadi</div>
          <div style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>
            &quot;{query}&quot; bo&apos;yicha loyiha yo&apos;q
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {q && (
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, marginBottom: 10 }}>
              {filtered.length} ta natija
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {filtered.map((p) => <ProjectCard key={p.project_id} p={p} onOpen={onOpen} />)}
          </div>
        </>
      )}
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
    <div className="card card-int fade-up" onClick={() => onOpen(p)} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, cursor: "pointer" }}>
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
  const [resultsDetailOpen, setResultsDetailOpen] = useState(false);

  const tabs = [
    { id: "questions", label: "Savollar" },
    { id: "interview", label: "Intervyu" },
    { id: "results", label: "Natijalar" },
  ];

  // the results table wants full width; everything else reads better contained
  const wide = tab === "results" && !resultsDetailOpen;

  return (
    <div className="fade-up" style={{
      // the table uses the full viewport; ctrl+minus therefore gains real space
      maxWidth: wide ? "none" : 900, width: "100%",
      transition: "max-width 160ms ease-out",
    }}>
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
      {tab === "results" && (
        <ResultsTab project={project} onDetailOpenChange={setResultsDetailOpen} />
      )}
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
  const [profileType, setProfileType] = useState("customer");
  const inputRef = useRef(null);

  const myUploads = uploads.filter((u) => u.clientId === project.project_id);
  const [history, setHistory] = useState([]);
  const [loadingH, setLoadingH] = useState(true);

  /* Files already in the database for this project — survives refresh */
  const loadHistory = async () => {
    const { data } = await supabase
      .from("file_overview")
      .select("*")
      .eq("client_id", project.project_id);
    const rows = (data || []).sort((a, b) =>
      String(b.uploaded_at || "").localeCompare(String(a.uploaded_at || "")));
    setHistory(rows);
    setLoadingH(false);
  };

  useEffect(() => { loadHistory(); }, [project.project_id]);

  // refresh the history whenever an in-flight upload completes
  const doneCount = myUploads.filter((u) => u.stage === "done").length;
  useEffect(() => { if (doneCount > 0) loadHistory(); }, [doneCount]);

  const liveIds = new Set(myUploads.map((u) => u.fileId).filter(Boolean));
  const pastOnly = history.filter((h) => !liveIds.has(h.file_id));

  const add = (list) => addUploads(list, project.project_id, `interview_${profileType}`);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: T.text2, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Intervyu turi
        </span>
        <div style={{ display: "inline-flex", gap: 4, backgroundColor: T.canvas, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4 }}>
          {[{ id: "customer", label: "Mijoz" }, { id: "expert", label: "Ekspert" }].map((t) => (
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

      {myUploads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {myUploads.map((f) => (
            <UploadRow key={f.id} f={f} onRetry={() => retryUpload(f.id)} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: T.text2,
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}>Yuklangan fayllar</div>
        <button className="btn" onClick={loadHistory} style={{
          display: "flex", alignItems: "center", gap: 6, backgroundColor: "transparent",
          border: `1px solid ${T.border}`, borderRadius: 10, padding: "6px 12px",
          color: T.text2, fontSize: 12, fontWeight: 700,
        }}>
          <RefreshCw size={12} /> Yangilash
        </button>
      </div>

      {loadingH ? (
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>Yuklanmoqda…</div>
      ) : pastOnly.length === 0 ? (
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, padding: "4px 2px" }}>
          Bu loyihada hali fayl yo&apos;q
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pastOnly.map((h) => {
            const isAudio = /\.(mp3|m4a|ogg|wav|mp4)$/i.test(h.file_name || h.file_id || "");
            const HIcon = isAudio ? Mic : FileText;
            const typeLabel = String(h.doc_type || "").includes("customer")
              ? "Mijoz intervyusi"
              : String(h.doc_type || "").includes("interview")
                ? "Ekspert intervyusi"
                : (h.doc_type || "—");
            return (
              <div key={h.file_id} className="card" style={{
                padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, backgroundColor: T.s2, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <HIcon size={15} color={T.secondaryLight} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>{h.file_name || h.file_id}</div>
                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginTop: 2 }}>
                    {typeLabel} · {h.chunks} bo&apos;lak
                    {h.uploaded_at ? " · " + new Date(h.uploaded_at).toLocaleDateString("uz-UZ") : ""}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: T.success,
                  backgroundColor: "rgba(143,232,106,.1)", borderRadius: 999,
                  padding: "4px 12px", display: "flex", alignItems: "center", gap: 4,
                }}><Check size={11} /> Bazada</span>
              </div>
            );
          })}
        </div>
      )}
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

        {f.stage === "error" && !f.restored && (
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
            {f.restored
              ? "Sahifa yangilandi — server hali ishlayapti, kuzatilmoqda."
              : "Fayl yuklandi — server hali ishlayapti. Bu bir necha daqiqa olishi mumkin."}
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

/* CustDev-only field groups — used on the detail page for customer interviews */
const CUSTDEV_FIELD_GROUPS = [
  {
    title: "Respondent ma'lumotlari",
    icon: User,
    fields: [
      ["ism", "Ism"],
      ["manzil", "Manzil"],
      ["demografik_malumotlar", "Demografik ma'lumot"],
    ],
  },
  {
    title: "Og'riqlar, xohishlar va e'tirozlar",
    icon: AlertCircle,
    fields: [
      ["ogriq_nuqtalari", "Og'riqlar"],
      ["xohishlar", "Xohishlar"],
      ["qorquvlar", "Qo'rquvlar"],
      ["etirozlar", "E'tirozlar"],
    ],
  },
  {
    title: "Xarid qarori",
    icon: Target,
    fields: [
      ["hozirgi_yechim", "Hozirgi yechim"],
      ["byudjet_tayyorlik", "Byudjet tayyorligi"],
      ["qaror_jarayoni", "Qaror jarayoni"],
      ["kutilayotgan_natija", "Kutilayotgan natija"],
    ],
  },
  {
    title: "Insayt va kontent",
    icon: Sparkles,
    fields: [
      ["insayt", "Insayt"],
      ["kuchli_iboralar", "Kuchli iboralar"],
      ["muhim_faktlar", "Muhim faktlar"],
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

/* Columns for the Notion-style results table.
   `keys` are aliases — the first one present on the profile wins. */
const CUSTDEV_COLUMNS = [
  { label: "Manzil", keys: ["manzil", "hudud", "location"] },
  { label: "Demografik ma'lumot", keys: ["demografik_malumotlar", "demografik", "auditoriya"] },
  { label: "Og'riqlar", keys: ["ogriq_nuqtalari", "ogriqlar"] },
  { label: "Xohishlar", keys: ["xohishlar", "istaklar"] },
  { label: "Qo'rquvlar", keys: ["qorquvlar"] },
  { label: "E'tirozlar", keys: ["etirozlar"] },
  { label: "Insayt", keys: ["insayt", "insight", "muhim_faktlar"] },
];

function pickField(profile, keys) {
  for (const k of keys) {
    const v = profile[k];
    if (Array.isArray(v)) { if (v.length) return v; continue; }
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function cellText(v) {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

const thStyle = {
  textAlign: "left", padding: "12px 14px", fontSize: 11, fontWeight: 800,
  color: T.text2, textTransform: "uppercase", letterSpacing: "0.06em",
  whiteSpace: "nowrap", userSelect: "none",
};
const tdStyle = {
  padding: "13px 14px", fontSize: 13, fontWeight: 500, color: T.text,
  verticalAlign: "top", lineHeight: "19px",
};

/* One table cell.
   Collapsed: clamped to N lines with a soft fade instead of a hard cut.
   The "ko'proq" affordance only appears when text is genuinely clipped —
   measured after layout, and re-measured when the clamp or width changes. */
function TableCell({ value, clamp = 3 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [overflows, setOverflows] = useState(false);

  const isList = Array.isArray(value) && value.length > 0;
  const empty = value === null || value === undefined ||
    (Array.isArray(value) ? value.length === 0 : String(value).trim() === "");

  useEffect(() => {
    if (empty) { setOverflows(false); return; }

    const measure = () => {
      const el = ref.current;
      if (!el) return;
      // only meaningful while collapsed — expanded has no clamp to exceed
      if (open) return;
      setOverflows(el.scrollHeight - el.clientHeight > 4);
    };

    // wait for layout/fonts before measuring, or every cell looks clipped
    const raf = requestAnimationFrame(measure);

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measure) : null;
    if (ro && ref.current) ro.observe(ref.current);

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [value, clamp, open, empty]);

  if (empty) {
    return <span style={{ color: T.muted, fontSize: 12.5 }}>—</span>;
  }

  const showToggle = overflows || open;

  return (
    <div
      onClick={(e) => { if (showToggle) { e.stopPropagation(); setOpen((o) => !o); } }}
      style={{ position: "relative", cursor: showToggle ? "pointer" : "default" }}
    >
      <div ref={ref} style={{
        overflow: "hidden",
        display: open ? "block" : "-webkit-box",
        WebkitLineClamp: open ? "unset" : clamp,
        WebkitBoxOrient: "vertical",
        maxHeight: open ? 420 : undefined,
        overflowY: open ? "auto" : "hidden",
        overflowWrap: "anywhere",
      }}>
        {isList ? (
          <ul style={{ margin: 0, paddingLeft: 15 }}>
            {value.map((item, i) => (
              <li key={i} style={{ marginBottom: 3 }}>{String(item)}</li>
            ))}
          </ul>
        ) : String(value)}
      </div>

      {!open && overflows && (
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 20,
          background: `linear-gradient(to bottom, transparent, ${T.canvas})`,
          pointerEvents: "none",
        }} />
      )}

      {showToggle && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.28)",
          marginTop: 8, position: "relative", letterSpacing: "0.02em",
        }}>
          {open ? "kamroq" : "ko'proq"}
        </div>
      )}
    </div>
  );
}

/* Compact Notion button used inline in a table row */
function NotionExportCell({ p, onSynced }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const needsSync = p.notion_page_id
    ? (!p.notion_synced_at || new Date(p.updated_at || p.created_at) > new Date(p.notion_synced_at))
    : false;

  const run = async (e) => {
    e.stopPropagation();
    if (p.notion_page_id && !needsSync) {
      window.open(p.notion_url, "_blank");
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: p.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      onSynced && onSynced(p.id, data);
    } catch (err) {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const label = failed ? "Xato — qayta"
    : !p.notion_page_id ? "Eksport"
    : needsSync ? "Yangilash" : "Ochish";
  const color = failed ? T.danger
    : !p.notion_page_id ? T.primary
    : needsSync ? T.warning : T.success;

  return (
    <button className="btn" onClick={run} disabled={busy} style={{
      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
      borderRadius: 9, backgroundColor: `${color}1a`, border: `1px solid ${color}44`,
      color, fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap",
    }}>
      {busy ? <RefreshCw size={11} className="spin" /> : null}
      {busy ? "…" : label}
    </button>
  );
}

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

function ResultsTab({ project, onDetailOpenChange }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [density, setDensity] = useState(3);   // lines shown per cell

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

  const openDetail = (id) => { setOpenId(id); onDetailOpenChange && onDetailOpenChange(true); };
  const closeDetail = () => { setOpenId(null); onDetailOpenChange && onDetailOpenChange(false); };

  const patchProfile = (id, patch) =>
    setProfiles((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));

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
    return (
      <InterviewDetail
        p={open}
        project={project}
        onBack={closeDetail}
        onSaved={(patch) => patchProfile(open.id, patch)}
      />
    );
  }

  const pendingCount = profiles.filter((p) =>
    !p.notion_page_id ||
    !p.notion_synced_at ||
    new Date(p.updated_at || p.created_at) > new Date(p.notion_synced_at)
  ).length;

  const exportAll = async () => {
    setBulkBusy(true);
    setBulkMsg("");
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.project_id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setBulkMsg(`${data.count || profiles.length} ta natija Notion'ga yuborildi`);
      await load();
      setTimeout(() => setBulkMsg(""), 4000);
    } catch (e) {
      setBulkMsg("Xatolik: " + String(e.message || e));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn" onClick={exportAll} disabled={bulkBusy} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
          borderRadius: 12,
          backgroundColor: pendingCount > 0 ? T.primary : T.panel,
          color: pendingCount > 0 ? "#090909" : T.text2,
          fontSize: 13, fontWeight: 800,
          boxShadow: pendingCount > 0 ? `0 0 24px ${T.primaryGlow}` : "none",
        }}>
          {bulkBusy ? <RefreshCw size={14} className="spin" /> : <Upload size={14} />}
          {bulkBusy ? "Yuborilmoqda…"
            : pendingCount > 0 ? `Hammasini Notion'ga yuborish (${pendingCount})`
            : "Hammasi Notion'da"}
        </button>

        {bulkMsg && (
          <span className="fade-up" style={{
            fontSize: 12, fontWeight: 700,
            color: bulkMsg.startsWith("Xatolik") ? T.danger : T.success,
          }}>{bulkMsg}</span>
        )}

        <div style={{ flex: 1 }} />

        {/* row height */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          fontSize: 11, fontWeight: 700, color: T.muted,
        }} title="Katak balandligi">
          <Database size={12} />
          <span style={{ whiteSpace: "nowrap" }}>Ko&apos;rinish</span>
        </div>

        <div style={{
          display: "inline-flex", gap: 3, backgroundColor: T.canvas,
          border: `1px solid ${T.border}`, borderRadius: 10, padding: 3,
        }}>
          {[{ v: 2, l: "Ixcham" }, { v: 3, l: "O'rtacha" }, { v: 8, l: "Keng" }].map((d) => (
            <button key={d.v} className="btn" onClick={() => setDensity(d.v)} style={{
              padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 700,
              backgroundColor: density === d.v ? T.panel : "transparent",
              color: density === d.v ? T.primary : T.text2,
            }}>{d.l}</button>
          ))}
        </div>

        <button className="btn" onClick={load} style={{
          display: "flex", alignItems: "center", gap: 6, backgroundColor: "transparent",
          border: `1px solid ${T.border}`, borderRadius: 10, padding: "6px 12px",
          color: T.text2, fontSize: 12, fontWeight: 700,
        }}>
          <RefreshCw size={12} /> Yangilash
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden", width: "100%" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{
            width: "100%",
            minWidth: 1100,
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}>
            <colgroup>
              <col style={{ width: "13%", minWidth: 150 }} />
              <col style={{ width: "10%", minWidth: 110 }} />
              <col style={{ width: "13%", minWidth: 140 }} />
              <col style={{ width: "13%", minWidth: 140 }} />
              <col style={{ width: "12%", minWidth: 130 }} />
              <col style={{ width: "11%", minWidth: 120 }} />
              <col style={{ width: "11%", minWidth: 120 }} />
              <col style={{ width: "13%", minWidth: 150 }} />
              <col style={{ width: "8%", minWidth: 120 }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, backgroundColor: T.s1 }}>
                <th style={{
                  ...thStyle, position: "sticky", left: 0, zIndex: 2,
                  backgroundColor: T.s1, borderRight: `1px solid ${T.border}`,
                }}>Ism</th>
                {CUSTDEV_COLUMNS.map((c, i) => (
                  <th key={c.label} style={{
                    ...thStyle,
                    borderRight: i < CUSTDEV_COLUMNS.length - 1 ? `1px solid ${T.border}` : "none",
                  }}>{c.label}</th>
                ))}
                <th style={{ ...thStyle, textAlign: "right" }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const prof = normaliseProfile(p.profile);
                const hovered = hoverId === p.id;
                return (
                  <tr key={p.id}
                    onMouseEnter={() => setHoverId(p.id)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{
                      borderBottom: `1px solid ${T.border}`,
                      backgroundColor: hovered ? "rgba(255,255,255,0.025)" : "transparent",
                      transition: "background-color 120ms ease-out",
                    }}
                  >
                    <td style={{
                      ...tdStyle, position: "sticky", left: 0, zIndex: 1,
                      backgroundColor: hovered ? T.s1 : T.canvas,
                      borderRight: `1px solid ${T.border}`,
                      transition: "background-color 120ms ease-out",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => openDetail(p.id)} style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
                          borderRadius: 9, backgroundColor: T.s2, border: `1px solid ${T.border}`,
                          color: T.text, fontSize: 13, fontWeight: 800,
                          maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {prof.ism || "Nomalum"}
                        </button>
                        {p.notion_url && (
                          <a href={p.notion_url} target="_blank" rel="noreferrer"
                            className="btn" title="Notionda ochish"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                              backgroundColor: "transparent", border: `1px solid ${T.border}`,
                              color: T.text2, textDecoration: "none",
                            }}>
                            <ArrowLeft size={11} style={{ transform: "rotate(135deg)" }} />
                          </a>
                        )}
                      </div>
                    </td>

                    {CUSTDEV_COLUMNS.map((c, i) => (
                      <td key={c.label} style={{
                        ...tdStyle,
                        borderRight: i < CUSTDEV_COLUMNS.length - 1 ? `1px solid ${T.border}` : "none",
                      }}>
                        <TableCell value={pickField(prof, c.keys)} clamp={density} />
                      </td>
                    ))}

                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{
                        display: "flex", gap: 6, justifyContent: "flex-end",
                        flexWrap: "wrap",
                      }}>
                        <button className="btn" onClick={() => openDetail(p.id)} style={{
                          padding: "6px 11px", borderRadius: 9, backgroundColor: T.panel,
                          color: T.primary, fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap",
                        }}>Batafsil</button>
                        <NotionExportCell p={p} onSynced={(id, data) => patchProfile(id, {
                          notion_page_id: data.notion_page_id,
                          notion_url: data.notion_url,
                          notion_synced_at: new Date().toISOString(),
                        })} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        fontSize: 11.5, color: T.muted, fontWeight: 600, marginTop: 10,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <AlertCircle size={12} />
        Katakni bosib to&apos;liq matnni ochish mumkin
      </div>
    </div>
  );
}

/* ─── FULL DETAIL PAGE — editable + Notion export ───────── */
function InterviewDetail({ p, project, onBack, onSaved }) {
  const [profile, setProfile] = useState(() => normaliseProfile(p.profile));
  const [summary, setSummary] = useState(p.summary || "");
  const [tab, setTab] = useState("profile");
  const [transcript, setTranscript] = useState(null);
  const [loadingT, setLoadingT] = useState(false);
  const [copied, setCopied] = useState(false);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notion, setNotion] = useState({
    page_id: p.notion_page_id || null,
    url: p.notion_url || null,
    synced_at: p.notion_synced_at || null,
    updated_at: p.updated_at || p.created_at,
  });
  const [exporting, setExporting] = useState(false);
  const [notionMsg, setNotionMsg] = useState("");

  const hasValue = (v) =>
    Array.isArray(v) ? v.length > 0
    : (v && typeof v === "object") ? Object.values(v).some((x) => hasValue(x))
    : (v !== null && v !== undefined && String(v).trim() !== "");

  const getVal = (g, key) => (g.nested ? (profile[g.nested] || {})[key] : profile[key]);

  const setVal = (g, key, value) => {
    setProfile((prev) => {
      if (g.nested) {
        return { ...prev, [g.nested]: { ...(prev[g.nested] || {}), [key]: value } };
      }
      return { ...prev, [key]: value };
    });
    setDirty(true);
  };

  /* has it been edited since the last Notion sync? */
  const needsSync = (() => {
    if (!notion.page_id) return false;
    if (dirty) return true;
    if (!notion.synced_at) return true;
    return new Date(notion.updated_at) > new Date(notion.synced_at);
  })();

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("interview_profiles")
      .update({ profile, summary })
      .eq("id", p.id);
    setSaving(false);
    if (!error) {
      setDirty(false);
      const now = new Date().toISOString();
      setNotion((n) => ({ ...n, updated_at: now }));
      onSaved && onSaved({ profile, summary, updated_at: now });
    }
  };

  const exportNotion = async () => {
    if (dirty) await save();
    setExporting(true);
    setNotionMsg("");
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: p.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      const now = new Date().toISOString();
      setNotion({
        page_id: data.notion_page_id,
        url: data.notion_url,
        synced_at: now,
        updated_at: now,
      });
      onSaved && onSaved({
        notion_page_id: data.notion_page_id,
        notion_url: data.notion_url,
        notion_synced_at: now,
        updated_at: now,
      });
      setNotionMsg("Notion yangilandi");
      setTimeout(() => setNotionMsg(""), 3000);
    } catch (e) {
      setNotionMsg("Xatolik: " + String(e.message || e));
    } finally {
      setExporting(false);
    }
  };

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
    if (summary) { lines.push("## XULOSA", summary, ""); }
    const groupsForCopy = p.profile_type === "customer" ? CUSTDEV_FIELD_GROUPS : FIELD_GROUPS;
    groupsForCopy.forEach((g) => {
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

  /* Notion button state */
  let notionLabel, notionColor, notionIcon;
  if (!notion.page_id) {
    notionLabel = "Notion'ga eksport qilish";
    notionColor = T.primary;
    notionIcon = <Upload size={14} />;
  } else if (needsSync) {
    notionLabel = "O'zgarishlarni saqlash";
    notionColor = T.warning;
    notionIcon = <RefreshCw size={14} />;
  } else {
    notionLabel = "Notion'da ochish";
    notionColor = T.success;
    notionIcon = <Check size={14} />;
  }

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
              {dirty && (
                <span className="fade-up" style={{
                  fontSize: 11, fontWeight: 800, color: T.warning,
                  backgroundColor: "rgba(243,198,75,.12)", borderRadius: 999, padding: "4px 12px",
                  display: "flex", alignItems: "center", gap: 5,
                }}><AlertCircle size={11} /> Saqlanmagan o&apos;zgarishlar</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dirty && (
              <button className="btn" onClick={save} disabled={saving} style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
                borderRadius: 12, backgroundColor: T.panel, color: T.text,
                fontSize: 13, fontWeight: 800,
              }}>
                {saving ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                Saqlash
              </button>
            )}
            <button className="btn" onClick={copyAll} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
              borderRadius: 12, backgroundColor: "transparent",
              border: `1px solid ${T.border}`, color: copied ? T.success : T.text2,
              fontSize: 13, fontWeight: 700,
            }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Notion bar */}
        <div style={{
          marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <button className="btn" onClick={
            (!notion.page_id || needsSync) ? exportNotion : () => window.open(notion.url, "_blank")
          } disabled={exporting} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 20px",
            borderRadius: 12, backgroundColor: notionColor, color: "#090909",
            fontSize: 13, fontWeight: 800,
            boxShadow: notionColor === T.primary ? `0 0 24px ${T.primaryGlow}` : "none",
          }}>
            {exporting ? <RefreshCw size={14} className="spin" /> : notionIcon}
            {exporting ? "Yuborilmoqda…" : notionLabel}
          </button>

          {notion.url && !needsSync && (
            <a href={notion.url} target="_blank" rel="noreferrer" style={{
              fontSize: 12, color: T.text2, fontWeight: 700, textDecoration: "none",
            }}>Notion sahifasi →</a>
          )}

          {needsSync && (
            <span style={{ fontSize: 12, color: T.warning, fontWeight: 700 }}>
              Notion eskirgan — o&apos;zgarishlar yuborilmagan
            </span>
          )}

          {notionMsg && (
            <span className="fade-up" style={{
              fontSize: 12, fontWeight: 700,
              color: notionMsg.startsWith("Xatolik") ? T.danger : T.success,
            }}>{notionMsg}</span>
          )}
        </div>

        {/* editable summary */}
        <div style={{
          marginTop: 16, backgroundColor: "rgba(217,255,99,.06)",
          border: "1px solid rgba(217,255,99,.2)", borderRadius: 12, padding: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: T.primary, marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>Prodyuser uchun xulosa</div>
          <AutoTextarea
            value={summary}
            onChange={(v) => { setSummary(v); setDirty(true); }}
            placeholder="Xulosa yozing…"
            style={{ fontSize: 14.5, lineHeight: "23px" }}
          />
        </div>
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
          {(p.profile_type === "customer" ? CUSTDEV_FIELD_GROUPS : FIELD_GROUPS).map((g) => {
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
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {g.fields.map(([key, label]) => (
                    <EditableField
                      key={key}
                      label={label}
                      value={getVal(g, key)}
                      onChange={(v) => setVal(g, key, v)}
                    />
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

/* textarea that grows with its content */
function AutoTextarea({ value, onChange, placeholder, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="soft-input"
      style={{
        width: "100%", resize: "none", backgroundColor: "transparent",
        border: "1px solid transparent", borderRadius: 8, color: T.text,
        fontFamily: FONT, padding: "6px 8px", overflow: "hidden",
        ...style,
      }}
    />
  );
}

/* one editable field — text or list */
function EditableField({ label, value, onChange }) {
  const isList = Array.isArray(value);
  const [asList, setAsList] = useState(isList);

  const items = isList ? value : [];

  const updateItem = (i, v) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i));
  const addItem = () => onChange([...(items || []), ""]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 180px) 1fr", gap: 16, alignItems: "start" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, paddingTop: 8 }}>{label}</div>

      {asList ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{
                width: 5, height: 5, borderRadius: 999, backgroundColor: T.primary,
                flexShrink: 0, marginTop: 15,
              }} />
              <div style={{ flex: 1 }}>
                <AutoTextarea
                  value={item}
                  onChange={(v) => updateItem(i, v)}
                  style={{ fontSize: 13.5, lineHeight: "21px" }}
                />
              </div>
              <button className="btn" onClick={() => removeItem(i)} title="O'chirish" style={{
                backgroundColor: "transparent", color: T.muted, padding: "6px 4px",
                fontSize: 15, lineHeight: 1,
              }}>×</button>
            </div>
          ))}
          <button className="btn" onClick={addItem} style={{
            alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5,
            backgroundColor: "transparent", color: T.text2, fontSize: 12,
            fontWeight: 700, padding: "4px 8px", border: `1px dashed ${T.border}`,
            borderRadius: 8,
          }}>
            <Plus size={11} /> Qo&apos;shish
          </button>
        </div>
      ) : (
        <div>
          <AutoTextarea
            value={value}
            onChange={onChange}
            placeholder="—"
            style={{ fontSize: 13.5, lineHeight: "21px" }}
          />
          {!value && (
            <button className="btn" onClick={() => { setAsList(true); onChange([""]); }} style={{
              display: "flex", alignItems: "center", gap: 5, backgroundColor: "transparent",
              color: T.muted, fontSize: 11, fontWeight: 700, padding: "2px 8px",
            }}>
              <Plus size={10} /> Ro&apos;yxat sifatida
            </button>
          )}
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

/* ═══════════════════════════════════════════════════════════
   ADMIN GATE — password modal
   ═══════════════════════════════════════════════════════════ */
function AdminGate({ onClose, onSuccess }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    if (pw === ADMIN_PASSWORD) onSuccess();
    else { setErr("Parol noto'g'ri"); setPw(""); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200,
      backgroundColor: "rgba(9,9,9,.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up card"
        style={{ width: "100%", maxWidth: 360, padding: 28 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(233,104,104,.12)",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <ShieldCheck size={20} color={T.danger} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Admin panel</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 600, marginBottom: 20, lineHeight: "19px" }}>
          Bu yerda ma&apos;lumotlarni butunlay o&apos;chirish mumkin. Ehtiyot bo&apos;ling.
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <Lock size={16} color={T.muted} style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input type="password" value={pw} autoFocus
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Parol"
            style={{
              width: "100%", backgroundColor: T.s2, border: `1px solid ${T.border}`,
              borderRadius: 12, color: T.text, fontSize: 15, padding: "11px 14px 11px 42px",
            }} />
        </div>

        {err && <div className="fade-up" style={{
          fontSize: 13, fontWeight: 700, color: T.danger, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={submit} style={{
            flex: 1, padding: "12px 0", borderRadius: 12, backgroundColor: T.primary,
            color: "#090909", fontSize: 14, fontWeight: 800,
          }}>Kirish</button>
          <button className="btn" onClick={onClose} style={{
            padding: "12px 20px", borderRadius: 12, backgroundColor: "transparent",
            border: `1px solid ${T.border}`, color: T.text2, fontSize: 14, fontWeight: 700,
          }}>Bekor</button>
        </div>
      </div>
    </div>
  );
}

function AdminContent() {
  const [tab, setTab] = useState("projects");
  const [stats, setStats] = useState(null);

  const loadStats = async () => {
    const { data } = await supabase.from("storage_summary").select("*").maybeSingle();
    setStats(data);
  };
  useEffect(() => { loadStats(); }, []);

  const tabs = [
    { id: "projects", label: "Loyihalar" },
    { id: "brain", label: "Bilim bazasi" },
    { id: "files", label: "Barcha fayllar" },
    { id: "users", label: "Foydalanuvchilar" },
  ];

  return (
    <div className="fade-up" style={{ maxWidth: 1000 }}>
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(233,104,104,.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={19} color={T.danger} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Admin panel</div>
            <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, marginTop: 2 }}>
              O&apos;chirilgan ma&apos;lumotni tiklab bo&apos;lmaydi
            </div>
          </div>
        </div>

        {stats && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 10, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}`,
          }}>
            <AdminStat label="Loyiha" value={stats.projects} />
            <AdminStat label="Fayl" value={stats.files} />
            <AdminStat label="Bo'lak" value={stats.chunks} />
            <AdminStat label="Tahlil" value={stats.profiles} />
            <AdminStat label="Savol to'plami" value={stats.question_sets} />
            <AdminStat label="Foydalanuvchi" value={stats.users} />
          </div>
        )}
      </div>

      <div style={{
        display: "inline-flex", gap: 4, backgroundColor: T.canvas,
        border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, marginBottom: 16,
      }}>
        {tabs.map((t) => (
          <button key={t.id} className="btn" onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            backgroundColor: tab === t.id ? T.panel : "transparent",
            color: tab === t.id ? T.primary : T.text2,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "projects" && <AdminProjects onChange={loadStats} />}
      {tab === "brain" && <AdminFiles clientFilter={BRAIN_ID} onChange={loadStats} />}
      {tab === "files" && <AdminFiles clientFilter={null} onChange={loadStats} />}
      {tab === "users" && <AdminUsers />}
    </div>
  );
}

function AdminStat({ label, value }) {
  return (
    <div style={{ backgroundColor: T.s1, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{value ?? "—"}</div>
      <div style={{ fontSize: 10.5, color: T.muted, fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* two-step delete button */
function DeleteButton({ onConfirm, label = "O'chirish", busy }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (busy) {
    return <RefreshCw size={14} color={T.muted} className="spin" />;
  }

  return armed ? (
    <button className="btn fade-up" onClick={() => { setArmed(false); onConfirm(); }} style={{
      display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
      borderRadius: 9, backgroundColor: T.danger, color: "#090909",
      fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap",
    }}>
      Tasdiqlash
    </button>
  ) : (
    <button className="btn" onClick={() => setArmed(true)} title={label} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 30, height: 30, borderRadius: 9, backgroundColor: "transparent",
      border: `1px solid ${T.border}`, color: T.muted,
    }}>
      <Trash2 size={13} />
    </button>
  );
}

/* ── Projects ── */
function AdminProjects({ onChange }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("project_overview").select("*")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const removeProject = async (pid) => {
    setBusyId(pid);
    // delete everything belonging to this project
    await supabase.from("documents").delete().filter("metadata->>client_id", "eq", pid);
    await supabase.from("interview_profiles").delete().eq("project_id", pid);
    await supabase.from("interview_questions").delete().eq("project_id", pid);
    await supabase.from("interview_transcripts").delete().eq("project_id", pid);
    await supabase.from("upload_status").delete().eq("project_id", pid);
    await supabase.from("projects").delete().eq("project_id", pid);
    setBusyId(null);
    load();
    onChange && onChange();
  };

  if (loading) return <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Yuklanmoqda…</div>;
  if (!rows.length) return <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Loyiha yo&apos;q</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.project_id} className="card" style={{
          padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 600, marginTop: 3 }}>
              {r.project_id} · {r.files_uploaded || 0} fayl · {r.interviews_analyzed || 0} tahlil
              {" · "}{r.question_sets || 0} savol to&apos;plami
            </div>
          </div>
          <DeleteButton busy={busyId === r.project_id}
            onConfirm={() => removeProject(r.project_id)} />
        </div>
      ))}
      <div style={{
        fontSize: 11.5, color: T.muted, fontWeight: 600, padding: "8px 4px", lineHeight: "17px",
      }}>
        Loyihani o&apos;chirish uning barcha fayllari, tahlillari, savollari va
        transkriptlarini ham o&apos;chiradi.
      </div>
    </div>
  );
}

/* ── Files in the vector store ── */
function AdminFiles({ clientFilter, onChange }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    let query = supabase.from("file_overview").select("*");
    if (clientFilter) query = query.eq("client_id", clientFilter);
    const { data } = await query;
    const sorted = (data || []).sort((a, b) =>
      String(b.uploaded_at || "").localeCompare(String(a.uploaded_at || "")));
    setRows(sorted);
    setLoading(false);
  };
  useEffect(() => { load(); }, [clientFilter]);

  const removeFile = async (fileId) => {
    setBusyId(fileId);
    await supabase.from("documents").delete().filter("metadata->>file_id", "eq", fileId);
    await supabase.from("upload_status").delete().eq("file_id", fileId);
    setBusyId(null);
    load();
    onChange && onChange();
  };

  const filtered = rows.filter((r) =>
    ((r.file_name || "") + (r.file_id || "") + (r.client_id || ""))
      .toLowerCase().includes(q.toLowerCase()));

  if (loading) return <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Yuklanmoqda…</div>;

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={15} color={T.muted} style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fayl qidirish…"
          style={{
            width: "100%", backgroundColor: T.canvas, border: `1px solid ${T.border}`,
            borderRadius: 12, color: T.text, fontSize: 14, padding: "10px 14px 10px 40px",
          }} />
      </div>

      {!filtered.length && (
        <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Fayl topilmadi</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((r) => (
          <div key={r.file_id} className="card" style={{
            padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, backgroundColor: T.s2, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FileText size={14} color={T.secondaryLight} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>{r.file_name || r.file_id}</div>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginTop: 2 }}>
                {r.client_id} · {r.doc_type || "—"} · {r.chunks} bo&apos;lak
                {r.uploaded_at ? " · " + new Date(r.uploaded_at).toLocaleDateString("uz-UZ") : ""}
              </div>
            </div>
            <DeleteButton busy={busyId === r.file_id}
              onConfirm={() => removeFile(r.file_id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Users ── */
function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("app_users").select("*")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (email, current) => {
    await supabase.from("app_users")
      .update({ notifications_enabled: !current }).eq("email", email);
    load();
  };

  const unlink = async (email) => {
    await supabase.from("app_users")
      .update({ telegram_chat_id: null, telegram_username: null }).eq("email", email);
    load();
  };

  if (loading) return <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Yuklanmoqda…</div>;
  if (!rows.length) return <div style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>Foydalanuvchi yo&apos;q</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((u) => (
        <div key={u.email} className="card" style={{
          padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{u.full_name || u.email}</div>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginTop: 2 }}>
              {u.email}
              {u.telegram_chat_id ? " · Telegram ulangan" : " · Telegram yo'q"}
            </div>
          </div>
          <button className="btn" onClick={() => toggle(u.email, u.notifications_enabled)} style={{
            padding: "6px 12px", borderRadius: 9, backgroundColor: "transparent",
            border: `1px solid ${T.border}`,
            color: u.notifications_enabled ? T.success : T.muted,
            fontSize: 11.5, fontWeight: 700,
          }}>
            {u.notifications_enabled ? "Bildirishnoma yoqilgan" : "O'chirilgan"}
          </button>
          {u.telegram_chat_id && (
            <button className="btn" onClick={() => unlink(u.email)} style={{
              padding: "6px 12px", borderRadius: 9, backgroundColor: "transparent",
              border: `1px solid ${T.border}`, color: T.text2, fontSize: 11.5, fontWeight: 700,
            }}>Telegramni uzish</button>
          )}
        </div>
      ))}
    </div>
  );
}