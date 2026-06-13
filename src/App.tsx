import { useEffect, useMemo, useState } from "react";

export default function App() {
  const [price, setPrice] = useState(2350);
  const [history, setHistory] = useState<number[]>([]);
  const [signal, setSignal] = useState<"BUY" | "SELL" | "WAIT">("WAIT");
  const [structure, setStructure] = useState("NEUTRAL");
  const [trend, setTrend] = useState<"BULL" | "BEAR">("BULL");

  // 📡 PREZZO DAL BACKEND NODE
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("http://localhost:3001/price");
        const data = await res.json();

        if (data?.price) {
          setPrice(data.price);
        }
      } catch (err) {
        console.log("Errore fetch backend:", err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);

    return () => clearInterval(interval);
  }, []);

  // 📊 storico prezzi
  useEffect(() => {
    setHistory((prev) => {
      const updated = [...prev, price];
      return updated.slice(-40);
    });
  }, [price]);

  // 📈 swing high / low
  const swingHigh = useMemo(
    () => Math.max(...history, price),
    [history, price]
  );

  const swingLow = useMemo(
    () => Math.min(...history, price),
    [history, price]
  );

  // 📉 media trend
  const avg = useMemo(() => {
    if (history.length === 0) return price;
    return history.reduce((a, b) => a + b, 0) / history.length;
  }, [history, price]);

  // ⚡ momentum
  const momentum = useMemo(() => {
    if (history.length < 2) return 0;
    return price - history[history.length - 2];
  }, [history, price]);

  // 🧠 trend detection
  useEffect(() => {
    if (price > avg) setTrend("BULL");
    else setTrend("BEAR");
  }, [price, avg]);

  // 🧩 STRUCTURE (BOS + CHoCH semplificato)
  useEffect(() => {
    const mid = (swingHigh + swingLow) / 2;

    if (price >= swingHigh - 0.4 && trend === "BULL") {
      setStructure("BULLISH_BOS");
    } else if (price <= swingLow + 0.4 && trend === "BEAR") {
      setStructure("BEARISH_BOS");
    } else if (trend === "BULL" && price < mid) {
      setStructure("CHoCH_BEAR");
    } else if (trend === "BEAR" && price > mid) {
      setStructure("CHoCH_BULL");
    } else {
      setStructure("RANGE");
    }
  }, [price, swingHigh, swingLow, trend]);

  // 🎯 SIGNAL ENGINE (SMC CORE)
  useEffect(() => {
    let score = 0;

    if (trend === "BULL") score += 1;
    if (trend === "BEAR") score -= 1;

    if (momentum > 0.6) score += 1;
    if (momentum < -0.6) score -= 1;

    if (structure === "BULLISH_BOS") score += 2;
    if (structure === "BEARISH_BOS") score -= 2;

    if (structure === "CHoCH_BULL") score += 1;
    if (structure === "CHoCH_BEAR") score -= 1;

    if (score >= 3) setSignal("BUY");
    else if (score <= -3) setSignal("SELL");
    else setSignal("WAIT");
  }, [price, avg, momentum, structure, trend]);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Gold AI Assistant (LIVE SMC)</h1>

      <h2>XAU/USD</h2>

      <p>💰 Price: {price}</p>

      <p>Trend: {trend}</p>
      <p>Structure: {structure}</p>

      <p>Swing High: {swingHigh.toFixed(2)}</p>
      <p>Swing Low: {swingLow.toFixed(2)}</p>

      <p>Average: {avg.toFixed(2)}</p>
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