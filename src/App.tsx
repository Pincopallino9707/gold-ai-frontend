import { useEffect, useMemo, useState } from "react";

export default function App() {
  const [marketData, setMarketData] = useState<any>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [signal, setSignal] = useState<"BUY" | "SELL" | "WAIT">("WAIT");

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://gold-ai-backend-pmtf.onrender.com/price"
        );

        const json = await res.json();

        console.log("API RESPONSE:", json);

        if (json?.success) {
          setMarketData(json.data);

          const livePrice = Number(json.data.price);

          if (!isNaN(livePrice)) {
            setPrice(livePrice);
          }
        }
      } catch (err) {
        console.log("FETCH ERROR:", err);
      }
    };

    fetchPrice();

    const interval = setInterval(fetchPrice, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (price !== null) {
      setHistory((prev) => [...prev.slice(-100), price]);
    }
  }, [price]);

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

  const momentum = useMemo(() => {
    if (history.length < 2 || price === null) return 0;

    return price - history[history.length - 2];
  }, [history, price]);

  const trend = useMemo(() => {
    if (!marketData) return "NEUTRAL";

    return marketData.price > marketData.open
      ? "BULLISH"
      : "BEARISH";
  }, [marketData]);

  const dailyRange = useMemo(() => {
    if (!marketData) return 0;

    return marketData.high - marketData.low;
  }, [marketData]);

  const aiScore = useMemo(() => {
    if (!marketData) return 50;

    let score = 50;

    if (marketData.price > marketData.open) score += 15;
    else score -= 15;

    if (marketData.price > marketData.prevClose) score += 15;
    else score -= 15;

    if (ema9 > ema21) score += 10;
    if (ema21 > ema50) score += 10;

    if (rsi > 60) score += 10;
    if (rsi < 40) score -= 10;

    if (momentum > 0) score += 5;
    if (momentum < 0) score -= 5;

    return Math.max(0, Math.min(100, score));
  }, [marketData, ema9, ema21, ema50, rsi, momentum]);

  useEffect(() => {
    if (aiScore >= 70) setSignal("BUY");
    else if (aiScore <= 30) setSignal("SELL");
    else setSignal("WAIT");
  }, [aiScore]);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Gold AI PRO v2</h1>

      <h2>XAU/USD</h2>

      <p>💰 Price: {price ?? "loading..."}</p>

      {marketData && (
        <>
          <p>📈 Open: {marketData.open}</p>
          <p>⬆️ High: {marketData.high}</p>
          <p>⬇️ Low: {marketData.low}</p>
          <p>📊 Daily Range: {dailyRange.toFixed(2)}</p>

          <p>
            🔥 Trend:{" "}
            <strong
              style={{
                color:
                  trend === "BULLISH" ? "green" : "red",
              }}
            >
              {trend}
            </strong>
          </p>

          <p>🤖 AI Score: {aiScore}/100</p>
        </>
      )}

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