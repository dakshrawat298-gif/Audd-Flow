import './App.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Send, Radio, Wallet, ArrowUpRight, ArrowDownLeft, X, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import toast, { Toaster } from 'react-hot-toast';

// Devnet AUDD test mint (6 decimals).
const AUDD_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

export default function App() {
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
        </div>

        <SendSheetMount />
        <DepositSheetMount />
        <StreamSheetMount />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#111',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
    </div>
  );
}

// ----- Balance refresh bus (lets sheets trigger Dashboard to refetch) -----
const balanceBus = (() => {
  const listeners = new Set();
  return {
    refresh: () => listeners.forEach((fn) => fn()),
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();

function Header() {
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-[100] glass mx-4 mt-3 px-4 py-3 rounded-2xl flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-neon to-purple-electric shadow-[0_0_24px_rgba(0,212,255,0.55)]" />
        <span className="text-[15px] font-semibold tracking-tight">
          Audd<span className="text-white/50 font-light"> Flow</span>
        </span>
      </div>

      <div className="audd-wallet-btn relative z-50">
        <WalletMultiButton startIcon={<Wallet size={13} className="text-cyan-neon" />} />
      </div>
    </motion.header>
  );
}

// ----- Tiny event bus factory for sheet open/close state -----
function createSheetBus() {
  const listeners = new Set();
  return {
    open: () => listeners.forEach((fn) => fn(true)),
    close: () => listeners.forEach((fn) => fn(false)),
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
const sendSheetBus = createSheetBus();
const depositSheetBus = createSheetBus();
const streamSheetBus = createSheetBus();

// ----- Activity log store (in-memory ledger) -----
const activityStore = {
  log: [],
  listeners: new Set(),
  add(entry) {
    this.log = [entry, ...this.log].slice(0, 50);
    this.listeners.forEach((fn) => fn(this.log));
  },
  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.log);
    return () => this.listeners.delete(fn);
  },
};

// ----- Active stream store (visual prototype only) -----
const streamStore = {
  stream: null, // { totalAmount, durationMs, startedAt, recipient }
  listeners: new Set(),
  start(stream) {
    this.stream = stream;
    this.listeners.forEach((fn) => fn(this.stream));
  },
  stop() {
    this.stream = null;
    this.listeners.forEach((fn) => fn(null));
  },
  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.stream);
    return () => this.listeners.delete(fn);
  },
};

function SendSheetMount() {
  const [isSendOpen, setIsSendOpen] = useState(false);
  useEffect(() => sendSheetBus.subscribe(setIsSendOpen), []);
  return <SendSheet isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} />;
}

function DepositSheetMount() {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  useEffect(() => depositSheetBus.subscribe(setIsDepositOpen), []);
  return <DepositSheet isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />;
}

function StreamSheetMount() {
  const [isStreamOpen, setIsStreamOpen] = useState(false);
  useEffect(() => streamSheetBus.subscribe(setIsStreamOpen), []);
  return <StreamSheet isOpen={isStreamOpen} onClose={() => setIsStreamOpen(false)} />;
}

function Dashboard() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);
  const wasConnectedRef = useRef(false);

  // Premium connect/disconnect toasts + stream state cleanup on disconnect.
  useEffect(() => {
    const isConnected = Boolean(publicKey);
    const wasConnected = wasConnectedRef.current;

    if (isConnected && !wasConnected) {
      toast.success('Wallet connected successfully', {
        icon: '🟢',
        style: {
          borderRadius: '100px',
          background: '#111',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      });
    } else if (!isConnected && wasConnected) {
      toast('Wallet disconnected', {
        icon: '🔌',
        style: {
          borderRadius: '100px',
          background: '#111',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      });

      // Stop any active stream — this nulls streamStore.stream, which causes
      // ActiveStreamsCard's effect to clear its setInterval and reset the
      // displayed numbers back to 0.000000.
      streamStore.stop();
    }

    wasConnectedRef.current = isConnected;
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        // Resolve the user's AUDD associated token account on devnet.
        const userATA = await getAssociatedTokenAddress(AUDD_MINT, publicKey);

        // getTokenAccountBalance throws if the ATA does not exist on-chain
        // (fresh wallet that has never received AUDD). We treat that as 0.
        const resp = await connection.getTokenAccountBalance(userATA);
        if (cancelled) return;

        const ui =
          typeof resp?.value?.uiAmount === 'number'
            ? resp.value.uiAmount
            : Number(resp?.value?.amount ?? 0) /
              Math.pow(10, resp?.value?.decimals ?? 6);

        setBalance(Number.isFinite(ui) ? ui : 0);
      } catch (err) {
        // Most common cause: ATA doesn't exist yet — show 0 instead of crashing.
        if (!cancelled) setBalance(0);
        console.warn('AUDD balance unavailable, defaulting to 0:', err?.message || err);
      }
    };

    fetchBalance();
    const unsubscribe = balanceBus.subscribe(fetchBalance);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [connection, publicKey]);

  return (
    <main className="flex-1 flex flex-col px-5 pt-6 overflow-y-auto pb-6">
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
          { label: 'Deposit', icon: ArrowDownLeft, color: 'text-cyan-neon', onClick: () => depositSheetBus.open() },
          { label: 'Send', icon: ArrowUpRight, color: 'text-purple-electric', onClick: () => sendSheetBus.open() },
          { label: 'Stream', icon: Radio, color: 'text-white', onClick: () => streamSheetBus.open() },
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
      <ActiveStreamsCard />

      {/* Recent activity */}
      <RecentActivityCard />
    </main>
  );
}

function SendSheet({ isOpen, onClose }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const isSending = status === 'sending';
  const isSent = status === 'sent';

  // Reset fields when closed
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setRecipient('');
        setAmount('');
        setStatus('idle');
        setErrorMsg('');
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleSend = async () => {
    setErrorMsg('');

    if (!publicKey) {
      setErrorMsg('Connect a wallet first.');
      toast.error('Connect a wallet first.');
      return;
    }

    let parsedRecipient;
    try {
      parsedRecipient = new PublicKey(recipient.trim());
    } catch {
      setErrorMsg('Invalid recipient address.');
      toast.error('Invalid recipient address.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || Number.isNaN(parsedAmount)) {
      setErrorMsg('Enter an amount greater than 0.');
      toast.error('Enter an amount greater than 0.');
      return;
    }

    const toastId = toast.loading('Sending transaction...');

    try {
      setStatus('sending');

      // Resolve associated token accounts for sender + recipient.
      const senderATA = await getAssociatedTokenAddress(AUDD_MINT, publicKey);
      const recipientATA = await getAssociatedTokenAddress(AUDD_MINT, parsedRecipient);

      const transaction = new Transaction();

      // Pre-check: if the recipient ATA does not exist on-chain yet,
      // prepend an instruction to create it (sender pays the rent).
      // This prevents crashes when sending to a fresh wallet.
      const recipientATAInfo = await connection.getAccountInfo(recipientATA);
      if (!recipientATAInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,        // payer
            recipientATA,     // ATA to create
            parsedRecipient,  // owner of the new ATA
            AUDD_MINT
          )
        );
      }

      // AUDD on devnet uses 6 decimals.
      transaction.add(
        createTransferInstruction(
          senderATA,
          recipientATA,
          publicKey,
          Math.round(parsedAmount * 1_000_000)
        )
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      const addr = parsedRecipient.toBase58();
      activityStore.add({
        id: Date.now(),
        type: 'Sent',
        amount: parsedAmount,
        address: addr.slice(0, 4) + '...' + addr.slice(-4),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        signature,
      });

      toast.success(`Sent ${parsedAmount} SOL`, { id: toastId });

      // Instantly re-fetch balance so the UI numbers drop without a refresh.
      try {
        const newLamports = await connection.getBalance(publicKey);
        balanceBus.refresh(); // notify Dashboard listener too
        // (Dashboard's listener will re-query; we already have the value above
        //  to ensure freshness even if the listener is delayed.)
        void newLamports;
      } catch (refreshErr) {
        console.error('Balance refresh failed:', refreshErr);
      }

      setStatus('sent');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Transaction failed:', err);
      const msg = err?.message?.slice(0, 120) || 'Transaction rejected.';
      setErrorMsg(msg);
      toast.error(msg, { id: toastId });
      setStatus('idle');
    }
  };

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
                           text-[16px] font-light tracking-wide
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
              whileTap={!isSending && !isSent ? { scale: 0.97 } : {}}
              type="button"
              onClick={handleSend}
              disabled={isSending || isSent}
              className={`w-full h-14 rounded-2xl
                         text-[15px] font-medium text-white
                         border border-white/15
                         shadow-[0_10px_40px_rgba(0,212,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]
                         transition-all duration-300
                         disabled:cursor-not-allowed
                         ${isSent
                           ? 'bg-gradient-to-r from-emerald-400/90 to-cyan-neon/90 shadow-[0_10px_40px_rgba(16,185,129,0.4)]'
                           : isSending
                             ? 'bg-gradient-to-r from-cyan-neon/40 to-purple-electric/40 opacity-90'
                             : 'bg-gradient-to-r from-cyan-neon/90 to-purple-electric/90 hover:shadow-[0_14px_50px_rgba(176,91,255,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]'}`}
            >
              {isSending && (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Confirming...
                </span>
              )}
              {isSent && 'Sent!'}
              {!isSending && !isSent && 'Confirm Send'}
            </motion.button>

            {errorMsg ? (
              <p className="text-center text-[11px] text-red-400/90 mt-3.5 tracking-wide">
                {errorMsg}
              </p>
            ) : (
              <p className="text-center text-[10px] text-white/30 mt-3.5 tracking-wide">
                Hold to confirm · Devnet
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DepositSheet({ isOpen, onClose }) {
  const { publicKey } = useWallet();
  const [copied, setCopied] = useState(false);
  const address = publicKey?.toBase58() || '';

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setCopied(false), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="deposit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm md:rounded-[44px]"
          />

          <motion.div
            key="deposit-sheet"
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
                  Receive Funds
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

            {/* QR placeholder */}
            <div className="flex justify-center mb-5">
              <div className="relative w-[210px] h-[210px] rounded-3xl
                              bg-white/5 border border-cyan-neon/30
                              backdrop-blur-2xl
                              flex items-center justify-center
                              shadow-[inset_0_0_40px_rgba(0,212,255,0.12),0_0_50px_rgba(0,212,255,0.18)]">
                <QrCode
                  size={150}
                  strokeWidth={1.2}
                  className="text-white/85 drop-shadow-[0_0_18px_rgba(0,212,255,0.55)]"
                />
                {/* Glow corners */}
                <span className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-cyan-neon/70 rounded-tl-md" />
                <span className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-cyan-neon/70 rounded-tr-md" />
                <span className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-purple-electric/70 rounded-bl-md" />
                <span className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-purple-electric/70 rounded-br-md" />
              </div>
            </div>

            {/* Address */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-medium text-center">
                Your Wallet Address
              </p>
              <div className="mt-2.5 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                {address ? (
                  <p className="text-[12px] text-white/85 font-light break-all text-center leading-relaxed select-all">
                    {address}
                  </p>
                ) : (
                  <p className="text-[12px] text-white/40 font-light text-center">
                    Connect a wallet to view your address
                  </p>
                )}
              </div>
            </div>

            {/* Copy button */}
            <motion.button
              whileTap={address ? { scale: 0.97 } : {}}
              type="button"
              onClick={handleCopy}
              disabled={!address || copied}
              className={`w-full h-14 rounded-2xl
                         text-[15px] font-medium text-white
                         border border-white/15
                         shadow-[0_10px_40px_rgba(0,212,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]
                         transition-all duration-300
                         disabled:cursor-not-allowed
                         inline-flex items-center justify-center gap-2
                         ${copied
                           ? 'bg-gradient-to-r from-emerald-400/90 to-cyan-neon/90 shadow-[0_10px_40px_rgba(16,185,129,0.4)]'
                           : !address
                             ? 'bg-gradient-to-r from-cyan-neon/30 to-purple-electric/30 opacity-60'
                             : 'bg-gradient-to-r from-cyan-neon/90 to-purple-electric/90 hover:shadow-[0_14px_50px_rgba(176,91,255,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]'}`}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={15} />
                  Copy Address
                </>
              )}
            </motion.button>

            <p className="text-center text-[10px] text-white/30 mt-3.5 tracking-wide">
              Solana · Devnet
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ActiveStreamsCard() {
  const [stream, setStream] = useState(null);
  const [streamed, setStreamed] = useState(0);

  useEffect(() => streamStore.subscribe(setStream), []);

  useEffect(() => {
    if (!stream) {
      setStreamed(0);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - stream.startedAt;
      const ratio = Math.min(elapsed / stream.durationMs, 1);
      setStreamed(stream.totalAmount * ratio);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [stream]);

  const isActive = !!stream;
  const ratePerSec = stream ? stream.totalAmount / (stream.durationMs / 1000) : 0;

  return (
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
        <motion.span
          key={isActive ? 'on' : 'off'}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 380 }}
          className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
            isActive
              ? 'bg-cyan-neon/10 border-cyan-neon/30 text-cyan-neon'
              : 'bg-white/5 border-white/10 text-white/60'
          }`}
        >
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-neon animate-pulse" />
          )}
          {isActive ? '1 active' : '0 active'}
        </motion.span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-3xl font-thin tracking-tight text-white tabular-nums">
            {ratePerSec.toFixed(4)}
            <span className="text-white/40 text-base ml-1.5">/sec</span>
          </p>
          <p className="text-[11px] text-white/40 mt-1">Outflow rate</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-thin tracking-tight text-glow-purple text-purple-electric tabular-nums">
            {streamed.toFixed(6)}
          </p>
          <p className="text-[11px] text-white/40 mt-1">
            {isActive ? `Streamed of ${stream.totalAmount}` : 'Inflow rate'}
          </p>
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
  );
}

function StreamSheet({ isOpen, onClose }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('1w'); // '1d' | '1w' | '1m'
  const [status, setStatus] = useState('idle'); // 'idle' | 'starting'
  const [errorMsg, setErrorMsg] = useState('');

  const isStarting = status === 'starting';

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setRecipient('');
        setAmount('');
        setDuration('1w');
        setStatus('idle');
        setErrorMsg('');
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const durations = [
    { id: '1d', label: '1 Day', ms: 24 * 60 * 60 * 1000 },
    { id: '1w', label: '1 Week', ms: 7 * 24 * 60 * 60 * 1000 },
    { id: '1m', label: '1 Month', ms: 30 * 24 * 60 * 60 * 1000 },
  ];

  const handleStart = async () => {
    setErrorMsg('');

    let toPubkey;
    try {
      toPubkey = new PublicKey(recipient.trim());
    } catch {
      setErrorMsg('Invalid recipient address.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || Number.isNaN(parsedAmount)) {
      setErrorMsg('Enter an amount greater than 0.');
      return;
    }

    const chosen = durations.find((d) => d.id === duration);
    setStatus('starting');

    // Simulated provisioning delay (visual prototype only)
    await new Promise((r) => setTimeout(r, 900));

    const recipientAddr = toPubkey.toBase58();
    streamStore.start({
      totalAmount: parsedAmount,
      durationMs: chosen.ms,
      startedAt: Date.now(),
      recipient: recipientAddr,
    });

    activityStore.add({
      id: Date.now(),
      type: 'Streaming',
      amount: parsedAmount,
      address: recipientAddr.slice(0, 4) + '...' + recipientAddr.slice(-4),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="stream-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm md:rounded-[44px]"
          />

          <motion.div
            key="stream-sheet"
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
            <div className="flex justify-center pt-1 pb-3">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-medium">
                  Treasury · Devnet
                </p>
                <h2 className="text-[22px] font-light tracking-tight text-white mt-1">
                  Create Stream
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

            {/* Recipient */}
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
                autoComplete="off"
                className="w-full mt-2 bg-transparent text-white text-[16px] font-light
                           border-b border-white/10 focus:border-cyan-neon/60
                           outline-none py-2 transition-colors duration-300
                           placeholder:text-white/25"
              />
            </div>

            {/* Amount */}
            <div className="mb-6">
              <label className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-medium">
                Total Amount
              </label>
              <div className="flex items-baseline gap-2 mt-2 border-b border-white/10 focus-within:border-purple-electric/60 transition-colors duration-300 pb-2">
                <span className="text-3xl font-thin text-white/40">◎</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    if ((v.match(/\./g) || []).length <= 1) setAmount(v);
                  }}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-white text-3xl font-thin tracking-tight
                             outline-none placeholder:text-white/20"
                />
                <span className="text-[11px] text-white/40 tracking-wide">SOL</span>
              </div>
            </div>

            {/* Duration */}
            <div className="mb-7">
              <label className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-medium">
                Duration
              </label>
              <div className="grid grid-cols-3 gap-2 mt-2.5">
                {durations.map((d) => {
                  const selected = duration === d.id;
                  return (
                    <motion.button
                      key={d.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setDuration(d.id)}
                      className={`relative h-11 rounded-full text-[12px] font-medium border
                                  transition-all duration-300
                                  ${selected
                                    ? 'bg-gradient-to-r from-cyan-neon/20 to-purple-electric/20 border-cyan-neon/40 text-white shadow-[0_0_24px_rgba(0,212,255,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]'
                                    : 'bg-white/5 border-white/10 text-white/65 hover:text-white hover:border-white/20'}`}
                    >
                      {d.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Start button */}
            <motion.button
              whileTap={!isStarting ? { scale: 0.97 } : {}}
              type="button"
              onClick={handleStart}
              disabled={isStarting}
              className={`w-full h-14 rounded-2xl
                         text-[15px] font-medium text-white
                         border border-white/15
                         shadow-[0_10px_40px_rgba(0,212,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]
                         transition-all duration-300
                         disabled:cursor-not-allowed
                         inline-flex items-center justify-center gap-2
                         ${isStarting
                           ? 'bg-gradient-to-r from-cyan-neon/40 to-purple-electric/40 opacity-90'
                           : 'bg-gradient-to-r from-cyan-neon/90 to-purple-electric/90 hover:shadow-[0_14px_50px_rgba(176,91,255,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]'}`}
            >
              {isStarting ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Initializing…
                </>
              ) : (
                <>
                  <Radio size={15} />
                  Start Stream
                </>
              )}
            </motion.button>

            {errorMsg ? (
              <p className="text-center text-[11px] text-red-400/90 mt-3.5 tracking-wide">
                {errorMsg}
              </p>
            ) : (
              <p className="text-center text-[10px] text-white/30 mt-3.5 tracking-wide">
                Continuous payment · Devnet preview
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function RecentActivityCard() {
  const [log, setLog] = useState([]);
  useEffect(() => activityStore.subscribe(setLog), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.7 }}
      className="mt-5"
    >
      <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 font-medium px-1">
        Recent Activity
      </p>

      {log.length === 0 ? (
        <div className="glass mt-2.5 rounded-2xl p-5 text-center">
          <p className="text-white/50 text-[13px] font-light">
            No transactions yet
          </p>
          <p className="text-white/30 text-[11px] mt-1">
            Connect a wallet to begin
          </p>
        </div>
      ) : (
        <div className="glass mt-2.5 rounded-2xl divide-y divide-white/5 overflow-hidden">
          <AnimatePresence initial={false}>
            {log.map((item) => {
              const isStream = item.type === 'Streaming';
              const Icon = isStream ? Radio : ArrowUpRight;
              const accent = isStream ? 'text-cyan-neon' : 'text-purple-electric';
              const ring = isStream
                ? 'bg-cyan-neon/10 border-cyan-neon/25'
                : 'bg-purple-electric/10 border-purple-electric/25';

              const hasLink = Boolean(item.signature);
              const RowTag = hasLink ? motion.a : motion.div;
              const linkProps = hasLink
                ? {
                    href: `https://solscan.io/tx/${item.signature}?cluster=devnet`,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  }
                : {};

              return (
                <RowTag
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  {...linkProps}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                    hasLink ? 'hover:bg-white/5 cursor-pointer' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center ${ring}`}>
                    <Icon size={15} className={accent} strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white font-medium leading-tight">
                      {item.type}
                    </p>
                    <p className="text-[11px] text-white/40 mt-0.5 font-light tabular-nums">
                      {item.address} · {item.time}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`text-[13px] font-medium tabular-nums ${accent}`}>
                      {isStream ? '' : '−'}{item.amount} <span className="text-white/40 text-[10px] tracking-wide ml-0.5">AUDD</span>
                    </p>
                  </div>

                  {hasLink && (
                    <ExternalLink
                      size={13}
                      className="text-white/30 ml-1 shrink-0"
                      strokeWidth={1.8}
                    />
                  )}
                </RowTag>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
