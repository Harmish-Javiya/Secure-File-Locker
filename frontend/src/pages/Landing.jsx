import React from "react";
import { Link } from "react-router-dom";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; }

  /* THE CYBER GRID BACKGROUND (Matches existing) */
  .landing-root {
    min-height: 100vh;
    background-color: #050505;
    background-image: 
      radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.1) 0%, transparent 60%),
      linear-gradient(rgba(245, 158, 11, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245, 158, 11, 0.05) 1px, transparent 1px);
    background-size: 100% 100%, 32px 32px, 32px 32px;
    animation: panCyberGrid 15s linear infinite;
    display: flex; flex-direction: column; align-items: center;
    font-family: 'IBM Plex Mono', monospace;
    overflow-x: hidden; position: relative;
    padding-bottom: 120px; /* Space for sticky status bar */
  }

  @keyframes panCyberGrid {
    0% { background-position: 0 0, 0px 0px, 0px 0px; }
    100% { background-position: 0 0, 32px 32px, 32px 32px; }
  }

  /* LAYOUT UTILITIES */
  .container { max-width: 1000px; width: 100%; z-index: 10; margin: 0 auto; padding: 0 20px; }
  .section { padding: 100px 0; width: 100%; }
  .text-center { text-align: center; }

  /* COMMON TYPOGRAPHY */
  .syne { font-family: 'Syne', sans-serif; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
  .ibm { font-family: 'IBM Plex Mono', monospace; }

  .title-main { font-size: 56px; line-height: 1; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .title-section { font-size: 40px; margin-bottom: 30px; text-transform: uppercase; color: #fff; }
  .subtitle-section { font-size: 14px; color: #888; letter-spacing: 0.1em; max-width: 650px; margin: 0 auto 60px; line-height: 1.6; }
  .text-highlight { color: #f59e0b; font-weight: 600; }

  /* MOCK DATA TRUST MARKERS */
  .mock-trust { font-size: 11px; color: #333; margin-top: 10px; border-top: 1px solid #111; padding-top: 5px;}

  /* 1. HERO SECTION */
  .hero-vault-icon-large {
    width: 90px; height: 90px; margin: 0 auto 30px;
    background: linear-gradient(135deg, rgba(245,158,11,0.18), transparent);
    border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 30px rgba(245, 158, 11, 0.2);
    animation: floatIconHero 3s ease-in-out infinite;
  }
  @keyframes floatIconHero { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); filter: drop-shadow(0 10px 15px rgba(245, 158, 11, 0.3)); } 100% { transform: translateY(0px); } }

  .hero-subtitle { font-size: 16px; color: #999; letter-spacing: 0.12em; max-width: 650px; margin: 0 auto 50px; line-height: 1.6; }

  /* 2. BUTTONS (Matches existing) */
  .action-buttons { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; }
  .btn-primary, .btn-secondary {
    padding: 16px 32px; border-radius: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; text-decoration: none;
    display: flex; align-items: center; justify-content: center; min-width: 220px;
  }
  .btn-primary { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #080808; border: none; box-shadow: 0 8px 20px rgba(245, 158, 11, 0.2); }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(245, 158, 11, 0.3); filter: brightness(1.1); }
  .btn-secondary { background: rgba(0, 0, 0, 0.4); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); backdrop-filter: blur(10px); }
  .btn-secondary:hover { background: rgba(245, 158, 11, 0.1); border-color: #f59e0b; transform: translateY(-2px); }

  /* 3. FEATURES GRID (Matches existing) */
  .features-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 24px; width: 100%;
    animation: fadeUpGrid 0.8s ease forwards; animation-delay: 0.2s; opacity: 0;
  }
  @keyframes fadeUpGrid { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

  .feature-card {
    background: linear-gradient(145deg, rgba(20, 20, 20, 0.6) 0%, rgba(5, 5, 5, 0.8) 100%);
    backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px;
    padding: 32px; transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
  }
  .feature-card:hover { transform: translateY(-8px); border-color: rgba(245, 158, 11, 0.3); box-shadow: 0 15px 30px rgba(0,0,0,0.5), 0 0 15px rgba(245,158,11,0.05); }

  .feature-icon-wrapper { display: flex; align-items: center; gap: 12px; margin-bottom: 20px;}
  .feature-icon-amber { color: #f59e0b; }
  .feature-card-label { font-size: 10px; color: #666; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 600; margin-left: auto;}

  .feature-title-card { font-family: 'Syne', sans-serif; font-size: 18px; color: #fff; margin-bottom: 12px; font-weight: 700; }
  .feature-desc-card { font-size: 12px; color: #888; line-height: 1.6; }

  /* 4. NEW: PERSUASIVE SECTIONS */
  .persuasion-section { border-top: 1px solid #111; }

  /* Problem/Hook section */
  .problem-point {
    background: rgba(10, 10, 10, 0.4); padding: 30px; border-radius: 12px; border: 1px solid #1a1a1a;
    display: flex; flex-direction: column; align-items: flex-start; gap: 15px; margin-bottom: 20px;
    transition: background 0.2s;
  }
  .problem-point:hover { background: rgba(20, 20, 20, 0.4); }
  .problem-icon { color: #ef4444; } /* Red for problems */
  .problem-title { font-size: 16px; font-weight: 600; color: #e0e0e0;}
  .problem-desc { font-size: 12px; color: #999; line-height: 1.6; }

  /* 5. Process Section */
  .process-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; }
  .process-step { position: relative; padding-left: 50px;}
  .process-number {
    position: absolute; top: 0; left: 0; font-family: 'Syne', sans-serif; font-size: 48px;
    color: rgba(245, 158, 11, 0.1); font-weight: 800; line-height: 1;
  }
  .process-title { font-size: 16px; color: #fff; margin-bottom: 10px; font-weight: 600; }
  .process-desc { font-size: 12px; color: #999; line-height: 1.6;}

  /* 6. Security Architecture Mock */
  .architecture-mock {
    border: 1px solid #1a1a1a; padding: 40px; border-radius: 16px;
    background: linear-gradient(135deg, #080808, #111);
    display: flex; flex-direction: column; align-items: center;
    box-shadow: inset 0 0 30px rgba(0,0,0,0.8);
  }
  .arch-visual { margin-bottom: 30px; }
  .arch-title { font-size: 18px; color: #fff; margin-bottom: 15px; font-weight: 600; text-align: center;}
  .arch-desc { font-size: 12px; color: #999; line-height: 1.6; text-align: center; max-width: 600px; }

  /* 7. Final Call to Action */
  .final-cta { border-top: 1px solid #111; margin-top: 60px; }
  .final-cta-buttons { margin-top: 40px; }

  /* 8. GLOWING STATUS BAR (Matches existing, made sticky) */
  .sticky-status-bar {
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    z-index: 100;
    display: inline-flex; align-items: center; gap: 10px;
    padding: 12px 18px; background: rgba(10, 10, 10, 0.7);
    backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(245, 158, 11, 0.1); border-radius: 8px;
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(245, 158, 11, 0.05);
    animation: fadeUpStatus 1s ease forwards; animation-delay: 0.5s; opacity: 0;
  }
  @keyframes fadeUpStatus { from { opacity: 0; transform: translate(-50%, 30px); } to { opacity: 1; transform: translate(-50%, 0); } }

  .status-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e;
    animation: pulseStatus 2s ease-in-out infinite;
  }
  @keyframes pulseStatus { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .status-text { font-size: 10px; color: #888; letter-spacing: 0.12em; font-weight: 600; text-transform: uppercase;}
`;

// Helper for Problem icons
const ProblemIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export default function Landing() {
  return (
    <>
      <style>{styles}</style>
      <div className="landing-root">
        <div className="container">
          
          {/* 1. HERO SECTION (Persuasive Text) */}
          <section className="section text-center">
            <div className="hero-vault-icon-large">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="7" width="18" height="14" rx="3" stroke="#f59e0b" strokeWidth="1.5"/>
                <circle cx="12" cy="14" r="2.5" stroke="#f59e0b" strokeWidth="1.5"/>
                <path d="M12 14h2.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 7V5a4 4 0 018 0v2" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            
            <h1 className="title-main syne">Is your data truly secure?</h1>
            <p className="hero-subtitle ibm">
              Traditional cloud storage leaves your most sensitive files vulnerable. Traditional cloud storage is vulnerable. Your most sensitive documents shouldn't be left to chance. Traditional cloud storage is vulnerable. <span className="text-highlight">Secure Vault</span> offers uncompromised military-grade file encryption, where only you hold the key.
            </p>
            
            <div className="action-buttons ibm">
              <Link to="/login" className="btn-primary">Unlock Your Vault</Link>
              <Link to="/register" className="btn-secondary">Request Clearence</Link>
            </div>
            <a href="#the-problem" className="ibm" style={{fontSize:"11px", color:"#555", textDecoration:"none"}}>Learn More ↓</a>
          </section>

          {/* 2. NEW PERSUASIVE SECTIONS */}
          
          {/* Problem/Hook section */}
          <section id="the-problem" className="section persuasion-section">
            <h2 className="title-section syne text-center">The Risk of Traditional Storage</h2>
            <p className="subtitle-section ibm text-center">Traditional file solutions make trade-offs between accessibility and true security. You become the target.</p>
            
            <div className="problems-list ibm">
              <div className="problem-point">
                <ProblemIcon />
                <h4 className="problem-title">Centralized Server Vulnerability</h4>
                <p className="problem-desc">Your files are stored alongside millions of others. A single breach at the provider level can expose everything you have.</p>
              </div>
              <div className="problem-point">
                <ProblemIcon />
                <h4 className="problem-title">The "Master Key" Problem</h4>
                <p className="problem-desc">Cloud providers hold decryption keys. They can, or can be forced, to access your files without your consent. You are not in control.</p>
              </div>
              <div className="problem-point">
                <ProblemIcon />
                <h4 className="problem-title">Local Device Intrusion</h4>
                <p className="problem-desc">Without local-first encryption, your unencrypted files sit on your device, waiting for local spyware or physical theft to uncover them.</p>
              </div>
            </div>
          </section>

          {/* Technology section (Existing feature cards + revised copy) */}
          <section className="section persuasion-section">
            <h2 className="title-section syne text-center">We Are The Uncompromising Solution</h2>
            <p className="subtitle-section ibm text-center">Zero compromise. We built <span className="text-highlight">Secure Vault</span> with zero-knowledge architecture, local-first encryption, and state-of-the-art cryptographic standards.</p>
            
            <div className="features-grid ibm">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <div className="feature-icon-amber">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <span className="feature-card-label">STORAGE</span>
                </div>
                <h3 className="feature-title-card">AES-256-GCM</h3>
                <p className="feature-desc-card">Your files are encrypted using standard Trusted by governments worldwide. Every file block is uniquely locked before it even leaves your device.</p>
                <div className="mock-trust ibm">MOCK Trust Mark: AUDITED 2026</div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <div className="feature-icon-amber">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                  </div>
                  <span className="feature-card-label">ACCESS</span>
                </div>
                <h3 className="feature-title-card">Zero-Knowledge</h3>
                <p className="feature-desc-card">We are structurally incapable of accessing your data. Your encryption keys are generated locally from your passphrase. We hold no keys.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <div className="feature-icon-amber">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <span className="feature-card-label">PASSPHRASE</span>
                </div>
                <h3 className="feature-title-card">Argon2id Hashing</h3>
                <p className="feature-desc-card">Your passphrase isn't just stored. It's transformed into a memory-hard fortress. Brute-force and rainbow table attacks become computationally impossible.</p>
              </div>
            </div>
          </section>

          {/* Process section */}
          <section className="section persuasion-section">
            <h2 className="title-section syne text-center">Unlocking Security in Seconds</h2>
            <p className="subtitle-section ibm text-center">Securing your files should be effortless, not cumbersome. Here is how your data enters the vault.</p>
            
            <div className="process-steps ibm">
              <div className="process-step">
                <span className="process-number syne">1</span>
                <h4 className="process-title">Identify Your Targets</h4>
                <p className="process-desc">Drag and drop your critical documents, sensitive contracts, or private intellectual property into the secure interface.</p>
              </div>
              <div className="process-step">
                <span className="process-number syne">2</span>
                <h4 className="process-title">Execute Local Encryption</h4>
                <p className="process-desc">Your browser instantaneously executes AES-256 encryption. Your keys are generated locally. Data is locked before transit.</p>
              </div>
              <div className="process-step">
                <span className="process-number syne">3</span>
                <h4 className="process-title">Vault the Artifacts</h4>
                <p className="process-desc">Only the completely scrambled, encrypted artifacts are sent to the Secure Vault. Only you possess the unique passphrase to recall them.</p>
              </div>
            </div>
          </section>

          {/* Architecture/Diagram section (Mock) */}
          <section className="section persuasion-section">
            <h2 className="title-section syne text-center">Your Device Is The Perimeter</h2>
            <p className="subtitle-section ibm text-center">Traditional cloud models trust the network. We trust nothing except the crypto running on your local device.</p>
            
            <div className="architecture-mock ibm">
              <div className="arch-visual">
                {/* Visual representation of local -> network -> vault */}
                <svg width="250" height="150" viewBox="0 0 250 150">
                  <rect x="10" y="50" width="80" height="80" rx="6" fill="#080808" stroke="#1a1a1a"/>
                  <text x="50" y="90" fill="#f59e0b" textAnchor="middle" fontSize="11" transform="translate(0, -30)">YOUR DEVICE</text>
                  <text x="50" y="90" fill="#ef4444" textAnchor="middle" fontSize="9" opacity="0.4">LOCAL CRYPTO</text>
                  <svg x="40" y="90" width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#ef4444" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#ef4444" strokeWidth="2"/></svg>

                  <line x1="90" y1="90" x2="160" y2="90" stroke="rgba(245,158,11,0.2)" strokeWidth="1" strokeDasharray="5 5"/>
                  <circle cx="125" cy="90" r="10" fill="#080808" stroke="#f59e0b" strokeWidth="1" opacity="0.4"/>
                  <text x="125" y="94" fill="#f59e0b" textAnchor="middle" fontSize="9" opacity="0.4">ENCRYPTED ARTIFACTS</text>

                  <rect x="160" y="50" width="80" height="80" rx="6" fill="#080808" stroke="#1a1a1a"/>
                  <text x="200" y="90" fill="#f59e0b" textAnchor="middle" fontSize="11" transform="translate(0, -30)">SECURE VAULT</text>
                  <text x="200" y="90" fill="#22c55e" textAnchor="middle" fontSize="9" opacity="0.4">AES-256 ARTIFACTS</text>
                  <svg x="190" y="90" width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#22c55e" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#22c55e" strokeWidth="2"/></svg>
                </svg>
              </div>
              <h4 className="arch-title syne">The Threat Stops Here.</h4>
              <p className="arch-desc">We never receive your plaintext passphrase. Encryption happens inside your browser before your data touches any network. Your data is encrypted for eternity, unless you unlock it.</p>
            </div>
          </section>

          {/* Final Call to Action */}
          <section className="section persuasion-section final-cta text-center">
            <h2 className="title-section syne">Your Data deserves this perimeter.</h2>
            <p className="subtitle-section ibm">
              The time to secure your files is now. Request access and vault your critical documents today using military-grade encryption that you alone control. Don't wait for the next breach.
            </p>
            
            <div className="final-cta-buttons action-buttons ibm">
              <Link to="/login" className="btn-primary">Unlock Your Vault</Link>
              <Link to="/register" className="btn-secondary">Request Access</Link>
            </div>
          </section>

        </div>

        {/* 8. GLOWING STATUS BAR (Made Sticky) */}
        <div className="sticky-status-bar ibm">
          <div className="status-dot" />
          <span className="status-text">SYSTEM SECURE · END-TO-END ENCRYPTION ACTIVE</span>
        </div>

      </div>
    </>
  );
}