import { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import {
  loginConGoogle, getMe, logout,
  getPartidos, getTodosEnvios, getTabla,
  enviarPronosticos, getResultados,
} from "./api";

// ── CONSTANTES ────────────────────────────────────────────────────────────
const METRICA = { pts_exacto: 3, pts_ganador: 1, pts_fallo: 0 };

const BANDERAS = {
  "México": "🇲🇽", "Sudáfrica": "🇿🇦", "Corea del Sur": "🇰🇷", "Chequia": "🇨🇿",
  "Canadá": "🇨🇦", "Bosnia y Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Suiza": "🇨🇭",
  "Brasil": "🇧🇷", "Marruecos": "🇲🇦", "Haití": "🇭🇹", "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Estados Unidos": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Türkiye": "🇹🇷",
  "Alemania": "🇩🇪", "Curazao": "🇨🇼", "Costa de Marfil": "🇨🇮", "Ecuador": "🇪🇨",
  "Países Bajos": "🇳🇱", "Japón": "🇯🇵", "Suecia": "🇸🇪", "Túnez": "🇹🇳",
  "Bélgica": "🇧🇪", "Egipto": "🇪🇬", "Irán": "🇮🇷", "Nueva Zelanda": "🇳🇿",
  "España": "🇪🇸", "Cabo Verde": "🇨🇻", "Arabia Saudita": "🇸🇦", "Uruguay": "🇺🇾",
  "Francia": "🇫🇷", "Senegal": "🇸🇳", "Iraq": "🇮🇶", "Noruega": "🇳🇴",
  "Argentina": "🇦🇷", "Argelia": "🇩🇿", "Austria": "🇦🇹", "Jordania": "🇯🇴",
  "Portugal": "🇵🇹", "DR Congo": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croacia": "🇭🇷", "Ghana": "🇬🇭", "Panamá": "🇵🇦",
};

// ── HELPERS ───────────────────────────────────────────────────────────────
async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function randomScore() {
  const s=[[0,0],[1,0],[0,1],[1,1],[2,0],[0,2],[2,1],[1,2],[2,2],[3,0],[0,3],[3,1],[1,3]];
  return s[Math.floor(Math.random()*s.length)];
}

function getPronScore(v, partido) {
  if (!partido || partido.goles_local === null) return "pend";
  const rl = partido.goles_local, rv = partido.goles_visitante;
  if (rl===v?.gl && rv===v?.gv) return "exacto";
  if (Math.sign(rl-rv)===Math.sign(v?.gl-v?.gv)) return "ganador";
  return "fallo";
}

// ── STYLES ────────────────────────────────────────────────────────────────
const G = { bg:"#0a0f0d", surface:"#111a14", hi:"#172018", border:"#1e2e20", green:"#22c55e", gdim:"#16a34a", gglow:"rgba(34,197,94,0.12)", text:"#e8f0e9", muted:"#6b8f6e", dim:"#3d5c40", gold:"#f59e0b", red:"#ef4444", blue:"#3b82f6" };

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${G.bg};color:${G.text};font-family:'DM Sans',sans-serif}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${G.bg}}::-webkit-scrollbar-thumb{background:${G.border};border-radius:2px}

.landing{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
.lbg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(34,197,94,0.08),transparent 60%);pointer-events:none}
.lgrid{position:absolute;inset:0;background-image:linear-gradient(${G.border} 1px,transparent 1px),linear-gradient(90deg,${G.border} 1px,transparent 1px);background-size:40px 40px;opacity:0.3;pointer-events:none}
.logo{font-family:'Bebas Neue',sans-serif;font-size:88px;color:${G.green};line-height:1;letter-spacing:6px;text-shadow:0 0 60px rgba(34,197,94,0.35)}
.logo-sub{font-size:12px;letter-spacing:7px;color:${G.muted};text-transform:uppercase;margin-top:-6px;margin-bottom:36px}
.dcard{background:${G.surface};border:1px solid ${G.border};border-radius:16px;padding:28px;max-width:500px;width:100%;position:relative}
.dcard::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:60%;height:1px;background:linear-gradient(90deg,transparent,${G.green},transparent)}
.dtitle{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${G.green};margin-bottom:14px}
.ditem{display:flex;gap:10px;margin-bottom:9px;font-size:13px;color:${G.muted};line-height:1.6}
.ditem span:first-child{flex-shrink:0}
.ditem strong{color:${G.text}}
.divider{margin:18px 0;border:none;border-top:1px solid ${G.border}}
.btn-google{width:100%;padding:13px 16px;border-radius:8px;border:none;background:${G.green};color:#0a0f0d;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.2s;margin-top:4px}
.btn-google:hover{background:${G.gdim};transform:translateY(-1px);box-shadow:0 8px 24px rgba(34,197,94,0.3)}
.btn-google:disabled{opacity:0.6;cursor:not-allowed;transform:none}
.accept-note{text-align:center;font-size:11px;color:${G.dim};margin-top:10px}

.newuser{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:${G.bg};position:relative}
.nucard{background:${G.surface};border:1px solid ${G.border};border-radius:16px;padding:32px;max-width:440px;width:100%;position:relative;z-index:1}
.nucard::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:60%;height:1px;background:linear-gradient(90deg,transparent,${G.green},transparent)}
.nu-avatar{width:64px;height:64px;border-radius:50%;border:2px solid ${G.green};display:block;margin:0 auto 16px}
.nu-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:2px;text-align:center;margin-bottom:4px}
.nu-sub{font-size:13px;color:${G.muted};text-align:center;margin-bottom:20px}
.nu-email{background:${G.hi};border:1px solid ${G.border};border-radius:8px;padding:10px 14px;font-size:13px;color:${G.muted};margin-bottom:18px;text-align:center;font-family:monospace}
.nu-disclaimer{background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:10px;padding:14px;margin-bottom:18px}
.nu-disclaimer p{font-size:12px;color:${G.muted};line-height:1.6;margin-bottom:6px}
.nu-disclaimer p:last-child{margin-bottom:0}
.nu-disclaimer strong{color:${G.text}}
.ubtn{width:100%;padding:11px 14px;border-radius:8px;border:none;background:${G.green};color:#0a0f0d;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s}
.ubtn:hover{background:${G.gdim}}
.ubtn:disabled{opacity:0.6;cursor:not-allowed}

.nav{background:${G.surface};border-bottom:1px solid ${G.border};padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:100}
.nav-logo{font-family:'Bebas Neue',sans-serif;font-size:28px;color:${G.green};letter-spacing:2px}
.nav-tabs{display:flex;gap:4px}
.ntab{padding:8px 14px;border-radius:8px;border:none;background:transparent;color:${G.muted};font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s}
.ntab:hover{color:${G.text};background:${G.hi}}
.ntab.active{color:${G.green};background:${G.gglow}}
.nav-right{display:flex;align-items:center;gap:8px}
.nav-av{width:30px;height:30px;border-radius:50%;border:2px solid ${G.border}}
.nav-nm{font-size:13px;color:${G.muted}}
.btn-out{padding:5px 10px;border-radius:6px;border:1px solid ${G.border};background:transparent;color:${G.muted};font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
.btn-out:hover{border-color:${G.red};color:${G.red}}

.main{max-width:900px;margin:0 auto;padding:28px 20px}
.ptitle{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:2px;margin-bottom:4px}
.psub{font-size:13px;color:${G.muted};margin-bottom:24px}
.loading{text-align:center;padding:48px;color:${G.muted};font-size:14px}
.error-msg{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;font-size:13px;color:${G.red};margin-bottom:16px}

.tabla{background:${G.surface};border:1px solid ${G.border};border-radius:14px;overflow:hidden}
.trow{display:grid;grid-template-columns:36px 1fr 64px 64px 64px 76px;padding:13px 18px;border-bottom:1px solid ${G.border};align-items:center;transition:background 0.15s}
.trow:last-child{border-bottom:none}
.trow:hover{background:${G.hi}}
.trow.me{background:${G.gglow}}
.trow.header{background:${G.hi}}
.trow.header span{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${G.dim}}
.pos{font-family:'Bebas Neue',sans-serif;font-size:22px;color:${G.dim}}
.pos.g{color:${G.gold}}.pos.s{color:#94a3b8}.pos.b{color:#b45309}
.uinfo{display:flex;align-items:center;gap:10px;cursor:pointer}
.uinfo:hover .unm{color:${G.green}}
.uav{width:32px;height:32px;border-radius:50%;border:1px solid ${G.border}}
.unm{font-size:14px;font-weight:500;transition:color 0.15s}
.uem{font-size:11px;color:${G.muted}}
.stat{text-align:center;font-size:14px}
.pts{text-align:center;font-family:'Bebas Neue',sans-serif;font-size:26px;color:${G.green}}

.fcard{background:${G.surface};border:1px solid ${G.border};border-radius:14px;margin-bottom:14px;overflow:hidden}
.fhead{padding:18px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${G.border}}
.ftitle{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px}
.fdl{font-size:12px;color:${G.muted}}
.stopen{font-size:11px;padding:4px 12px;border-radius:20px;background:rgba(34,197,94,0.12);color:${G.green};border:1px solid rgba(34,197,94,0.2)}
.stsent{font-size:11px;padding:4px 12px;border-radius:20px;background:rgba(59,130,246,0.12);color:${G.blue};border:1px solid rgba(59,130,246,0.2)}
.stlock{font-size:11px;padding:4px 12px;border-radius:20px;background:${G.hi};color:${G.dim};border:1px solid ${G.border}}
.fbody{padding:22px}

.draft-banner{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;font-size:13px;color:${G.gold};gap:12px;flex-wrap:wrap}
.dba{display:flex;gap:8px}
.btn-dc{padding:6px 14px;border-radius:6px;background:${G.gold};color:#0a0f0d;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
.btn-dd{padding:6px 14px;border-radius:6px;background:transparent;color:${G.muted};border:1px solid ${G.border};font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif}
.prog-wrap{height:3px;background:${G.border};border-radius:2px;margin-bottom:18px;overflow:hidden}
.prog-bar{height:100%;background:${G.green};border-radius:2px;transition:width 0.4s}
.pfgrid{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
.pfrow{display:grid;grid-template-columns:1fr 50px 18px 50px 1fr;align-items:center;gap:6px;padding:10px 14px;background:${G.hi};border-radius:10px;border:1px solid transparent;transition:border-color 0.15s}
.pfrow.ok{border-color:rgba(34,197,94,0.25)}
.elabel{font-size:12px;font-weight:500;display:flex;align-items:center;gap:5px}
.elabel.r{flex-direction:row-reverse;text-align:right}
.grp{font-size:10px;padding:1px 5px;border-radius:3px;background:${G.border};color:${G.dim};letter-spacing:1px}
.sinp{width:100%;padding:7px 4px;background:${G.surface};border:1px solid ${G.border};border-radius:6px;color:${G.text};font-family:'Bebas Neue',sans-serif;font-size:22px;text-align:center;outline:none;transition:border-color 0.15s}
.sinp:focus{border-color:${G.green}}
.ssep{font-family:'Bebas Neue',sans-serif;font-size:18px;color:${G.dim};text-align:center}
.ffoot{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.fprog{font-size:12px;color:${G.muted};flex:1}
.btn-rnd{padding:10px 16px;border-radius:8px;border:1px solid ${G.border};background:transparent;color:${G.muted};font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
.btn-rnd:hover{border-color:${G.green};color:${G.green}}
.btn-send{padding:10px 22px;border-radius:8px;background:${G.green};color:#0a0f0d;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s}
.btn-send:hover{background:${G.gdim}}
.btn-send:disabled{background:${G.border};color:${G.dim};cursor:not-allowed}

.ehash{background:${G.gglow};border:1px solid rgba(34,197,94,0.2);border-radius:10px;padding:14px 16px;margin-bottom:16px}
.ehl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${G.green};margin-bottom:4px}
.ehv{font-family:monospace;font-size:12px;color:${G.muted};word-break:break-all}
.ehm{font-size:11px;color:${G.dim};margin-top:4px}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin-bottom:16px}
.pchip{background:${G.hi};border-radius:8px;padding:9px 13px;display:flex;justify-content:space-between;align-items:center}
.pnames{font-size:11px;color:${G.muted};line-height:1.4}
.pscore{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px}
.pscore.exacto{color:${G.green}}.pscore.ganador{color:${G.gold}}.pscore.fallo{color:${G.red}}.pscore.pend{color:${G.text}}

.viewer-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid ${G.border}}
.viewer-av{width:44px;height:44px;border-radius:50%;border:2px solid ${G.green}}
.viewer-name{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px}
.viewer-sub{font-size:12px;color:${G.muted}}
.btn-back{padding:7px 14px;border-radius:8px;border:1px solid ${G.border};background:transparent;color:${G.muted};font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;margin-bottom:16px}
.btn-back:hover{border-color:${G.green};color:${G.green}}

.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}
.icard{background:${G.surface};border:1px solid ${G.border};border-radius:12px;padding:18px}
.icard-title{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${G.muted};margin-bottom:12px}
.metric-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid ${G.border}}
.metric-row:last-child{border-bottom:none}
.metric-label{font-size:13px;color:${G.muted}}
.metric-val{font-family:'Bebas Neue',sans-serif;font-size:24px}
.metric-val.green{color:${G.green}}.metric-val.gold{color:${G.gold}}.metric-val.red{color:${G.red}}

.hash-table{background:${G.surface};border:1px solid ${G.border};border-radius:12px;overflow:hidden;margin-bottom:24px}
.hash-row{display:grid;grid-template-columns:1fr 1fr 110px;padding:12px 18px;border-bottom:1px solid ${G.border};align-items:center}
.hash-row:last-child{border-bottom:none}
.hash-row.hh{background:${G.hi}}
.hash-row.hh span{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${G.dim}}
.hash-val{font-family:monospace;font-size:11px;color:${G.muted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hash-ts{font-size:11px;color:${G.dim}}

.verif-box{background:${G.surface};border:1px solid ${G.border};border-radius:14px;overflow:hidden}
.verif-head{padding:18px 22px;border-bottom:1px solid ${G.border};display:flex;justify-content:space-between;align-items:center}
.verif-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px}
.verif-body{padding:22px}
.drop-zone{border:2px dashed ${G.border};border-radius:12px;padding:40px 24px;text-align:center;cursor:pointer;transition:all 0.2s;position:relative}
.drop-zone:hover,.drop-zone.drag{border-color:${G.green};background:${G.gglow}}
.drop-icon{font-size:36px;margin-bottom:10px}
.drop-text{font-size:14px;color:${G.muted};margin-bottom:6px}
.drop-sub{font-size:12px;color:${G.dim}}
.drop-input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}

.result-ok{background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:12px;padding:20px;margin-top:16px}
.result-fail{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px;margin-top:16px}
.result-warn{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:20px;margin-top:16px}
.result-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:8px}
.result-ok .result-title{color:${G.green}}
.result-fail .result-title{color:${G.red}}
.result-warn .result-title{color:${G.gold}}
.result-detail{font-size:12px;color:${G.muted};line-height:1.7}
.hash-compare{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.hc-row{display:flex;gap:10px;align-items:flex-start;font-size:11px}
.hc-label{color:${G.dim};white-space:nowrap;width:100px;flex-shrink:0}
.hc-val{font-family:monospace;color:${G.muted};word-break:break-all}
.hc-val.match{color:${G.green}}.hc-val.nomatch{color:${G.red}}
.btn-reset{margin-top:14px;padding:8px 18px;border-radius:8px;border:1px solid ${G.border};background:transparent;color:${G.muted};font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
.btn-reset:hover{border-color:${G.green};color:${G.green}}

.modal-ov{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
.modal{background:${G.surface};border:1px solid ${G.border};border-radius:16px;padding:26px;max-width:460px;width:100%;max-height:85vh;overflow-y:auto;position:relative}
.modal::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:60%;height:1px;background:linear-gradient(90deg,transparent,${G.green},transparent)}
.mtitle{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;margin-bottom:6px}
.msub{font-size:13px;color:${G.muted};margin-bottom:14px}
.mwarn{font-size:12px;color:${G.gold};margin-bottom:14px;padding:10px 14px;background:rgba(245,158,11,0.08);border-radius:8px;border:1px solid rgba(245,158,11,0.15)}
.mlist{display:flex;flex-direction:column;gap:5px;margin-bottom:16px;max-height:260px;overflow-y:auto}
.mitem{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;background:${G.hi};border-radius:7px;font-size:12px}
.mscore{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:${G.green}}
.macts{display:flex;gap:8px}
.btn-conf{flex:1;padding:11px;background:${G.green};color:#0a0f0d;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer}
.btn-conf:hover{background:${G.gdim}}
.btn-conf:disabled{opacity:0.6;cursor:not-allowed}
.btn-canc{flex:1;padding:11px;background:transparent;color:${G.muted};border:1px solid ${G.border};border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;cursor:pointer}
.btn-canc:hover{border-color:${G.red};color:${G.red}}

.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${G.green};color:#0a0f0d;padding:11px 22px;border-radius:10px;font-size:13px;font-weight:600;z-index:999;animation:tin 0.3s ease;box-shadow:0 8px 24px rgba(34,197,94,0.4);max-width:92vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

.mtabs{display:none}
@media(max-width:640px){
  .nav-tabs{display:none}
  .mtabs{display:flex;position:fixed;bottom:0;left:0;right:0;background:${G.surface};border-top:1px solid ${G.border};z-index:100}
  .mtab{flex:1;padding:11px 4px;border:none;background:transparent;color:${G.muted};font-size:10px;font-family:'DM Sans',sans-serif;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color 0.15s}
  .mtab.active{color:${G.green}}
  .main{padding-bottom:76px}
  .trow{grid-template-columns:30px 1fr 54px 70px}
  .trow .stat:nth-child(3),.trow .stat:nth-child(4),.trow.header span:nth-child(3),.trow.header span:nth-child(4){display:none}
  .info-grid{grid-template-columns:1fr}
  .hash-row{grid-template-columns:1fr 1fr}
  .hash-row>*:nth-child(3){display:none}
  .pfrow{grid-template-columns:1fr 44px 14px 44px 1fr;gap:4px}
  .elabel{font-size:11px}
}
`;

// ── COMPONENTS ────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
  return <div className="toast">{msg}</div>;
}

function ConfirmModal({ draft, partidos, onConfirm, onCancel, sending }) {
  return (
    <div className="modal-ov">
      <div className="modal">
        <div className="mtitle">Confirmar Envío</div>
        <div className="msub">Revisa tus {partidos.length} pronósticos.</div>
        <div className="mwarn">⚠️ Una vez enviado es inmutable. Se genera un hash SHA-256 y recibes el JSON por correo.</div>
        <div className="mlist">
          {partidos.map(p => {
            const v = draft[p.id];
            return (
              <div key={p.id} className="mitem">
                <span>{p.equipo_local} vs {p.equipo_visitante}</span>
                <span className="mscore">{v?.gl ?? "?"} — {v?.gv ?? "?"}</span>
              </div>
            );
          })}
        </div>
        <div className="macts">
          <button className="btn-canc" onClick={onCancel} disabled={sending}>← Revisar</button>
          <button className="btn-conf" onClick={onConfirm} disabled={sending}>{sending ? "Enviando..." : "✓ Enviar y hashear"}</button>
        </div>
      </div>
    </div>
  );
}

function PronViewer({ envio, user, partidos, onBack, currentUserId }) {
  return (
    <div>
      {onBack && <button className="btn-back" onClick={onBack}>← Volver</button>}
      <div className="viewer-header">
        <img src={user.foto} alt="" className="viewer-av" onError={e => e.target.style.display="none"}/>
        <div>
          <div className="viewer-name">{user.nombre} {user.apellido}{user.id===currentUserId?" (tú)":""}</div>
          <div className="viewer-sub">Fase de grupos · Enviado {new Date(envio.enviado_en).toLocaleString("es-MX")}</div>
        </div>
        <div style={{marginLeft:"auto"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:G.green}}>{envio.puntos}pts</div>
        </div>
      </div>
      <div className="ehash">
        <div className="ehl">Hash SHA-256 · Contrato de integridad</div>
        <div className="ehv">{envio.hash}</div>
        <div className="ehm">Hash público · Verifica en Info & Verificar cargando el JSON de tu correo</div>
      </div>
      <div className="pgrid">
        {partidos.map(p => {
          const v = envio.pronosticos[String(p.id)];
          const cls = getPronScore(v, p);
          return (
            <div key={p.id} className="pchip">
              <div className="pnames">{p.equipo_local}<br/>{p.equipo_visitante}</div>
              <div className={`pscore ${cls}`}>{v?.gl}—{v?.gv}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PAGES ─────────────────────────────────────────────────────────────────
function LandingPage({ onLogin, loading, error }) {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      await onLogin(tokenResponse.access_token);
    },
    onError: () => console.error("Google login failed"),
  });

  return (
    <div className="landing">
      <div className="lbg"/><div className="lgrid"/>
      <div className="logo">ATÍNALE</div>
      <div className="logo-sub">Mundial 2026 · Pronósticos</div>
      <div className="dcard">
        <div className="dtitle">Antes de continuar</div>
        <div className="ditem"><span>⚽</span><span><strong>Atínale</strong> es una plataforma de pronósticos deportivos para uso privado entre participantes conocidos.</span></div>
        <div className="ditem"><span>🚫</span><span><strong>No gestiona ni transfiere dinero</strong>. Cualquier acuerdo económico es responsabilidad exclusiva de los participantes.</span></div>
        <div className="ditem"><span>🔒</span><span>Al enviar se genera un <strong>hash SHA-256 inmutable</strong>. Recibes el JSON completo por correo como prueba.</span></div>
        <div className="ditem"><span>👁</span><span>Los pronósticos son <strong>públicos e inmutables</strong>. Cualquier participante puede verificar la integridad de cualquier documento.</span></div>
        <div className="ditem"><span>💾</span><span>Los borradores viven solo en <strong>tu navegador</strong>. El servidor solo recibe el envío final.</span></div>
        <hr className="divider"/>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn-google" onClick={() => googleLogin()} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {loading ? "Verificando..." : "Continuar con Google"}
        </button>
        <div className="accept-note">Al continuar aceptas los términos descritos arriba</div>
      </div>
    </div>
  );
}

function NewUserPage({ user, onConfirm, loading }) {
  return (
    <div className="newuser">
      <div className="lbg"/><div className="lgrid"/>
      <div className="nucard">
        <img src={user.foto} alt="" className="nu-avatar" onError={e => e.target.style.display="none"}/>
        <div className="nu-title">¡Bienvenido a Atínale!</div>
        <div className="nu-sub">Es tu primera vez. Confirma tu registro.</div>
        <div className="nu-email">{user.email}</div>
        <div className="nu-disclaimer">
          <p>Al registrarte confirmas que has leído y aceptas las condiciones de uso.</p>
          <p><strong>Tu pronóstico será inmutable</strong> una vez enviado. Recibirás un JSON por correo como prueba de integridad.</p>
          <p>Atínale <strong>no gestiona dinero</strong>. Cualquier acuerdo económico es externo a esta plataforma.</p>
        </div>
        <button className="ubtn" onClick={onConfirm} disabled={loading}>
          {loading ? "Registrando..." : "✓ Confirmar registro y entrar"}
        </button>
        <div className="accept-note" style={{marginTop:8}}>Registro único · Los próximos accesos serán directos con Google</div>
      </div>
    </div>
  );
}

function TablaPage({ tabla, currentUser, onVerPron, resultados }) {
  const pc = ["g","s","b"];
  if (!tabla) return <div className="main"><div className="loading">Cargando tabla...</div></div>;
  return (
    <div className="main">
      <div className="ptitle">Tabla de Posiciones</div>
      <div className="psub">Haz clic en un jugador para ver sus pronósticos</div>
      <div className="tabla">
        <div className="trow header">
          <span>#</span><span>Jugador</span>
          <span style={{textAlign:"center"}}>Exactos</span>
          <span style={{textAlign:"center"}}>Ganador</span>
          <span style={{textAlign:"center"}}>Jugados</span>
          <span style={{textAlign:"center"}}>Puntos</span>
        </div>
        {tabla.map((u,i) => (
          <div key={u.id} className={`trow${u.id===currentUser.id?" me":""}`}>
            <div className={`pos ${pc[i]||""}`}>{i+1}</div>
            <div className="uinfo" onClick={() => onVerPron(u)}>
              <img src={u.foto} alt="" className="uav" onError={e => e.target.style.display="none"}/>
              <div>
                <div className="unm">{u.nombre} {u.apellido}{u.id===currentUser.id?" (tú)":""}</div>
                <div className="uem">Ver pronósticos →</div>
              </div>
            </div>
            <div className="stat" style={{color:G.green}}>{u.exactos}</div>
            <div className="stat" style={{color:G.gold}}>{u.ganadores}</div>
            <div className="stat">{u.jugados}</div>
            <div className="pts">{u.puntos}</div>
          </div>
        ))}
      </div>

      {/* Resultados */}
      {resultados.length > 0 && (
        <div style={{marginTop:32}}>
          <div style={{fontSize:11,letterSpacing:3,textTransform:"uppercase",color:G.dim,marginBottom:12}}>
            Resultados cargados
          </div>
          <div className="tabla">
            {resultados.map(r => (
              <div key={r.id} style={{display:"grid",gridTemplateColumns:"60px 1fr auto 1fr 60px",padding:"12px 18px",borderBottom:`1px solid ${G.border}`,alignItems:"center",gap:8}}>
                <div style={{fontSize:11,color:G.dim,textAlign:"center"}}>
                  <div>Grp {r.grupo}</div>
                </div>
                <div style={{fontSize:13,fontWeight:500,textAlign:"right"}}>
                  {BANDERAS[r.equipo_local]||"🏳️"} {r.equipo_local}
                </div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:4,textAlign:"center",color:G.text,padding:"0 8px"}}>
                  {r.goles_local} — {r.goles_visitante}
                </div>
                <div style={{fontSize:13,fontWeight:500}}>
                  {r.equipo_visitante} {BANDERAS[r.equipo_visitante]||"🏳️"}
                </div>
                <div style={{fontSize:11,color:G.dim,textAlign:"center"}}>
                  {new Date(r.fecha).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Orden y nombres de display de las fases
const FASES_CONFIG = {
  grupos:         "Fase de Grupos",
  dieciseisavos:  "Dieciseisavos de Final",
  octavos:        "Octavos de Final",
  cuartos:        "Cuartos de Final",
  semifinal:      "Semifinal",
  tercer_lugar:   "Tercer Lugar",
  final:          "Final",
};
const FASES_ORDEN = Object.keys(FASES_CONFIG);

function FaseForm({ fase, partidosFase, miEnvio, currentUser, envios, onEnvioNuevo, setToast }) {
  const DKEY = `atinale_draft_${currentUser.id}_${fase}`;
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingEnvio, setViewingEnvio] = useState(null);
  const [draft, setDraft] = useState(() => { try { const d=localStorage.getItem(DKEY); return d?JSON.parse(d):{}; } catch { return {}; } });
  const [savedDraft] = useState(() => { try { return !!localStorage.getItem(DKEY); } catch { return false; } });
  const [showBanner, setShowBanner] = useState(savedDraft && !miEnvio);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const filled = partidosFase.filter(p => draft[p.id]?.gl!==undefined && draft[p.id]?.gv!==undefined).length;
  const allFilled = filled === partidosFase.length && partidosFase.length > 0;

  useEffect(() => { if (!miEnvio) { try { localStorage.setItem(DKEY, JSON.stringify(draft)); } catch {} } }, [draft]);

  const handleInput = (pid, side, val) => {
    const n = val===""?undefined:Math.max(0,Math.min(20,parseInt(val)||0));
    setDraft(p => ({...p,[pid]:{...p[pid],[side]:n}}));
  };
  const handleRandom = () => {
    const nd={};
    partidosFase.forEach(p => { const[gl,gv]=randomScore(); nd[p.id]={gl,gv}; });
    setDraft(nd); setToast("🎲 Pronósticos aleatorios generados");
  };
  const handleSend = async () => {
    setSending(true); setError(null);
    try {
      const pronosticosPayload = {};
      Object.entries(draft).forEach(([k,v]) => { pronosticosPayload[String(k)] = v; });
      const resp = await enviarPronosticos(fase, pronosticosPayload);
      const jsonStr = JSON.stringify(resp.json_correo, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atinale_${fase}_${currentUser.email.split("@")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      try { localStorage.removeItem(DKEY); } catch {}
      setShowConfirm(false);
      onEnvioNuevo();
      setToast(`🔒 Enviado · Hash: ${resp.hash.slice(0,14)}... · JSON descargado`);
    } catch(e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  if (viewingUser && viewingEnvio) {
    return (
      <PronViewer
        envio={viewingEnvio} user={viewingUser} partidos={partidosFase}
        onBack={() => {setViewingUser(null);setViewingEnvio(null);}}
        currentUserId={currentUser.id}
      />
    );
  }

  return (
    <>
      <div className="fcard">
        <div className="fhead">
          <div>
            <div className="ftitle">{FASES_CONFIG[fase]}</div>
            <div className="fdl">{partidosFase.length} partidos · Cierra antes del primer partido de la fase</div>
          </div>
          {miEnvio?<span className="stsent">✓ Enviado</span>:<span className="stopen">Abierto</span>}
        </div>
        <div className="fbody">
          {!miEnvio && (
            <>
              {showBanner && (
                <div className="draft-banner">
                  <span>📝 Borrador guardado — {filled}/{partidosFase.length} partidos</span>
                  <div className="dba">
                    <button className="btn-dc" onClick={() => setShowBanner(false)}>Continuar</button>
                    <button className="btn-dd" onClick={() => { try{localStorage.removeItem(DKEY)}catch{} setDraft({}); setShowBanner(false); }}>Descartar</button>
                  </div>
                </div>
              )}
              {error && <div className="error-msg">{error}</div>}
              <div className="prog-wrap"><div className="prog-bar" style={{width:`${partidosFase.length?((filled/partidosFase.length)*100):0}%`}}/></div>
              <div className="pfgrid">
                {partidosFase.map(p => {
                  const v=draft[p.id]||{};
                  const ok=v.gl!==undefined&&v.gv!==undefined;
                  return (
                    <div key={p.id} className={`pfrow${ok?" ok":""}`}>
                      <div className="elabel">
                        <span style={{fontSize:20}}>{BANDERAS[p.equipo_local]||"🏳️"}</span>
                        <div><div>{p.equipo_local}</div>{p.grupo&&<span className="grp">G{p.grupo}</span>}</div>
                      </div>
                      <input className="sinp" type="number" min="0" max="20" placeholder="0" value={v.gl??""} onChange={e=>handleInput(p.id,"gl",e.target.value)}/>
                      <div className="ssep">—</div>
                      <input className="sinp" type="number" min="0" max="20" placeholder="0" value={v.gv??""} onChange={e=>handleInput(p.id,"gv",e.target.value)}/>
                      <div className="elabel r">
                        <span style={{fontSize:20}}>{BANDERAS[p.equipo_visitante]||"🏳️"}</span>
                        <div style={{textAlign:"right"}}>{p.equipo_visitante}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="ffoot">
                <span className="fprog">{filled}/{partidosFase.length} completados</span>
                <button className="btn-rnd" onClick={handleRandom}>🎲 Al azar</button>
                <button className="btn-send" disabled={!allFilled} onClick={() => setShowConfirm(true)}>
                  {allFilled?"Revisar y enviar →":`Faltan ${partidosFase.length-filled}`}
                </button>
              </div>
            </>
          )}
          {miEnvio && <PronViewer envio={miEnvio} user={currentUser} partidos={partidosFase} onBack={null} currentUserId={currentUser.id}/>}
        </div>
      </div>

      {/* Pronósticos de todos para esta fase */}
      {envios.filter(e=>e.fase===fase).length > 0 && (
        <div style={{marginTop:8,marginBottom:16}}>
          <div style={{fontSize:11,letterSpacing:3,textTransform:"uppercase",color:G.dim,marginBottom:12}}>
            Pronósticos · {FASES_CONFIG[fase]}
          </div>
          {envios.filter(e=>e.fase===fase).map(e => (
            <div key={e.id} className="fcard" style={{cursor:"pointer"}}
              onClick={() => { setViewingUser({id:e.usuario_id, nombre:"Usuario", apellido:"", foto:"", ...e._usuario}); setViewingEnvio(e); }}>
              <div className="fhead">
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {e._usuario?.foto && <img src={e._usuario.foto} alt="" className="uav" onError={ev=>ev.target.style.display="none"}/>}
                  <div>
                    <div className="unm">{e._usuario?.nombre||"Usuario"} {e._usuario?.apellido||""}{e.usuario_id===currentUser.id?" (tú)":""}</div>
                    <div className="ehv" style={{fontSize:11,marginTop:2}}>{e.hash.slice(0,24)}...</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:G.green}}>{e.puntos}pts</div>
                  <span className="stsent">Ver →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showConfirm && <ConfirmModal draft={draft} partidos={partidosFase} onConfirm={handleSend} onCancel={() => setShowConfirm(false)} sending={sending}/>}
    </>
  );
}

function PronosPage({ currentUser, partidos, envios, onEnvioNuevo, setToast }) {
  // Fases que existen en DB (tienen partidos cargados)
  const fasesActivas = FASES_ORDEN.filter(fase =>
    partidos.some(p => p.fase === fase)
  );

  // Fases que aún no tienen partidos en DB
  const fasesBloqueadas = FASES_ORDEN.filter(fase =>
    !partidos.some(p => p.fase === fase)
  );

  return (
    <div className="main">
      <div className="ptitle">Pronósticos</div>
      <div className="psub">Llena cada fase completa antes de enviar · Inmutable una vez enviado</div>

      {/* Fases activas — tienen partidos en DB */}
      {fasesActivas.map(fase => {
        const partidosFase = partidos.filter(p => p.fase === fase);
        const miEnvio = envios.find(e => e.usuario_id===currentUser.id && e.fase===fase);
        return (
          <FaseForm
            key={fase}
            fase={fase}
            partidosFase={partidosFase}
            miEnvio={miEnvio}
            currentUser={currentUser}
            envios={envios}
            onEnvioNuevo={onEnvioNuevo}
            setToast={setToast}
          />
        );
      })}

      {/* Fases bloqueadas — no tienen partidos aún */}
      {fasesBloqueadas.map(fase => (
        <div key={fase} className="fcard" style={{opacity:0.4}}>
          <div className="fhead">
            <div>
              <div className="ftitle">{FASES_CONFIG[fase]}</div>
              <div className="fdl">Se habilita al conocerse los clasificados</div>
            </div>
            <span className="stlock">🔒 Bloqueado</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoPage({ envios }) {
  const [dragOver, setDragOver] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  function canonicalStringify(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return JSON.stringify(obj);
    }
    const keys = Object.keys(obj).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    const pairs = keys.map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
    return `{${pairs.join(',')}}`;
  }

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".json")) { setResult({type:"warn",msg:"El archivo debe ser un .json"}); return; }
    setVerifying(true); setResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const { hash: hashEnArchivo, ...sinHash } = data;
      const pronosticosOrdenados = Object.fromEntries(Object.entries(sinHash.pronosticos||{}).sort(([a],[b])=>a < b ? -1 : a > b ? 1 : 0));
      const canonical = canonicalStringify({...sinHash, pronosticos: pronosticosOrdenados});
      const hashRecalculado = await sha256(canonical);
      const envioServer = envios.find(e => e.fase===sinHash.fase && e._usuario?.email===sinHash.usuario);
      const hashServer = envioServer?.hash;
      setTimeout(() => {
        setVerifying(false);
        if (!hashEnArchivo) { setResult({type:"warn",msg:"El archivo no contiene campo hash."}); return; }
        if (!hashServer) { setResult({type:"warn",msg:"No se encontró un envío para este usuario y fase en el servidor."}); return; }
        const archivoOk = hashRecalculado===hashEnArchivo;
        const serverOk = hashEnArchivo===hashServer;
        if (archivoOk&&serverOk) setResult({type:"ok",hashRecalculado,hashArchivo:hashEnArchivo,hashServer,usuario:sinHash.usuario});
        else setResult({type:"fail",hashRecalculado,hashArchivo:hashEnArchivo,hashServer,archivoOk,serverOk,usuario:sinHash.usuario});
      }, 600);
    } catch { setVerifying(false); setResult({type:"warn",msg:"No se pudo leer el archivo. Usa el JSON original sin modificar."}); }
  };

  return (
    <div className="main">
      <div className="ptitle">Info & Verificar</div>
      <div className="psub">Transparencia total · Cualquier participante puede verificar cualquier documento</div>
      <div className="info-grid">
        <div className="icard">
          <div className="icard-title">Métrica de puntuación · Fija e inmutable</div>
          <div className="metric-row"><span className="metric-label">Resultado exacto</span><span className="metric-val green">+{METRICA.pts_exacto}</span></div>
          <div className="metric-row"><span className="metric-label">Ganador / Empate correcto</span><span className="metric-val gold">+{METRICA.pts_ganador}</span></div>
          <div className="metric-row"><span className="metric-label">Pronóstico fallido</span><span className="metric-val red">+{METRICA.pts_fallo}</span></div>
        </div>
        <div className="icard">
          <div className="icard-title">Cómo funciona la integridad</div>
          <div style={{fontSize:12,color:G.muted,lineHeight:1.7}}>
            <p style={{marginBottom:8}}>Al enviar, el servidor genera un <strong style={{color:G.text}}>hash SHA-256</strong> del JSON y lo manda a tu correo.</p>
            <p style={{marginBottom:8}}>Si alguien modifica el pronóstico en el servidor, <strong style={{color:G.text}}>el hash no coincidirá</strong>.</p>
            <p>Carga tu JSON aquí para verificar que nadie manipuló tu documento.</p>
          </div>
        </div>
      </div>

      <div style={{fontSize:11,letterSpacing:3,textTransform:"uppercase",color:G.dim,marginBottom:12}}>Registro público de hashes</div>
      <div className="hash-table">
        <div className="hash-row hh"><span>Participante · Fase</span><span>Hash SHA-256</span><span>Enviado</span></div>
        {envios.map(e => (
          <div key={e.id} className="hash-row">
            <div style={{fontSize:13}}>{e._usuario?.nombre||"?"} {e._usuario?.apellido||""} · {e.fase}</div>
            <div className="hash-val">{e.hash}</div>
            <div className="hash-ts">{new Date(e.enviado_en).toLocaleDateString("es-MX")}</div>
          </div>
        ))}
      </div>

      <div className="verif-box">
        <div className="verif-head">
          <div><div className="verif-title">Verificador de Integridad</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>Carga el JSON que recibiste por correo sin modificarlo</div></div>
          {verifying && <div style={{fontSize:12,color:G.green}}>⟳ Verificando...</div>}
        </div>
        <div className="verif-body">
          {!result && (
            <div className={`drop-zone${dragOver?" drag":""}`}
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}}>
              <div className="drop-icon">📄</div>
              <div className="drop-text">Arrastra tu JSON aquí o haz clic para seleccionarlo</div>
              <div className="drop-sub">atinale_grupos_tuusuario.json · Se procesa en tu navegador, no se sube al servidor</div>
              <input className="drop-input" type="file" accept=".json" onChange={e=>handleFile(e.target.files[0])}/>
            </div>
          )}
          {result?.type==="ok" && (
            <div className="result-ok">
              <div className="result-title">✓ Documento íntegro</div>
              <div className="result-detail">Los tres hashes coinciden. Nadie ha modificado el pronóstico de <strong>{result.usuario}</strong>.</div>
              <div className="hash-compare">
                <div className="hc-row"><span className="hc-label">Recalculado</span><span className="hc-val match">{result.hashRecalculado}</span></div>
                <div className="hc-row"><span className="hc-label">En tu archivo</span><span className="hc-val match">{result.hashArchivo}</span></div>
                <div className="hc-row"><span className="hc-label">En el servidor</span><span className="hc-val match">{result.hashServer}</span></div>
              </div>
              <button className="btn-reset" onClick={()=>setResult(null)}>Verificar otro archivo</button>
            </div>
          )}
          {result?.type==="fail" && (
            <div className="result-fail">
              <div className="result-title">⚠️ Discrepancia detectada</div>
              <div className="result-detail">
                {!result.archivoOk && <p>El archivo fue modificado: el hash recalculado no coincide.</p>}
                {result.archivoOk && !result.serverOk && <p>El archivo es íntegro pero el servidor tiene un hash diferente: posible manipulación del servidor.</p>}
              </div>
              <div className="hash-compare">
                <div className="hc-row"><span className="hc-label">Recalculado</span><span className={`hc-val ${result.archivoOk?"match":"nomatch"}`}>{result.hashRecalculado}</span></div>
                <div className="hc-row"><span className="hc-label">En tu archivo</span><span className={`hc-val ${result.serverOk?"match":"nomatch"}`}>{result.hashArchivo}</span></div>
                <div className="hc-row"><span className="hc-label">En el servidor</span><span className="hc-val">{result.hashServer||"No encontrado"}</span></div>
              </div>
              <button className="btn-reset" onClick={()=>setResult(null)}>Intentar con otro archivo</button>
            </div>
          )}
          {result?.type==="warn" && (
            <div className="result-warn">
              <div className="result-title">Aviso</div>
              <div className="result-detail">{result.msg}</div>
              <button className="btn-reset" onClick={()=>setResult(null)}>Intentar de nuevo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [tab, setTab] = useState("pronos");
  const [tabla, setTabla] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [toast, setToast] = useState(null);
  const [resultados, setResultados] = useState([]); 

  // Al cargar, verificar si hay sesión activa
  useEffect(() => {
    getMe().then(u => { if (u) { setUser(u); cargarDatos(); } });
  }, []);

  const cargarDatos = async () => {
    try {
      const [tablaData, partidosData, enviosData, resultadosData] = await Promise.all([
        getTabla(), getPartidos(), getTodosEnvios(), getResultados(),
      ]);
      setTabla(tablaData);
      setPartidos(partidosData);
      setResultados(resultadosData);
      const enviosEnriquecidos = enviosData.map(e => ({
        ...e,
        _usuario: tablaData.find(u => u.id === e.usuario_id),
      }));
      setEnvios(enviosEnriquecidos);
    } catch(e) {
      console.error("Error cargando datos:", e);
    }
  };

  const handleLogin = async (googleToken) => {
    setLoginLoading(true); setLoginError(null);
    try {
      const data = await loginConGoogle(googleToken);
      setUser(data.usuario);
      if (data.es_nuevo) { setIsNewUser(true); }
      else { await cargarDatos(); setTab("pronos"); }
    } catch(e) {
      setLoginError(e.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleConfirmRegister = async () => {
    setIsNewUser(false);
    await cargarDatos();
    setTab("pronos");
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setTabla(null);
    setPartidos([]);
    setEnvios([]);
  };

  const tabs = [
    {id:"tabla",  label:"Tabla",         icon:"🏆"},
    {id:"pronos", label:"Pronósticos",   icon:"⚽"},
    {id:"info",   label:"Info & Verificar", icon:"🔍"},
  ];

  if (!user) return <><style>{css}</style><LandingPage onLogin={handleLogin} loading={loginLoading} error={loginError}/></>;
  if (isNewUser) return <><style>{css}</style><NewUserPage user={user} onConfirm={handleConfirmRegister} loading={false}/></>;

  return (
    <>
      <style>{css}</style>
      <div style={{minHeight:"100vh"}}>
        <nav className="nav">
          <div className="nav-logo">ATÍNALE</div>
          <div className="nav-tabs">
            {tabs.map(t => <button key={t.id} className={`ntab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.icon} {t.label}</button>)}
          </div>
          <div className="nav-right">
            <img src={user.foto} alt="" className="nav-av" onError={e=>e.target.style.display="none"}/>
            <span className="nav-nm">{user.nombre}</span>
            <button className="btn-out" onClick={handleLogout}>Salir</button>
          </div>
        </nav>

        {tab==="tabla" && <TablaPage tabla={tabla} currentUser={user} resultados={resultados} onVerPron={(u) => { setTab("pronos"); }}/>}
        {tab==="pronos" && <PronosPage currentUser={user} partidos={partidos} envios={envios} onEnvioNuevo={cargarDatos} setToast={setToast}/>}
        {tab==="info" && <InfoPage envios={envios}/>}

        <div className="mtabs">
          {tabs.map(t => <button key={t.id} className={`mtab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}><span style={{fontSize:18}}>{t.icon}</span>{t.label}</button>)}
        </div>

        {toast && <Toast msg={toast} onDone={()=>setToast(null)}/>}
      </div>
    </>
  );
}