import './App.css';
import { motion } from 'framer-motion';
import { Home, Send, Radio, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useState } from 'react';

export default function App() {
  const [active, setActive] = useState('home');

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black overflow-hidden">
      {/* iPhone-style mobile frame */}
      <div className="relative w-full max-w-[420px] h-full max-h-[900px] bg-black overflow-hidden md:rounded-[44px] md:border md:border-white/10 md:shadow-[0_30px_120px_rgba(0,212,255,0.15)]">
        {/* Aurora background */}
        <div className="aurora" />

        {/* Subtle grain */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")',
          }}
        />

        {/* Content layer */}
        <div className="relative z-10 h-full flex flex-col">
          <Header />
          <Dashboard />
          <BottomNav active={active} setActive={setActive} />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="glass mx-4 mt-3 px-4 py-3 rounded-2xl flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-neon to-purple-electric shadow-[0_0_24px_rgba(0,212,255,0.55)]" />
        <span className="text-[15px] font-semibold tracking-tight">
          Audd<span className="text-white/50 font-light"> Flow</span>
        </span>
      </div>

      <motion.button
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.02 }}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium
                   bg-white/5 border border-white/10 backdrop-blur-xl
                   hover:border-cyan-neon/50 transition-colors
                   shadow-[inset_0_0_20px_rgba(0,212,255,0.08)]"
      >
        <Wallet size={13} className="text-cyan-neon" />
        <span className="text-white/90">Connect Wallet</span>
      </motion.button>
    </motion.header>
  );
}

function Dashboard() {
  return (
    <main className="flex-1 flex flex-col px-5 pt-6 overflow-y-auto pb-32">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-[11px] uppercase tracking-[0.28em] text-white/40 font-medium"
      >
        Treasury Balance
      </motion.p>

      {/* Massive shimmering number */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{
          opacity: 1,
          scale: [1, 1.012, 1],
        }}
        transition={{
          opacity: { duration: 0.8, delay: 0.25 },
          scale: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="mt-3 flex items-baseline gap-2"
      >
        <h1 className="shimmer-text text-[64px] leading-none font-thin tracking-tight">
          $0.00
        </h1>
        <span className="text-white/50 text-base font-light tracking-wide">AUDD</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-2 flex items-center gap-2"
      >
        <span className="inline-flex items-center gap-1 text-[11px] text-cyan-neon">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-neon shadow-[0_0_8px_#00d4ff] animate-pulse" />
          Live · Solana Mainnet
        </span>
      </motion.div>

      {/* Action chips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="grid grid-cols-3 gap-3 mt-7"
      >
        {[
          { label: 'Deposit', icon: ArrowDownLeft, color: 'text-cyan-neon' },
          { label: 'Send', icon: ArrowUpRight, color: 'text-purple-electric' },
          { label: 'Stream', icon: Radio, color: 'text-white' },
        ].map(({ label, icon: Icon, color }) => (
          <motion.button
            key={label}
            whileTap={{ scale: 0.95 }}
            className="glass rounded-2xl py-3.5 flex flex-col items-center gap-1.5"
          >
            <Icon size={18} className={color} />
            <span className="text-[11px] text-white/80 font-medium">{label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Stream stats card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="glass mt-5 rounded-3xl p-5"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Active Streams
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
            0 active
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-3xl font-thin tracking-tight text-white">
              0.00<span className="text-white/40 text-base ml-1.5">/sec</span>
            </p>
            <p className="text-[11px] text-white/40 mt-1">Outflow rate</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-thin tracking-tight text-glow-purple text-purple-electric">
              0.00
            </p>
            <p className="text-[11px] text-white/40 mt-1">Inflow rate</p>
          </div>
        </div>

        {/* Sparkline */}
        <div className="mt-5 h-12 w-full">
          <svg viewBox="0 0 300 50" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#b05bff" />
              </linearGradient>
            </defs>
            <path
              d="M0,35 C40,30 60,40 90,28 C120,16 150,38 180,24 C210,12 240,30 300,18"
              fill="none"
              stroke="url(#g)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.85"
            />
          </svg>
        </div>
      </motion.div>

      {/* Recent activity placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.7 }}
        className="mt-5"
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 font-medium px-1">
          Recent Activity
        </p>
        <div className="glass mt-2.5 rounded-2xl p-5 text-center">
          <p className="text-white/50 text-[13px] font-light">
            No transactions yet
          </p>
          <p className="text-white/30 text-[11px] mt-1">
            Connect a wallet to begin
          </p>
        </div>
      </motion.div>
    </main>
  );
}

function BottomNav({ active, setActive }) {
  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'send', label: 'Send', icon: Send },
    { id: 'stream', label: 'Stream', icon: Radio },
  ];

  return (
    <motion.nav
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="absolute bottom-4 left-4 right-4 glass rounded-3xl px-3 py-2.5 flex justify-around z-20"
    >
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <motion.button
            key={id}
            onClick={() => setActive(id)}
            whileTap={{ scale: 0.9 }}
            className="relative flex flex-col items-center gap-1 py-1.5 px-5 rounded-2xl"
          >
            {isActive && (
              <motion.div
                layoutId="navPill"
                className="absolute inset-0 rounded-2xl bg-white/8 border border-white/10
                           shadow-[inset_0_0_20px_rgba(0,212,255,0.12)]"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <Icon
              size={20}
              className={`relative z-10 transition-colors ${
                isActive ? 'text-cyan-neon' : 'text-white/55'
              }`}
              strokeWidth={isActive ? 2.2 : 1.7}
            />
            <span
              className={`relative z-10 text-[10px] font-medium transition-colors ${
                isActive ? 'text-white' : 'text-white/45'
              }`}
            >
              {label}
            </span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}
