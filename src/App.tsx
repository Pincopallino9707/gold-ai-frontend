import { useEffect, useMemo, useState } from "react";

export default function App() {
  const [price, setPrice] = useState<number | null>(null);
  const [open, setOpen] = useState<number>(0);
  const [high, setHigh] = useState<number>(0);
  const [low, setLow] = useState<number>(0);

  const [history, setHistory] = useState<number[]>([]);
  const [signal, setSignal] = useState<"BUY" | "SELL" | "WAIT">("WAIT");

  // 📡 FETCH LIVE DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          "https://gold-ai-backend-pmtf.onrender.com/price"
        );

        const data = await res.json();

        console.log("API:", data);

        const p = Number(data?.data?.price);

        if (!isNaN(p)) {
          setPrice(p);
          setOpen(data?.data?.open || 0);
          setHigh(data?.data?.high || 0);
          setLow(data?.data?.low || 0);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  // 📊 HISTORY
  useEffect(() => {
    if (price !== null) {
      setHistory((prev) => [...prev.slice(-100), price]);
    }
  }, [price]);

  // 📈 EMA
  const ema = (period: number) => {
    if (history.length === 0) return price || 0;

    const k = 2 / (period + 1);

    return history.reduce((acc, val, i) => {
      if (i === 0) return val;
      return val * k + acc * (1 - k);
    }, history[0]);
  };

  const ema9 = useMemo(() => ema(9), [history]);
  const ema21 = useMemo(() => ema(21), [history]);
  const ema50 = useMemo(() => ema(50), [history]);

  // 📊 RSI
  const rsi = useMemo(() => {
    if (history.length < 10) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < history.length; i++) {
      const diff = history[i] - history[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    const rs = gains / (losses || 1);
    return 100 - 100 / (1 + rs);
  }, [history]);

  // ⚡ MOMENTUM
  const momentum = useMemo(() => {
    if (history.length < 2 || price === null) return 0;
    return price - history[history.length - 2];
  }, [history, price]);

  // 🧠 SIGNAL ENGINE
  useEffect(() => {
    if (price === null) return;

    let score = 0;

    if (ema9 > ema21) score += 1;
    if (ema21 > ema50) score += 1;
    if (ema9 < ema21) score -= 1;

    if (rsi > 60) score += 1;
    if (rsi < 40) score -= 1;

    if (momentum > 0.5) score += 1;
    if (momentum < -0.5) score -= 1;

    if (score >= 3) setSignal("BUY");
    else if (score <= -3) setSignal("SELL");
    else setSignal("WAIT");
  }, [ema9, ema21, ema50, rsi, momentum, price]);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Gold AI PRO v3 (SMC READY)</h1>

      <h2>XAU/USD</h2>

      <p>💰 Price: {price ?? "loading..."}</p>
      <p>🟢 Open: {open}</p>
      <p>🔴 High: {high}</p>
      <p>🔵 Low: {low}</p>

      <hr />

      <p>EMA 9: {ema9.toFixed(2)}</p>
      <p>EMA 21: {ema21.toFixed(2)}</p>
      <p>EMA 50: {ema50.toFixed(2)}</p>

      <p>RSI: {rsi.toFixed(2)}</p>
      <p>Momentum: {momentum.toFixed(2)}</p>

      <h2
        style={{
          color:
            signal === "BUY"
              ? "green"
              : signal === "SELL"
              ? "red"
              : "gray",
        }}
      >
        {signal}
      </h2>
    </div>
  );
}