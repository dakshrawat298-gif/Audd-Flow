import './App.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Send, Radio, Wallet, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

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

        <SendSheetMount />
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

      <div className="audd-wallet-btn">
        <WalletMultiButton startIcon={<Wallet size={13} className="text-cyan-neon" />} />
      </div>
    </motion.header>
  );
}

// ----- Send sheet open/close shared across the app via a tiny event bus -----
const sendSheetBus = {
  listeners: new Set(),
  open() { this.listeners.forEach((fn) => fn(true)); },
  close() { this.listeners.forEach((fn) => fn(false)); },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
};

function SendSheetMount() {
  const [isSendOpen, setIsSendOpen] = useState(false);
  useEffect(() => sendSheetBus.subscribe(setIsSendOpen), []);
  return <SendSheet isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} />;
}

function Dashboard() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      return;
    }

    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      })
      .catch((err) => {
        console.error('Failed to fetch balance:', err);
        if (!cancelled) setBalance(0);
      });

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

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
          ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
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
          Live · Solana Devnet
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
          { label: 'Deposit', icon: ArrowDownLeft, color: 'text-cyan-neon', onClick: () => {} },
          { label: 'Send', icon: ArrowUpRight, color: 'text-purple-electric', onClick: () => sendSheetBus.open() },
          { label: 'Stream', icon: Radio, color: 'text-white', onClick: () => {} },
        ].map(({ label, icon: Icon, color, onClick }) => (
          <motion.button
            key={label}
            onClick={onClick}
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

function SendSheet({ isOpen, onClose }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  // Lock body scroll while open and reset fields when closed
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setRecipient('');
        setAmount('');
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="send-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm md:rounded-[44px]"
          />

          {/* Bottom sheet */}
          <motion.div
            key="send-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="absolute bottom-0 left-0 right-0 z-40
                       bg-[#0a0a0a]/90 backdrop-blur-2xl
                       border-t border-white/10
                       rounded-t-3xl
                       shadow-[0_-30px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]
                       px-6 pt-2.5 pb-7
                       md:rounded-b-[44px]"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-1 pb-3">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-medium">
                  Treasury · Devnet
                </p>
                <h2 className="text-[22px] font-light tracking-tight text-white mt-1">
                  Send Funds
                </h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </motion.button>
            </div>

            {/* Recipient field */}
            <div className="mb-5">
              <label className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-medium">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Solana wallet address"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="mt-2 w-full bg-transparent border-b border-white/10
                           focus:border-cyan-neon/60 transition-colors duration-300
                           text-white placeholder:text-white/25
                           text-[15px] font-light tracking-wide
                           py-2.5 outline-none"
              />
            </div>

            {/* Amount field */}
            <div className="mb-7">
              <div className="flex items-baseline justify-between">
                <label className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-medium">
                  Amount
                </label>
                <span className="text-[10px] text-white/30">AUDD</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2 border-b border-white/10 focus-within:border-purple-electric/60 transition-colors duration-300 py-1.5">
                <span className="text-white/40 text-2xl font-thin">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    setAmount(v);
                  }}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-white placeholder:text-white/25
                             text-[34px] font-thin tracking-tight
                             py-1 outline-none min-w-0"
                />
              </div>
              <div className="flex justify-end mt-2 gap-2">
                {['25%', '50%', 'Max'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              className="w-full h-14 rounded-2xl
                         text-[15px] font-medium text-white
                         bg-gradient-to-r from-cyan-neon/90 to-purple-electric/90
                         border border-white/15
                         shadow-[0_10px_40px_rgba(0,212,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]
                         transition-shadow duration-300
                         hover:shadow-[0_14px_50px_rgba(176,91,255,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]"
            >
              Confirm Send
            </motion.button>

            <p className="text-center text-[10px] text-white/30 mt-3.5 tracking-wide">
              Hold to confirm · Devnet
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
