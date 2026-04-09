import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Landing Page — "REFINED BRUTALIST"
 * Structure: Hero → Feature Preview (Blok M live map) → About Creator
 * Colors: rich cream · deep indigo · warm amber · coffee-dark
 */
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (user) navigate('/map');
  }, [user, navigate]);

  const tabs = [
    { icon: '🗺️', label: 'Map View',   desc: 'Find cafes around you' },
    { icon: '⭐', label: 'Ratings',     desc: 'Check before you go' },
    { icon: '❤️', label: 'Favorites',   desc: 'Your go-to circuit' },
    { icon: '🔍', label: 'Search',      desc: 'By name or area' },
  ];

  return (
    <div className="lp6">
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      {/* ── NAV ── */}
      <nav className="lp6-nav">
        <div className="lp6-nav-logo">
          <img src="/logo192.png" alt="Can-It-WFC" width="36" height="36" />
          <span>CAN-IT-WFC</span>
        </div>
        <div className="lp6-nav-actions">
          <button className="lp6-btn-ghost" onClick={() => navigate('/auth')}>Log In</button>
          <button className="lp6-btn-primary" onClick={() => navigate('/auth')}>Sign Up</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp6-hero">
        <div className="lp6-hero-badge">FOR REMOTE WORKERS</div>
        <h1 className="lp6-hero-title">
          <span className="lp6-line1">STOP</span>
          <span className="lp6-line2">GUESSING.</span>
          <span className="lp6-line3">START <span className="lp6-hl">WORKING.</span></span>
        </h1>
        <p className="lp6-hero-sub">
          Find cafes rated by remote workers, for remote workers.<br />
          WiFi speed · Power outlets · Noise level · All verified.
        </p>
        <div className="lp6-hero-ctas">
          <button className="lp6-btn-hero" onClick={() => navigate('/auth')}>JOIN THE COMMUNITY</button>
          <button className="lp6-btn-hero-alt" onClick={() => navigate('/auth')}>I HAVE AN ACCOUNT</button>
        </div>
        <div className="lp6-deco" aria-hidden="true">
          <div className="lp6-deco-circle" />
          <div className="lp6-deco-square" />
          <div className="lp6-deco-tri" />
        </div>
      </section>

      {/* ── FEATURE PREVIEW ── */}
      <section className="lp6-features">
        <div className="lp6-section-hdr">
          <span className="lp6-tag">FEATURES</span>
          <h2>SEE WHAT YOU GET</h2>
        </div>

        <div className="lp6-preview-layout">
          {/* tabs */}
          <div className="lp6-tabs">
            {tabs.map((t, i) => (
              <button
                key={i}
                className={`lp6-tab ${activeTab === i ? 'active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                <span className="lp6-tab-icon">{t.icon}</span>
                <span className="lp6-tab-text">
                  <span className="lp6-tab-label">{t.label}</span>
                  <span className="lp6-tab-desc">{t.desc}</span>
                </span>
                {activeTab === i && <span className="lp6-tab-arrow">›</span>}
              </button>
            ))}
          </div>

          {/* app-frame */}
          <div className="lp6-appframe">
            <div className="lp6-appbar">
              <span className="lp6-dot-r" /><span className="lp6-dot-y" /><span className="lp6-dot-g" />
              <span className="lp6-appbar-url">can-it-wfc.app/map</span>
            </div>
            <div className="lp6-appbody" key={activeTab}>
              {activeTab === 0 && <BlokMMap />}
              {activeTab === 1 && <RatingsMock />}
              {activeTab === 2 && <FavoritesMock />}
              {activeTab === 3 && <SearchMock />}
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT CREATOR ── */}
      <section className="lp6-about">
        <div className="lp6-about-card">
          {/* CSS coffee mug from /2 */}
          <div className="lp6-mug" aria-hidden="true">
            <span className="lp6-mug-body" />
            <span className="lp6-mug-handle" />
            <span className="lp6-mug-steam lp6-ms1" />
            <span className="lp6-mug-steam lp6-ms2" />
            <span className="lp6-mug-steam lp6-ms3" />
          </div>
          <h3>Built by a Fellow Remote Worker</h3>
          <p>
            Tired of showing up to cafes with dead WiFi and zero outlets,
            I built Can-It-WFC so no one else has to guess.
            If this saved your workday — consider fueling the next feature.
          </p>
          <a
            href="https://buymeacoffee.com/nazhifkojaz"
            target="_blank"
            rel="noopener noreferrer"
            className="lp6-bmc"
          >
            ☕&nbsp; Buy Me a Coffee
          </a>
        </div>
      </section>

      <footer className="lp6-footer">
        <span>© {new Date().getFullYear()} Can-It-WFC</span>
      </footer>

      <style>{`
/* ─── BASE ─────────────────────────────────────────── */
.lp6{
  --f-d:'Archivo Black',sans-serif;
  --f-b:'Space Mono',monospace;
  --cream:#FEF8EC;
  --cream2:#FFF4D9;
  --indigo:#6D28D9;
  --amber:#D97706;
  --black:#0F0D0B;
  --green:#10B981;
  --blue:#3B82F6;
  --gray:#9CA3AF;
  min-height:100vh;
  background:var(--cream);
  overflow-x:hidden;
  color:var(--black);
}
.lp6 *{box-sizing:border-box;margin:0;padding:0}

/* ─── NAV ───────────────────────────────────────────── */
.lp6-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 28px;border-bottom:3px solid var(--black);background:var(--cream);position:sticky;top:0;z-index:100}
.lp6-nav-logo{display:flex;align-items:center;gap:10px;font-family:var(--f-d);font-size:17px;letter-spacing:2px}
.lp6-nav-logo img{border:2px solid var(--black);border-radius:50%}
.lp6-nav-actions{display:flex;gap:10px}

.lp6-btn-ghost{font-family:var(--f-b);font-size:12px;font-weight:700;padding:10px 18px;background:transparent;border:2.5px solid var(--black);border-radius:4px;cursor:pointer;text-transform:uppercase;letter-spacing:1px;transition:.1s}
.lp6-btn-ghost:hover{background:var(--black);color:var(--cream);transform:translate(-2px,-2px);box-shadow:4px 4px 0 var(--black)}
.lp6-btn-primary{font-family:var(--f-b);font-size:12px;font-weight:700;padding:10px 18px;background:var(--indigo);color:#fff;border:2.5px solid var(--black);border-radius:4px;cursor:pointer;text-transform:uppercase;letter-spacing:1px;box-shadow:3px 3px 0 var(--black);transition:.1s}
.lp6-btn-primary:hover{transform:translate(-2px,-2px);box-shadow:5px 5px 0 var(--black)}

/* ─── HERO ──────────────────────────────────────────── */
.lp6-hero{padding:72px 28px 56px;text-align:center;position:relative;overflow:hidden}
.lp6-hero-badge{display:inline-block;font-family:var(--f-b);font-size:11px;font-weight:700;padding:6px 18px;background:var(--amber);border:2.5px solid var(--black);border-radius:4px;box-shadow:3px 3px 0 var(--black);text-transform:uppercase;letter-spacing:2px;margin-bottom:28px;animation:lp6-dn .6s ease-out}
.lp6-hero-title{font-family:var(--f-d);line-height:1;animation:lp6-up .8s ease-out}
.lp6-line1,.lp6-line2,.lp6-line3{display:block}
.lp6-line1,.lp6-line2{font-size:clamp(52px,12vw,112px);letter-spacing:-2px}
.lp6-line3{font-size:clamp(36px,8vw,76px);margin-top:6px}
.lp6-hl{color:var(--indigo);position:relative}
.lp6-hl::after{content:'';position:absolute;bottom:2px;left:0;right:0;height:9px;background:var(--amber);z-index:-1;transform:skewX(-4deg);opacity:.85}
.lp6-hero-sub{font-family:var(--f-b);font-size:clamp(13px,1.8vw,16px);color:#4B4540;margin:28px auto;max-width:520px;line-height:1.9}
.lp6-hero-ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:36px}
.lp6-btn-hero{font-family:var(--f-d);font-size:15px;padding:16px 34px;background:var(--indigo);color:#fff;border:2.5px solid var(--black);border-radius:4px;box-shadow:5px 5px 0 var(--black);cursor:pointer;letter-spacing:1px;transition:.1s}
.lp6-btn-hero:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--black);background:#5B21B6}
.lp6-btn-hero:active{transform:translate(2px,2px);box-shadow:3px 3px 0 var(--black)}
.lp6-btn-hero-alt{font-family:var(--f-b);font-size:13px;font-weight:700;padding:16px 34px;background:var(--cream);border:2.5px solid var(--black);border-radius:4px;box-shadow:5px 5px 0 var(--black);cursor:pointer;text-transform:uppercase;letter-spacing:1px;transition:.1s}
.lp6-btn-hero-alt:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--black)}

.lp6-deco{position:absolute;inset:0;pointer-events:none;z-index:-1}
.lp6-deco-circle{position:absolute;top:8%;right:5%;width:110px;height:110px;border:4px solid var(--indigo);border-radius:50%;opacity:.2;animation:lp6-float 6s ease-in-out infinite}
.lp6-deco-square{position:absolute;bottom:12%;left:6%;width:70px;height:70px;border:4px solid var(--amber);transform:rotate(15deg);opacity:.2;animation:lp6-float 8s ease-in-out infinite reverse}
.lp6-deco-tri{position:absolute;top:28%;left:4%;width:0;height:0;border-left:36px solid transparent;border-right:36px solid transparent;border-bottom:64px solid rgba(16,185,129,.12);animation:lp6-float 7s ease-in-out infinite}

/* ─── FEATURES SECTION ──────────────────────────────── */
.lp6-features{padding:72px 28px;background:#fff;border-top:3px solid var(--black);border-bottom:3px solid var(--black)}
.lp6-section-hdr{text-align:center;margin-bottom:48px}
.lp6-tag{display:inline-block;font-family:var(--f-b);font-size:11px;font-weight:700;padding:4px 14px;background:var(--black);color:var(--amber);border-radius:4px;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px}
.lp6-section-hdr h2{font-family:var(--f-d);font-size:clamp(26px,5vw,44px)}

.lp6-preview-layout{display:flex;gap:0;max-width:980px;margin:0 auto;border:3px solid var(--black);border-radius:6px;overflow:hidden;box-shadow:8px 8px 0 var(--black)}

/* TABS */
.lp6-tabs{display:flex;flex-direction:column;background:var(--cream2);border-right:3px solid var(--black);min-width:190px;flex-shrink:0}
.lp6-tab{display:flex;align-items:center;gap:12px;padding:20px 18px;background:transparent;border:none;border-bottom:2px solid var(--black);cursor:pointer;transition:.15s;text-align:left;position:relative}
.lp6-tab:last-child{border-bottom:none}
.lp6-tab:hover{background:rgba(255,255,255,.5)}
.lp6-tab.active{background:var(--indigo);color:#fff}
.lp6-tab-icon{font-size:20px;flex-shrink:0}
.lp6-tab-text{display:flex;flex-direction:column;gap:2px}
.lp6-tab-label{font-family:var(--f-d);font-size:13px;text-transform:uppercase;letter-spacing:.5px;display:block}
.lp6-tab-desc{font-family:var(--f-b);font-size:10px;opacity:.65;display:block;text-transform:none;letter-spacing:0;line-height:1.4}
.lp6-tab.active .lp6-tab-desc{opacity:.75}
.lp6-tab-arrow{position:absolute;right:14px;font-size:20px;font-family:var(--f-d);color:#fff;line-height:1}

/* APP FRAME */
.lp6-appframe{flex:1;display:flex;flex-direction:column;min-width:0}
.lp6-appbar{display:flex;align-items:center;gap:7px;padding:10px 14px;background:var(--cream);border-bottom:2px solid var(--black)}
.lp6-dot-r,.lp6-dot-y,.lp6-dot-g{width:11px;height:11px;border-radius:50%;border:2px solid var(--black);flex-shrink:0}
.lp6-dot-r{background:#EF4444}.lp6-dot-y{background:var(--amber)}.lp6-dot-g{background:var(--green)}
.lp6-appbar-url{margin-left:10px;font-family:var(--f-b);font-size:11px;color:#6B7280;background:#F3F4F6;padding:3px 10px;border-radius:3px;border:1px solid #D1D5DB}
.lp6-appbody{flex:1;position:relative;min-height:380px;overflow:hidden;animation:lp6-fadein .3s ease}

/* ─── MOCK MAP — BLOK M, JAKARTA ───────────────────── */
.m6-map{position:absolute;inset:0;background:#EAE4D5;overflow:hidden;font-family:var(--f-b)}

/* Land blocks / building footprints */
.m6-block{position:absolute;background:#D5CFC0;border-radius:2px}
.m6-block-lg{background:#CCC6B4}

/* Park areas */
.m6-park{position:absolute;background:rgba(168,208,138,.55);border-radius:4px}

/* Roads */
.m6-road{position:absolute;background:#fff}
.m6-road.major{background:#FFF8F0}
.m6-road-lbl{position:absolute;font-size:8px;font-weight:700;color:#9A8A7A;white-space:nowrap;letter-spacing:.2px;text-transform:uppercase;pointer-events:none}

/* Cafe SVG-style pin */
.m6-pin{position:absolute;z-index:3;display:flex;flex-direction:column;align-items:center;cursor:default;animation:lp6-dropin .4s ease-out both}
.m6-pin-marker{width:26px;height:36px;position:relative;filter:drop-shadow(0 3px 4px rgba(0,0,0,.25))}
.m6-pin-marker svg{width:100%;height:100%}
.m6-pin-lbl{margin-top:2px;font-size:9px;font-weight:700;background:#fff;padding:2px 6px;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.15);white-space:nowrap;border:1px solid rgba(0,0,0,.08);color:var(--black)}

/* User location dot */
.m6-user{position:absolute;z-index:4;transform:translate(-50%,-50%)}
.m6-user-ring{width:32px;height:32px;border-radius:50%;background:rgba(59,130,246,.12);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);animation:lp6-ring 2s ease-in-out infinite}
.m6-user-dot{width:14px;height:14px;background:#3B82F6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(59,130,246,.4);position:relative;z-index:1}

/* Selected cafe popup */
.m6-popup{position:absolute;top:14px;left:14px;background:#fff;border:2.5px solid var(--black);border-radius:5px;padding:12px 14px;box-shadow:4px 4px 0 var(--black);z-index:10;width:210px;animation:lp6-popin .35s ease}
.m6-popup-name{font-family:var(--f-d);font-size:13px;text-transform:uppercase;margin-bottom:2px}
.m6-popup-loc{font-size:9px;color:#6B7280;margin-bottom:8px;line-height:1.4}
.m6-popup-row{display:flex;align-items:center;gap:7px;margin-bottom:5px}
.m6-popup-row:last-child{margin-bottom:0}
.m6-popup-row-icon{font-size:12px;width:16px;text-align:center}
.m6-popup-bar{flex:1;height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden}
.m6-popup-bar-fill{height:100%;border-radius:4px}
.m6-popup-val{font-size:10px;font-weight:700;width:24px;text-align:right;color:var(--black)}

/* Search bar overlay */
.m6-search-bar{position:absolute;top:14px;right:14px;display:flex;align-items:center;gap:7px;background:#fff;border:2px solid var(--black);border-radius:5px;padding:8px 12px;box-shadow:3px 3px 0 var(--black);z-index:9;max-width:calc(100% - 240px)}
.m6-search-bar-icon{font-size:13px}
.m6-search-bar-text{font-family:var(--f-b);font-size:11px;color:#4B5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Map controls */
.m6-ctrl{position:absolute;bottom:50px;right:14px;display:flex;flex-direction:column;gap:4px;z-index:9}
.m6-ctrl-btn{width:28px;height:28px;background:#fff;border:2px solid var(--black);border-radius:4px;font-family:var(--f-d);font-size:16px;line-height:1;cursor:default;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 var(--black);color:var(--black)}

/* Search this area */
.m6-srcharea{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-family:var(--f-b);font-size:11px;font-weight:700;padding:7px 18px;background:#fff;border:2px solid var(--black);border-radius:20px;box-shadow:3px 3px 0 var(--black);white-space:nowrap;text-transform:uppercase;letter-spacing:.5px;z-index:9}

/* ─── RATINGS MOCK ──────────────────────────────────── */
.m6-ratings{padding:0;display:flex;flex-direction:column;height:100%;background:#fff;animation:lp6-fadein .3s ease}
.m6-ratings-photo{height:120px;background:linear-gradient(135deg,#E5DEFF 0%,#C4B5FD 100%);display:flex;align-items:center;justify-content:center;border-bottom:2px solid #E5E7EB}
.m6-ratings-photo-label{font-family:var(--f-b);font-size:11px;color:#8B5CF6;opacity:.7;text-transform:uppercase;letter-spacing:1px}
.m6-ratings-body{padding:18px 20px;flex:1;overflow:hidden}
.m6-ratings-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px}
.m6-ratings-name{font-family:var(--f-d);font-size:16px;text-transform:uppercase;line-height:1.2}
.m6-ratings-heart{font-size:18px;cursor:default}
.m6-ratings-meta{font-family:var(--f-b);font-size:11px;color:#6B7280;margin-bottom:14px}
.m6-ratings-actions{display:flex;gap:8px;margin-bottom:18px}
.m6-action-btn{font-family:var(--f-b);font-size:11px;font-weight:700;padding:8px 14px;border:2px solid var(--black);border-radius:4px;cursor:default;text-transform:uppercase;letter-spacing:.5px}
.m6-action-primary{background:var(--indigo);color:#fff;box-shadow:2px 2px 0 var(--black)}
.m6-action-secondary{background:#fff;box-shadow:2px 2px 0 var(--black)}
.m6-ratings-divider{font-family:var(--f-b);font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;border-top:1px solid #E5E7EB;padding-top:12px}
.m6-rrow{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.m6-rrow:last-child{margin-bottom:0}
.m6-rrow-icon{font-size:14px;width:18px;text-align:center}
.m6-rrow-lbl{font-family:var(--f-b);font-size:11px;font-weight:700;width:60px;text-transform:uppercase;letter-spacing:.3px}
.m6-rrow-bar{flex:1;height:10px;background:#F3F4F6;border-radius:5px;overflow:hidden;border:1.5px solid #E5E7EB}
.m6-rrow-fill{height:100%;border-radius:5px}
.m6-rrow-val{font-family:var(--f-b);font-size:11px;font-weight:700;width:24px;text-align:right}

/* ─── FAVORITES MOCK ────────────────────────────────── */
.m6-favs{display:flex;flex-direction:column;height:100%;background:#fff;animation:lp6-fadein .3s ease}
.m6-favs-hdr{display:flex;align-items:center;gap:8px;padding:16px 20px;border-bottom:2px solid #E5E7EB}
.m6-favs-hdr-icon{font-size:16px}
.m6-favs-hdr-title{font-family:var(--f-d);font-size:15px;text-transform:uppercase;letter-spacing:.5px}
.m6-fav{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid #F3F4F6;transition:.15s;cursor:default}
.m6-fav:hover{background:#FAFAFA}
.m6-fav-thumb{width:44px;height:44px;border-radius:6px;background:var(--cream2);border:2px solid var(--black);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;box-shadow:2px 2px 0 var(--black)}
.m6-fav-info{flex:1;min-width:0}
.m6-fav-name{font-family:var(--f-d);font-size:13px;text-transform:uppercase;display:block;margin-bottom:2px}
.m6-fav-meta{font-family:var(--f-b);font-size:10px;color:#6B7280;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m6-fav-rating{font-family:var(--f-b);font-size:11px;font-weight:700;color:var(--amber);flex-shrink:0}

/* ─── SEARCH MOCK ───────────────────────────────────── */
.m6-search{display:flex;flex-direction:column;height:100%;background:#fff;animation:lp6-fadein .3s ease}
.m6-search-hdr{padding:16px 20px;border-bottom:2px solid #E5E7EB}
.m6-search-input-wrap{display:flex;align-items:center;gap:10px;background:var(--cream2);border:2.5px solid var(--black);border-radius:5px;padding:10px 14px;box-shadow:3px 3px 0 var(--black)}
.m6-search-input-icon{font-size:16px}
.m6-search-input-text{font-family:var(--f-b);font-size:13px;color:#9CA3AF}
.m6-search-input-cursor{width:2px;height:14px;background:var(--indigo);animation:lp6-blink .8s infinite}
.m6-search-results-hdr{padding:12px 20px 6px;font-family:var(--f-b);font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px}
.m6-sres{display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid #F3F4F6;cursor:default;transition:.15s}
.m6-sres:hover{background:#FAFAFA}
.m6-sres-pin{font-size:20px;flex-shrink:0}
.m6-sres-info{flex:1;min-width:0}
.m6-sres-name{font-family:var(--f-d);font-size:13px;text-transform:uppercase;display:block;margin-bottom:2px}
.m6-sres-detail{font-family:var(--f-b);font-size:10px;color:#6B7280;display:block}
.m6-sres-badge{font-family:var(--f-b);font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px;flex-shrink:0}
.m6-sres-badge.green{background:#D1FAE5;color:#065F46}
.m6-sres-badge.blue{background:#DBEAFE;color:#1E40AF}
.m6-sres-badge.gray{background:#F3F4F6;color:#4B5563}

/* ─── ABOUT CREATOR ─────────────────────────────────── */
.lp6-about{padding:72px 28px;background:var(--cream);border-bottom:3px solid var(--black)}
.lp6-about-card{max-width:560px;margin:0 auto;text-align:center;background:#fff;border:3px solid var(--black);border-radius:6px;padding:44px 36px;box-shadow:8px 8px 0 var(--indigo)}

/* CSS COFFEE MUG */
.lp6-mug{position:relative;width:76px;height:68px;margin:0 auto 24px}
.lp6-mug-body{position:absolute;bottom:0;left:10px;width:48px;height:44px;background:var(--amber);border:3px solid var(--black);border-radius:0 0 12px 12px;box-shadow:3px 3px 0 var(--black);display:block}
.lp6-mug-handle{position:absolute;bottom:10px;right:4px;width:20px;height:26px;border:3px solid var(--black);border-left:none;border-radius:0 10px 10px 0;display:block}
.lp6-mug-steam{position:absolute;top:0;width:4px;border-radius:3px;display:block;animation:lp6-steam 2s ease-in-out infinite}
.lp6-ms1{left:20px;height:20px;background:var(--indigo);animation-delay:0s}
.lp6-ms2{left:32px;height:16px;background:var(--indigo);animation-delay:.35s}
.lp6-ms3{left:44px;height:22px;background:var(--indigo);animation-delay:.7s}

.lp6-about-card h3{font-family:var(--f-d);font-size:20px;text-transform:uppercase;margin-bottom:12px}
.lp6-about-card p{font-family:var(--f-b);font-size:13px;color:#4B5563;line-height:1.8;margin-bottom:26px}
.lp6-bmc{display:inline-block;font-family:var(--f-d);font-size:14px;padding:14px 30px;background:#FFDD00;color:var(--black);border:3px solid var(--black);border-radius:4px;box-shadow:5px 5px 0 var(--black);text-decoration:none;transition:.1s;letter-spacing:.5px}
.lp6-bmc:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--black)}

/* ─── FOOTER ────────────────────────────────────────── */
.lp6-footer{padding:20px 28px;text-align:center;font-family:var(--f-b);font-size:12px;color:#6B7280;border-top:3px solid var(--black)}

/* ─── ANIMATIONS ────────────────────────────────────── */
@keyframes lp6-dn{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
@keyframes lp6-up{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
@keyframes lp6-fadein{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
@keyframes lp6-float{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-18px) rotate(5deg)}}
@keyframes lp6-dropin{from{opacity:0;transform:translateY(-14px) scale(.75)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes lp6-popin{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
@keyframes lp6-steam{0%{opacity:0;transform:translateY(0) scaleY(.5)}50%{opacity:.75;transform:translateY(-14px) scaleY(1)}100%{opacity:0;transform:translateY(-30px) scaleY(.5)}}
@keyframes lp6-blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes lp6-ring{0%{transform:translate(-50%,-50%) scale(1);opacity:.25}100%{transform:translate(-50%,-50%) scale(2.5);opacity:0}}

/* ─── MOBILE ────────────────────────────────────────── */
@media(max-width:760px){
  .lp6-hero{padding:48px 20px 40px}
  .lp6-hero-ctas{flex-direction:column;align-items:center}
  .lp6-btn-hero,.lp6-btn-hero-alt{width:100%;max-width:300px}
  .lp6-preview-layout{flex-direction:column}
  .lp6-tabs{flex-direction:row;min-width:0;border-right:none;border-bottom:3px solid var(--black);overflow-x:auto}
  .lp6-tab{border-bottom:none;border-right:2px solid var(--black);padding:14px 16px;min-width:120px}
  .lp6-tab:last-child{border-right:none}
  .lp6-tab-arrow{display:none}
  .lp6-tab-desc{display:none}
  .lp6-appbody{min-height:320px}
  .lp6-deco-circle,.lp6-deco-square,.lp6-deco-tri{display:none}
  .m6-search-bar{max-width:50%;font-size:10px}
}
      `}</style>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   BLOK M, JAKARTA — MAP MOCK
   Real streets: Jl. Melawai Raya, Jl. Falatehan,
   Jl. Panglima Polim, Jl. Sisingamangaraja
   Real cafes: Common Grounds, Kopi Kenangan,
   Fore Coffee, Anomali, Yellow Truck, Starbucks
══════════════════════════════════════════════════════ */
const BlokMMap: React.FC = () => (
  <div className="m6-map">

    {/* Building blocks / land fill */}
    <div className="m6-block" style={{ top:'3%',  left:'0',   width:'25%', height:'22%' }} />
    <div className="m6-block" style={{ top:'3%',  left:'32%', width:'28%', height:'18%' }} />
    <div className="m6-block m6-block-lg" style={{ top:'3%', left:'74%', width:'26%', height:'23%' }} />
    <div className="m6-block" style={{ top:'32%', left:'0',   width:'20%', height:'14%' }} />
    <div className="m6-block" style={{ top:'35%', left:'32%', width:'17%', height:'10%' }} />
    <div className="m6-block" style={{ top:'35%', left:'55%', width:'14%', height:'10%' }} />
    <div className="m6-block m6-block-lg" style={{ top:'35%', left:'76%', width:'24%', height:'11%' }} />
    <div className="m6-block" style={{ top:'60%', left:'0',   width:'22%', height:'16%' }} />
    <div className="m6-block" style={{ top:'60%', left:'54%', width:'18%', height:'15%' }} />
    <div className="m6-block m6-block-lg" style={{ top:'62%', left:'76%', width:'24%', height:'20%' }} />
    <div className="m6-block" style={{ top:'80%', left:'24%', width:'22%', height:'18%' }} />
    <div className="m6-block" style={{ top:'80%', left:'54%', width:'18%', height:'18%' }} />

    {/* Parks / green median */}
    <div className="m6-park" style={{ top:'30%', left:'22%', width:'8%',  height:'5%' }} />
    <div className="m6-park" style={{ top:'58%', left:'24%', width:'26%', height:'4%' }} />
    <div className="m6-park" style={{ top:'82%', left:'0%',  width:'20%', height:'16%' }} />

    {/* ── ROADS ── */}
    {/* Jl. Melawai Raya — major horizontal */}
    <div className="m6-road major" style={{ top:'54%', left:0, right:0, height:'22px' }} />
    <div className="m6-road-lbl" style={{ top:'55%', left:'10px' }}>Jl. Melawai Raya</div>

    {/* Jl. Falatehan — medium horizontal */}
    <div className="m6-road" style={{ top:'29%', left:0, right:0, height:'14px' }} />
    <div className="m6-road-lbl" style={{ top:'29.5%', left:'10px' }}>Jl. Falatehan</div>

    {/* Jl. Hasanudin — minor horizontal */}
    <div className="m6-road" style={{ top:'73%', left:0, right:0, height:'10px' }} />
    <div className="m6-road-lbl" style={{ top:'73.5%', left:'10px' }}>Jl. Hasanudin</div>

    {/* Top cross street */}
    <div className="m6-road" style={{ top:'24%', left:0, width:'68%', height:'8px' }} />

    {/* Jl. Panglima Polim — major vertical */}
    <div className="m6-road major" style={{ left:'27%', top:0, bottom:0, width:'18px' }} />
    <div className="m6-road-lbl" style={{ top:'5%', left:'28.5%', transform:'rotate(-90deg)', transformOrigin:'left center' }}>Jl. Panglima Polim</div>

    {/* Jl. Sisingamangaraja — medium vertical */}
    <div className="m6-road" style={{ left:'71%', top:0, bottom:0, width:'14px' }} />
    <div className="m6-road-lbl" style={{ top:'5%', left:'72.2%', transform:'rotate(-90deg)', transformOrigin:'left center' }}>Jl. Sisingamangaraja</div>

    {/* Jl. Tulodong — minor vertical */}
    <div className="m6-road" style={{ left:'50%', top:0, height:'29%', width:'8px' }} />
    <div className="m6-road" style={{ left:'50%', top:'36%', height:'17%', width:'8px' }} />

    {/* ── CAFE PINS ── */}
    {/* Common Grounds — green (reviewed) — SELECTED */}
    <div className="m6-pin" style={{ top:'19%', left:'13%', animationDelay:'.1s' }}>
      <div className="m6-pin-marker">
        <svg viewBox="-2 -2 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#10B981" stroke="#0F0D0B" strokeWidth="3" d="M12 0C7.589 0 4 3.589 4 8c0 7 8 20 8 20s8-13 8-20c0-4.411-3.589-8-8-8z"/>
          <circle cx="12" cy="8" r="4" fill="white" stroke="#0F0D0B" strokeWidth="2"/>
        </svg>
      </div>
      <div className="m6-pin-lbl">Common Grounds</div>
    </div>

    {/* Kopi Kenangan — green (reviewed) */}
    <div className="m6-pin" style={{ top:'41%', left:'58%', animationDelay:'.2s' }}>
      <div className="m6-pin-marker">
        <svg viewBox="-2 -2 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#10B981" stroke="#0F0D0B" strokeWidth="3" d="M12 0C7.589 0 4 3.589 4 8c0 7 8 20 8 20s8-13 8-20c0-4.411-3.589-8-8-8z"/>
          <circle cx="12" cy="8" r="4" fill="white" stroke="#0F0D0B" strokeWidth="2"/>
        </svg>
      </div>
      <div className="m6-pin-lbl">Kopi Kenangan</div>
    </div>

    {/* Fore Coffee — blue (registered, no reviews) */}
    <div className="m6-pin" style={{ top:'64%', left:'38%', animationDelay:'.3s' }}>
      <div className="m6-pin-marker">
        <svg viewBox="-2 -2 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#3B82F6" stroke="#0F0D0B" strokeWidth="3" d="M12 0C7.589 0 4 3.589 4 8c0 7 8 20 8 20s8-13 8-20c0-4.411-3.589-8-8-8z"/>
          <circle cx="12" cy="8" r="4" fill="white" stroke="#0F0D0B" strokeWidth="2"/>
        </svg>
      </div>
      <div className="m6-pin-lbl">Fore Coffee</div>
    </div>

    {/* Anomali Coffee — green */}
    <div className="m6-pin" style={{ top:'20%', left:'76%', animationDelay:'.25s' }}>
      <div className="m6-pin-marker">
        <svg viewBox="-2 -2 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#10B981" stroke="#0F0D0B" strokeWidth="3" d="M12 0C7.589 0 4 3.589 4 8c0 7 8 20 8 20s8-13 8-20c0-4.411-3.589-8-8-8z"/>
          <circle cx="12" cy="8" r="4" fill="white" stroke="#0F0D0B" strokeWidth="2"/>
        </svg>
      </div>
      <div className="m6-pin-lbl">Anomali Coffee</div>
    </div>

    {/* Yellow Truck — green */}
    <div className="m6-pin" style={{ top:'77%', left:'14%', animationDelay:'.35s' }}>
      <div className="m6-pin-marker">
        <svg viewBox="-2 -2 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#10B981" stroke="#0F0D0B" strokeWidth="3" d="M12 0C7.589 0 4 3.589 4 8c0 7 8 20 8 20s8-13 8-20c0-4.411-3.589-8-8-8z"/>
          <circle cx="12" cy="8" r="4" fill="white" stroke="#0F0D0B" strokeWidth="2"/>
        </svg>
      </div>
      <div className="m6-pin-lbl">Yellow Truck</div>
    </div>

    {/* Starbucks — gray (unregistered) */}
    <div className="m6-pin" style={{ top:'60%', left:'60%', animationDelay:'.4s' }}>
      <div className="m6-pin-marker">
        <svg viewBox="-2 -2 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="#9CA3AF" stroke="#0F0D0B" strokeWidth="3" d="M12 0C7.589 0 4 3.589 4 8c0 7 8 20 8 20s8-13 8-20c0-4.411-3.589-8-8-8z"/>
          <circle cx="12" cy="8" r="4" fill="white" stroke="#0F0D0B" strokeWidth="2"/>
        </svg>
      </div>
      <div className="m6-pin-lbl">Starbucks</div>
    </div>

    {/* User location */}
    <div className="m6-user" style={{ top:'52%', left:'50%' }}>
      <div className="m6-user-ring" />
      <div className="m6-user-dot" />
    </div>

    {/* Selected cafe popup — Common Grounds */}
    <div className="m6-popup">
      <div className="m6-popup-name">Common Grounds</div>
      <div className="m6-popup-loc">📍 0.3 km · Jl. Falatehan, Blok M</div>
      <div className="m6-popup-row">
        <span className="m6-popup-row-icon">📶</span>
        <div className="m6-popup-bar"><div className="m6-popup-bar-fill" style={{ width:'86%', background:'#10B981' }} /></div>
        <span className="m6-popup-val">4.3</span>
      </div>
      <div className="m6-popup-row">
        <span className="m6-popup-row-icon">🔌</span>
        <div className="m6-popup-bar"><div className="m6-popup-bar-fill" style={{ width:'76%', background:'#D97706' }} /></div>
        <span className="m6-popup-val">3.8</span>
      </div>
      <div className="m6-popup-row">
        <span className="m6-popup-row-icon">🔊</span>
        <div className="m6-popup-bar"><div className="m6-popup-bar-fill" style={{ width:'64%', background:'#6B7280' }} /></div>
        <span className="m6-popup-val">3.2</span>
      </div>
    </div>

    {/* Search bar */}
    <div className="m6-search-bar">
      <span className="m6-search-bar-icon">🔍</span>
      <span className="m6-search-bar-text">Blok M, Jakarta Selatan</span>
    </div>

    {/* Map controls */}
    <div className="m6-ctrl">
      <div className="m6-ctrl-btn">+</div>
      <div className="m6-ctrl-btn">−</div>
    </div>

    {/* Search this area */}
    <div className="m6-srcharea">Search this area</div>
  </div>
);

/* ══════════════════════════════════════════════════════
   RATINGS TAB — looks like actual CafeDetailSheet
══════════════════════════════════════════════════════ */
const RatingsMock: React.FC = () => (
  <div className="m6-ratings">
    <div className="m6-ratings-photo">
      <span className="m6-ratings-photo-label">📸 Cafe Photos</span>
    </div>
    <div className="m6-ratings-body">
      <div className="m6-ratings-header">
        <span className="m6-ratings-name">Common Grounds</span>
        <span className="m6-ratings-heart">❤️</span>
      </div>
      <div className="m6-ratings-meta">⭐ 4.6 · 23 reviews · 📍 0.3 km · Jl. Falatehan</div>
      <div className="m6-ratings-actions">
        <div className="m6-action-btn m6-action-primary">Log Visit</div>
        <div className="m6-action-btn m6-action-secondary">📍 Directions</div>
      </div>
      <div className="m6-ratings-divider">Community Ratings</div>
      {[
        { icon: '📶', label: 'WiFi',    pct: 86, val: '4.3', color: '#10B981' },
        { icon: '🔌', label: 'Power',   pct: 76, val: '3.8', color: '#D97706' },
        { icon: '🔊', label: 'Noise',   pct: 64, val: '3.2', color: '#6B7280' },
        { icon: '💺', label: 'Comfort', pct: 82, val: '4.1', color: '#6D28D9' },
      ].map(r => (
        <div className="m6-rrow" key={r.label}>
          <span className="m6-rrow-icon">{r.icon}</span>
          <span className="m6-rrow-lbl">{r.label}</span>
          <div className="m6-rrow-bar"><div className="m6-rrow-fill" style={{ width: `${r.pct}%`, background: r.color }} /></div>
          <span className="m6-rrow-val">{r.val}</span>
        </div>
      ))}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════
   FAVORITES TAB — looks like FavoritesPanel
══════════════════════════════════════════════════════ */
const FavoritesMock: React.FC = () => (
  <div className="m6-favs">
    <div className="m6-favs-hdr">
      <span className="m6-favs-hdr-icon">❤️</span>
      <span className="m6-favs-hdr-title">My Favorites</span>
    </div>
    {[
      { emoji:'☕', name:'Common Grounds',   meta:'📍 0.3 km · WiFi 4.3 · Power 3.8', rating:'⭐ 4.6' },
      { emoji:'🫖', name:'Yellow Truck',     meta:'📍 0.8 km · WiFi 4.5 · Power 4.2', rating:'⭐ 4.8' },
      { emoji:'☕', name:'Anomali Coffee',   meta:'📍 1.1 km · WiFi 4.0 · Power 3.5', rating:'⭐ 4.5' },
      { emoji:'🧋', name:'Kopi Kenangan',   meta:'📍 1.4 km · WiFi 3.8 · Power 3.0', rating:'⭐ 4.2' },
    ].map(f => (
      <div className="m6-fav" key={f.name}>
        <div className="m6-fav-thumb">{f.emoji}</div>
        <div className="m6-fav-info">
          <span className="m6-fav-name">{f.name}</span>
          <span className="m6-fav-meta">{f.meta}</span>
        </div>
        <span className="m6-fav-rating">{f.rating}</span>
      </div>
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════
   SEARCH TAB — looks like SearchOverlay
══════════════════════════════════════════════════════ */
const SearchMock: React.FC = () => (
  <div className="m6-search">
    <div className="m6-search-hdr">
      <div className="m6-search-input-wrap">
        <span className="m6-search-input-icon">🔍</span>
        <span className="m6-search-input-text">Search cafes in Blok M</span>
        <span className="m6-search-input-cursor" />
      </div>
    </div>
    <div className="m6-search-results-hdr">Nearby · 6 results</div>
    {[
      { emoji:'📍', name:'Common Grounds',   detail:'Jl. Falatehan · 0.3 km',  badge:'green', btext:'Reviewed' },
      { emoji:'📍', name:'Yellow Truck Coffee', detail:'Jl. Hasanudin · 0.8 km', badge:'green', btext:'Reviewed' },
      { emoji:'📍', name:'Fore Coffee',      detail:'Jl. Melawai · 1.0 km',    badge:'blue',  btext:'Registered' },
      { emoji:'📍', name:'Anomali Coffee',   detail:'Jl. Sisingamangaraja · 1.1 km', badge:'green', btext:'Reviewed' },
      { emoji:'📍', name:'Starbucks Reserve',detail:'Blok M Plaza · 1.3 km',   badge:'gray',  btext:'Unreviewed' },
    ].map(r => (
      <div className="m6-sres" key={r.name}>
        <span className="m6-sres-pin">{r.emoji}</span>
        <div className="m6-sres-info">
          <span className="m6-sres-name">{r.name}</span>
          <span className="m6-sres-detail">{r.detail}</span>
        </div>
        <span className={`m6-sres-badge ${r.badge}`}>{r.btext}</span>
      </div>
    ))}
  </div>
);

export default LandingPage;
