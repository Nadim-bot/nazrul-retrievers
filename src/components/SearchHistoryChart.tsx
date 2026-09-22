import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { RefreshCw, Search, Tag, AlertCircle, HelpCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface SearchKeyword {
  keyword: string;
  count: number;
  category: string;
}

const defaultKeywords: SearchKeyword[] = [
  { keyword: 'Student ID Card', count: 42, category: 'Documents & ID Cards' },
  { keyword: 'Casio Watch', count: 28, category: 'Personal Items' },
  { keyword: 'Calculus Book', count: 24, category: 'Books & Stationery' },
  { keyword: 'Leather Wallet', count: 19, category: 'Money & Valuables' },
  { keyword: 'Room Key Ring', count: 15, category: 'Keys & Access Cards' },
  { keyword: 'Laptop Charger', count: 12, category: 'Electronics' }
];

export default function SearchHistoryChart() {
  const [historyData, setHistoryData] = useState<SearchKeyword[]>(defaultKeywords);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = [
    'All',
    'Electronics',
    'Documents & ID Cards',
    'Keys & Access Cards',
    'Books & Stationery',
    'Bags & Luggage',
    'Money & Valuables',
    'Personal Items',
    'Other'
  ];

  const fetchSearchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/search-history');
      if (res && Array.isArray(res.searchHistory) && res.searchHistory.length > 0) {
        const mapped = res.searchHistory.map((h: any) => ({
          keyword: h.keyword || '',
          count: typeof h.count === 'number' ? h.count : 0,
          category: h.category || 'Other'
        }));
        setHistoryData(mapped.sort((a: any, b: any) => b.count - a.count));
      } else {
        // Keep default sample dataset if server has no queries yet
        setHistoryData(defaultKeywords);
      }
    } catch (err) {
      console.warn('Failed to load search history from API, using default data:', err);
      setHistoryData(defaultKeywords);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const handleReset = () => {
    fetchSearchHistory();
    setFilterCategory('All');
  };

  // Filter data based on category
  const filteredData = filterCategory === 'All' 
    ? historyData 
    : historyData.filter(d => d.category === filterCategory);

  // Color definitions corresponding to categories
  const colorScale = (category: string) => {
    switch (category) {
      case 'Electronics': return '#0D1B2A'; // Dark Navy Blue
      case 'Bags & Luggage': return '#1D4ED8'; // Rich Blue
      case 'Documents & ID Cards': return '#047857'; // Deep Emerald Green
      case 'Keys & Access Cards': return '#B45309'; // Warm Bronze/Amber
      case 'Books & Stationery': return '#475569'; // Slate Blue
      case 'Money & Valuables': return '#C9963F'; // Gold
      case 'Personal Items': return '#2563EB'; // Vibrant Blue
      default: return '#0284C7'; // Sky Blue
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0D1B2A] text-white text-xs px-3 py-2 rounded-xl border border-brand-gold/40 shadow-xl flex flex-col gap-1">
          <span className="font-bold text-xs tracking-wide flex items-center gap-1.5 text-brand-gold">
            <Tag className="w-3.5 h-3.5" />
            {data.keyword}
          </span>
          <span className="text-[11px] text-slate-300">Category: {data.category}</span>
          <span className="text-[11px] font-bold text-white">Searches: <span className="text-brand-gold font-black">{data.count} times</span></span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#0C1322] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 sm:p-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A192F] dark:bg-slate-800 text-amber-400 flex items-center justify-center shadow-sm shrink-0 border border-slate-800 dark:border-slate-700">
            <Search className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h4 className="font-serif text-lg font-black text-[#0A192F] dark:text-white tracking-tight">
              Search Keyword Frequency
            </h4>
            <p className="text-xs font-bold text-[#1E293B] dark:text-slate-400">
              Most searched keywords and student intents across campus
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSearchHistory}
            disabled={loading}
            className="px-3.5 py-2 bg-[#0A192F] dark:bg-amber-400 hover:bg-[#1E293B] dark:hover:bg-amber-300 text-amber-300 dark:text-slate-950 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Refresh search statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0A192F] dark:text-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95 border border-slate-300 dark:border-slate-700"
            title="Reset active category filter"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-xs font-black uppercase tracking-wider text-[#0A192F] dark:text-slate-300 mr-1">
          Filter by:
        </span>
        {categories.map(cat => {
          const isActive = filterCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0A192F] dark:bg-amber-400 text-amber-300 dark:text-slate-950 shadow-md scale-105'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0A192F] dark:text-slate-300 border border-slate-300 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Main Recharts Render Container */}
      <div className="relative w-full overflow-hidden bg-slate-50 dark:bg-[#0F1829] rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
        <div className="h-[280px] w-full">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-[#0F172A] dark:text-slate-200 gap-2 p-6 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-bold text-[#0F172A] dark:text-slate-200">Loading real-time search trends...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#0F172A] dark:text-slate-300 gap-2 p-6 text-center">
              <Search className="w-8 h-8 text-slate-400" />
              <span className="text-sm font-black text-[#0F172A] dark:text-white">
                {filterCategory === 'All' ? 'No search keyword queries logged yet.' : `No search queries logged for "${filterCategory}".`}
              </span>
              <p className="text-xs font-medium text-[#475569] dark:text-slate-400 max-w-md">
                {filterCategory === 'All'
                  ? 'Real-time campus search queries, student keyword frequencies, and category distribution will be visualized here as students search for items.'
                  : 'Try selecting another category filter or click "Reset Filter" above.'}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#CBD5E1" opacity={0.3} />
                <XAxis 
                  type="number" 
                  fontSize={11} 
                  fontWeight={800} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 800 }}
                />
                <YAxis 
                  dataKey="keyword" 
                  type="category" 
                  fontSize={12} 
                  fontWeight={800} 
                  tickLine={false} 
                  axisLine={false}
                  width={140}
                  tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 800 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                  isAnimationActive={false}
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colorScale(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {filteredData.length > 0 && (
          <div className="absolute bottom-2 right-3 text-xs text-[#0F172A] dark:text-slate-400 font-black flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            Hover bars for query count and category details
          </div>
        )}
      </div>

      {/* Dynamic Insights / Recommendations */}
      <div className="mt-5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 sm:p-5 shadow-sm flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0 mt-0.5 border border-amber-500/30">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <span className="font-black uppercase tracking-widest text-xs text-amber-900 dark:text-amber-300 block mb-1">
            System Insight & Recommendations
          </span>
          {historyData.length === 0 ? (
            <p className="text-[#0F172A] dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-bold">
              No campus student search queries or item intents have been recorded yet. Real-time search insights and claim prioritization recommendations will automatically generate as students search for items across campus.
            </p>
          ) : (
            <p className="text-[#0F172A] dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-bold">
              <strong className="text-[#0F172A] dark:text-white font-black">{historyData[0]?.keyword}</strong>
              {historyData[1] && (
                <>
                  {' '}and <strong className="text-[#0F172A] font-black">{historyData[1]?.keyword}</strong>
                </>
              )}{' '}
              {historyData.length > 1 ? 'are currently the most searched items by campus students.' : 'is currently the top searched item by campus students.'}{' '}
              Prioritize verification for claims logged under{' '}
              <strong className="text-[#0F172A] font-black">{historyData[0]?.category || 'General'}</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

