import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, DollarSign, Activity, Bell, RefreshCw, BarChart3, LineChart, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';

export default function TradingApp() {
  const [cryptoAssets, setCryptoAssets] = useState([]);
  const [stockAssets, setStockAssets] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [expandedOpportunity, setExpandedOpportunity] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState({});
  const [news] = useState([
    { title: 'Bitcoin atteint un nouveau support technique majeur', impact: 'positif', time: '15 min', source: 'CoinDesk' },
    { title: 'La SEC américaine maintient sa position sur les crypto-ETFs', impact: 'neutre', time: '1 h', source: 'Reuters' },
    { title: 'Ethereum: Mise à jour du réseau prévue ce trimestre', impact: 'positif', time: '2 h', source: 'CoinTelegraph' }
  ]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState(null);

  const calculateRSI = (prices, period = 14) => {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateMACD = (prices) => {
    const calculateEMA = (data, period) => {
      const k = 2 / (period + 1);
      let ema = data[0];
      for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
      }
      return ema;
    };
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    return { histogram: ema12 - ema26 };
  };

  const getCryptoName = (symbol) => {
    const names = {
      'BTCUSDT': 'Bitcoin', 'ETHUSDT': 'Ethereum', 'SOLUSDT': 'Solana',
      'ADAUSDT': 'Cardano', 'BNBUSDT': 'Binance Coin', 'DOGEUSDT': 'Dogecoin'
    };
    return names[symbol] || symbol;
  };

  const fetchCryptoData = async () => {
    try {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT'];
      const cryptoData = [];
      for (const symbol of symbols) {
        const tickerUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
        const tickerResponse = await fetch(tickerUrl);
        const tickerData = await tickerResponse.json();
        
        const klineUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=100`;
        const klineResponse = await fetch(klineUrl);
        const klineData = await klineResponse.json();
        
        const closes = klineData.map(k => parseFloat(k[4]));
        const highs = klineData.map(k => parseFloat(k[2]));
        const lows = klineData.map(k => parseFloat(k[3]));
        const rsi = calculateRSI(closes, 14);
        const macd = calculateMACD(closes);
        const price = parseFloat(tickerData.lastPrice);
        const change = parseFloat(tickerData.priceChangePercent);
        const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
        const atr = highs.slice(-14).reduce((sum, high, i) => sum + (high - lows.slice(-14)[i]), 0) / 14;
        const resistance = Math.max(...highs.slice(-20));
        const support = Math.min(...lows.slice(-20));
        
        cryptoData.push({
          symbol: symbol.replace('USDT', ''), name: getCryptoName(symbol), type: 'crypto',
          price, change, volume: parseFloat(tickerData.volume), rsi, macd: macd.histogram,
          ma50, ma200: ma50, atr, resistance, support, realData: true
        });
      }
      return cryptoData;
    } catch (err) {
      console.error('Erreur Binance:', err);
      return [];
    }
  };

  const fetchStockData = async () => {
    try {
      const stockSymbols = [
        { symbol: 'AAPL', name: 'Apple' }, { symbol: 'TSLA', name: 'Tesla' },
        { symbol: 'NVDA', name: 'NVIDIA' }, { symbol: 'MSFT', name: 'Microsoft' }
      ];
      const stockData = [];
      for (const stock of stockSymbols) {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}?range=1mo&interval=1h`;
        const response = await fetch(url);
        const data = await response.json();
        const result = data.chart.result[0];
        if (!result || !result.meta) continue;
        
        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const previousClose = meta.chartPreviousClose;
        const change = ((price - previousClose) / previousClose) * 100;
        const closes = result.indicators.quote[0].close.filter(c => c !== null);
        const highs = result.indicators.quote[0].high.filter(h => h !== null);
        const lows = result.indicators.quote[0].low.filter(l => l !== null);
        const rsi = closes.length >= 14 ? calculateRSI(closes, 14) : 50;
        const macd = closes.length >= 26 ? calculateMACD(closes) : { histogram: 0 };
        const ma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : price * 0.98;
        const atr = highs.slice(-14).reduce((sum, high, i) => sum + (high - lows.slice(-14)[i]), 0) / 14;
        const resistance = Math.max(...highs.slice(-20));
        const support = Math.min(...lows.slice(-20));
        
        stockData.push({
          symbol: stock.symbol, name: stock.name, type: 'stock', price, change,
          volume: meta.regularMarketVolume || 0, rsi, macd: macd.histogram,
          ma50, ma200: price * 0.95, atr, resistance, support, realData: true
        });
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      return stockData;
    } catch (err) {
      console.error('Erreur Yahoo:', err);
      return [];
    }
  };

  const calculateTarget = (asset, type) => {
    const atrMultiplier = 2;
    if (type === 'LONG') {
      const atrTarget = asset.price + (asset.atr * atrMultiplier);
      return Math.min(asset.resistance, atrTarget);
    } else {
      const atrTarget = asset.price - (asset.atr * atrMultiplier);
      return Math.max(asset.support, atrTarget);
    }
  };

  const calculateStopLoss = (asset, type) => {
    const atrMultiplier = 1.5;
    if (type === 'LONG') {
      const atrStop = asset.price - (asset.atr * atrMultiplier);
      return Math.max(asset.support * 0.99, atrStop);
    } else {
      const atrStop = asset.price + (asset.atr * atrMultiplier);
      return Math.min(asset.resistance * 1.01, atrStop);
    }
  };

  const detectOpportunities = (allAssets) => {
    const opps = [];
    allAssets.forEach(asset => {
      if (asset.rsi < 30 && asset.macd > 0 && asset.change > 2) {
        const target = calculateTarget(asset, 'LONG');
        const stopLoss = calculateStopLoss(asset, 'LONG');
        opps.push({
          asset: asset.symbol, name: asset.name, type: 'LONG', signal: 'Achat', strength: 'Fort',
          reason: `RSI survente (${asset.rsi.toFixed(1)}), MACD positif`,
          price: asset.price, target, stopLoss, realData: asset.realData,
          explanation: `${asset.name} est en zone de survente (RSI < 30).`,
          action: `Position LONG à $${asset.price.toFixed(2)}. Objectif : $${target.toFixed(2)}. Stop-loss : $${stopLoss.toFixed(2)}.`,
          timeframe: '2-7 jours', risk: 'Modéré', assetData: asset,
          technicalAnalysis: `ATR: $${asset.atr.toFixed(2)} | Résistance: $${asset.resistance.toFixed(2)} | Support: $${asset.support.toFixed(2)}`
        });
      }
      if (asset.rsi > 70 && asset.macd < 0 && asset.change < -2) {
        const target = calculateTarget(asset, 'SHORT');
        const stopLoss = calculateStopLoss(asset, 'SHORT');
        opps.push({
          asset: asset.symbol, name: asset.name, type: 'SHORT', signal: 'Vente', strength: 'Fort',
          reason: `RSI surachat (${asset.rsi.toFixed(1)}), MACD négatif`,
          price: asset.price, target, stopLoss, realData: asset.realData,
          explanation: `${asset.name} est en surachat.`,
          action: `Position SHORT à $${asset.price.toFixed(2)}. Objectif : $${target.toFixed(2)}.`,
          timeframe: '2-7 jours', risk: 'Modéré', assetData: asset,
          technicalAnalysis: `ATR: $${asset.atr.toFixed(2)}`
        });
      }
      if (asset.rsi < 40 && asset.price > asset.ma50 && asset.change > 1) {
        const target = calculateTarget(asset, 'LONG');
        const stopLoss = calculateStopLoss(asset, 'LONG');
        opps.push({
          asset: asset.symbol, name: asset.name, type: 'LONG', signal: 'Achat', strength: 'Moyen',
          reason: `RSI bas, prix > MA50`, price: asset.price, target, stopLoss,
          realData: asset.realData, explanation: `Signal modéré`,
          action: `LONG modéré`, timeframe: '3-10 jours', risk: 'Faible',
          assetData: asset, technicalAnalysis: `ATR: $${asset.atr.toFixed(2)}`
        });
      }
    });
    return opps;
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cryptos, stocks] = await Promise.all([fetchCryptoData(), fetchStockData()]);
      setCryptoAssets(cryptos);
      setStockAssets(stocks);
      setOpportunities(detectOpportunities([...cryptos, ...stocks]));
      setLastUpdate(new Date());
    } catch (err) {
      setError('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 120000);
    return () => clearInterval(interval);
  }, []);

  const generateChartData = (asset, period, opp) => {
    let dataPoints, labels;
    switch(period) {
      case 'realtime': dataPoints = 60; labels = Array.from({length: 60}, (_, i) => `${59-i}m`); break;
      case '1d': dataPoints = 24; labels = Array.from({length: 24}, (_, i) => `${23-i}h`); break;
      case '1w': dataPoints = 7; labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; break;
      case '1m': dataPoints = 30; labels = Array.from({length: 30}, (_, i) => `J${30-i}`); break;
      case '3m': dataPoints = 90; labels = Array.from({length: 90}, (_, i) => i % 10 === 0 ? `J${90-i}` : ''); break;
      case '1y': dataPoints = 52; labels = Array.from({length: 52}, (_, i) => i % 4 === 0 ? `S${52-i}` : ''); break;
      case '5y': dataPoints = 60; labels = Array.from({length: 60}, (_, i) => i % 6 === 0 ? `M${60-i}` : ''); break;
      default: dataPoints = 24; labels = Array.from({length: 24}, (_, i) => `${23-i}h`);
    }
    const volatility = Math.abs(asset.change) * 0.4;
    const mult = { 'realtime': 0.3, '1d': 0.5, '1w': 0.8, '1m': 1.2, '3m': 1.8, '1y': 3, '5y': 5 }[period] || 1;
    const minPrice = Math.min(opp.stopLoss, asset.ma50) * 0.98;
    const maxPrice = Math.max(opp.target, asset.ma50) * 1.02;
    const basePrice = asset.price;
    return labels.map((label, i) => {
      let price;
      if (i < dataPoints / 3) price = minPrice + (basePrice - minPrice) * (i / (dataPoints / 3));
      else if (i < 2 * dataPoints / 3) price = basePrice + (Math.random() - 0.5) * volatility * basePrice / 50 * mult;
      else price = basePrice + (maxPrice - basePrice) * ((i - 2 * dataPoints / 3) / (dataPoints / 3));
      price += (Math.random() - 0.5) * volatility * basePrice / 100 * mult;
      return { time: label, price: parseFloat(price.toFixed(2)) };
    });
  };

  const toggleOpportunity = (index) => {
    setExpandedOpportunity(expandedOpportunity === index ? null : index);
    if (!selectedPeriod[index]) setSelectedPeriod({...selectedPeriod, [index]: '1d'});
  };

  const changePeriod = (index, period) => {
    setSelectedPeriod({...selectedPeriod, [index]: period});
  };

  const allAssets = [...cryptoAssets, ...stockAssets];

  if (loading && allAssets.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="text-black animate-spin mx-auto mb-4" size={32} />
          <div className="text-gray-900 text-lg">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <BarChart3 className="text-white" size={20} />
              </div>
              <span className="text-xl font-semibold text-gray-900">TradOpp</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>En direct</span>
              </div>
              <button onClick={loadAllData} disabled={loading}
                className="px-4 py-2 border border-black text-black rounded-lg text-sm font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Opportunités de trading</h1>
          <p className="text-gray-600">Détection automatique avec données Binance & Yahoo Finance</p>
          <p className="text-sm text-gray-500 mt-2">Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="text-center py-12 text-gray-600">
          {loading ? 'Chargement des opportunités...' : `${allAssets.length} actifs analysés - ${opportunities.length} opportunités détectées`}
        </div>
      </main>
    </div>
  );
}
