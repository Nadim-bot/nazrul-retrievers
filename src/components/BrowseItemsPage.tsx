import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Tag, Plus, Check, RefreshCw, Eye, SlidersHorizontal, X, AlertCircle, CheckCircle2, Sparkles, Clock, MessageSquare, Inbox, HelpCircle, Filter, ChevronRight, Image as ImageIcon, Bookmark, ShieldCheck, Share2 } from 'lucide-react';
import { Item } from '../types';
import ShareModal from './ShareModal';
import { CATEGORIES, LOCATIONS, CATEGORY_STRUCTURE } from '../data';
import { findPotentialMatches } from '../utils/aiMatcher';
import { getCategoryStyle } from '../utils/categoryStyles';
import { formatPostTime } from '../utils/date';
import { hasItemReward, getRewardDetails } from '../utils/rewardUtils';

interface BrowseItemsPageProps {
  items: Item[];
  onSelectItem: (item: Item) => void;
  onTabChange: (tab: string) => void;
  onPostTypeToggle: (type: 'lost' | 'found') => void;
  onContactPoster: (item: Item) => void;
  savedItemIds?: string[];
  onToggleSaveItem?: (itemId: string, itemTitle?: string) => void;
  onOpenSavedModal?: () => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  isLoggedIn?: boolean;
  currentUser?: any;
  onRequireLogin?: (action: { type: 'save_item'; item: Item }) => void;
}

export default function BrowseItemsPage({
  items,
  onSelectItem,
  onTabChange,
  onPostTypeToggle,
  onContactPoster,
  savedItemIds = [],
  onToggleSaveItem,
  onOpenSavedModal,
  onShowToast,
  isLoggedIn = false,
  currentUser,
  onRequireLogin
}: BrowseItemsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchTarget, setSearchTarget] = useState<'all' | 'title' | 'category'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'lost' | 'found'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'available' | 'reunited' | 'handover_pending' | 'in_verification'>('all');
  const [showOnlySaved, setShowOnlySaved] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('Newest First');
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [itemToShare, setItemToShare] = useState<Item | null>(null);
  const [recentSavedFeedback, setRecentSavedFeedback] = useState<{ itemId: string; type: 'saved' | 'unsaved'; title?: string } | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMobileFilters(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showMobileFilters]);

  // Memoized count calculations for categories and subcategories from items
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const subcounts: Record<string, number> = {};
    
    // Initialize
    for (const cat of CATEGORIES) {
      counts[cat] = 0;
    }
    
    for (const item of items) {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
        if (item.subcategory) {
          const key = `${item.category}_${item.subcategory}`;
          subcounts[key] = (subcounts[key] || 0) + 1;
        }
      }
    }
    
    return { counts, subcounts };
  }, [items]);

  // Debounce search input to avoid typing stutter while triggering premium skeleton loaders
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, debouncedSearchTerm]);

  // Trigger brief skeletal load simulation on category, type, sorting or debounced search changes
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedType, selectedStatus, selectedCategories, selectedSubcategories, selectedLocations, sortBy, searchTarget, debouncedSearchTerm]);

  const toggleCategory = (catName: string) => {
    if (expandedCategory === catName) {
      setExpandedCategory(null);
      setSelectedCategories([]);
      setSelectedSubcategories([]);
    } else {
      setExpandedCategory(catName);
      setSelectedCategories([catName]);
      setSelectedSubcategories([]);
    }
  };

  const toggleSubcategory = (subcatName: string) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcatName) ? prev.filter(s => s !== subcatName) : [...prev, subcatName]
    );
  };

  const toggleLocation = (locName: string) => {
    setSelectedLocations(prev => 
      prev.includes(locName) ? prev.filter(l => l !== locName) : [...prev, locName]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedLocations([]);
    setSelectedType('all');
    setSelectedStatus('all');
    setShowOnlySaved(false);
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSearchTarget('all');
    setSortBy('Newest First');
    setExpandedCategory(null);
  };

  // Filter items using debounced search term
  const filteredItems = items.filter(item => {
    // Search keyword match
    let matchesSearch = true;
    if (debouncedSearchTerm.trim() !== '') {
      const term = debouncedSearchTerm.toLowerCase();
      const title = (item.title || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const subcategory = (item.subcategory || '').toLowerCase();
      const description = (item.description || '').toLowerCase();

      if (searchTarget === 'title') {
        matchesSearch = title.includes(term);
      } else if (searchTarget === 'category') {
        matchesSearch = category.includes(term) || subcategory.includes(term);
      } else {
        matchesSearch = 
          title.includes(term) ||
          description.includes(term) ||
          category.includes(term) ||
          subcategory.includes(term);
      }
    }

    // Type match
    const matchesType = selectedType === 'all' || item.type === selectedType;

    // Status match
    let matchesStatus = true;
    if (selectedStatus === 'available') {
      matchesStatus = !item.status || (item.status !== 'returned' && item.status !== 'reunited' && item.status !== 'claimed' && item.status !== 'handover_pending' && item.status !== 'under_verification' && item.status !== 'claim_requested' && item.status !== 'closed' && item.status !== 'deleted');
    } else if (selectedStatus === 'reunited') {
      matchesStatus = item.status === 'returned' || item.status === 'reunited' || item.status === 'claimed';
    } else if (selectedStatus === 'handover_pending') {
      matchesStatus = item.status === 'handover_pending';
    } else if (selectedStatus === 'in_verification') {
      matchesStatus = item.status === 'under_verification' || item.status === 'claim_requested';
    }

    // Saved filter
    const matchesSaved = !showOnlySaved || (savedItemIds || []).includes(String(item.id));

    // Categories & Subcategories filter
    let matchesCategory = true;
    if (selectedCategories.length > 0) {
      const isParentCategorySelected = selectedCategories.includes(item.category || '');
      if (!isParentCategorySelected) {
        matchesCategory = false;
      } else {
        const catConfig = CATEGORY_STRUCTURE.find(c => c.name === (item.category || ''));
        const selectedSubcatsOfThisCat = catConfig 
          ? catConfig.subcategories.filter(sub => selectedSubcategories.includes(sub))
          : [];
        
        if (selectedSubcatsOfThisCat.length > 0) {
          matchesCategory = item.subcategory ? selectedSubcategories.includes(item.subcategory) : false;
        }
      }
    }

    // Locations filter
    const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(item.location);

    return matchesSearch && matchesType && matchesStatus && matchesSaved && matchesCategory && matchesLocation;
  });

  // Helper to get exact timestamp for sorting by creation/posting date
  const getItemPostTime = (item: Item): number => {
    if (item.createdAt) {
      const t = new Date(item.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.approvedAt) {
      const t = new Date(item.approvedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.date) {
      const t = new Date(item.date).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.id !== undefined && item.id !== null) {
      const digits = String(item.id).replace(/\D/g, '');
      if (digits.length >= 8) {
        const num = parseInt(digits, 10);
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return 0;
  };

  // Helper to get timestamp for sorting by incident date
  const getItemIncidentTime = (item: Item): number => {
    if (item.date) {
      const t = new Date(item.date).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    return getItemPostTime(item);
  };

  // Sort items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortBy === 'Newest First') {
        const timeA = getItemPostTime(a);
        const timeB = getItemPostTime(b);
        if (timeA !== timeB) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      }
      if (sortBy === 'Oldest First') {
        const timeA = getItemPostTime(a);
        const timeB = getItemPostTime(b);
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || '').localeCompare(b.id || '');
      }
      if (sortBy === 'Incident Date (Recent)' || sortBy === 'Incident Date (Newest)') {
        const timeA = getItemIncidentTime(a);
        const timeB = getItemIncidentTime(b);
        if (timeA !== timeB) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      }
      if (sortBy === 'Incident Date (Oldest)') {
        const timeA = getItemIncidentTime(a);
        const timeB = getItemIncidentTime(b);
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || '').localeCompare(b.id || '');
      }
      if (sortBy === 'Most Viewed') {
        const vA = typeof a.views === 'number' ? a.views : 0;
        const vB = typeof b.views === 'number' ? b.views : 0;
        if (vA !== vB) return vB - vA;
        return getItemPostTime(b) - getItemPostTime(a);
      }
      if (sortBy === 'Title (A-Z)') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'Title (Z-A)') {
        return (b.title || '').localeCompare(a.title || '');
      }
      return 0;
    });
  }, [filteredItems, sortBy]);

  // Premium Shimmer skeletal mock elements matching the actual listings card structure
  const renderSkeletons = () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-6">
      {Array(8).fill(null).map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#161B22] border border-[#E5E7EB] dark:border-[#2D3748] rounded-[20px] p-4 flex flex-col justify-between h-[430px] shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          {/* Mock Image Area with subtle gradients */}
          <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-[16px] relative flex items-center justify-center overflow-hidden">
            {/* Pulsing rounded plate representing the central item emoji */}
            <div className="w-16 h-16 rounded-2xl bg-white/70 dark:bg-slate-700/35 animate-pulse flex items-center justify-center border border-white/20" />
            {/* Top-left mock status badge */}
            <div className="absolute top-3 left-3 w-14 h-6 bg-white/50 dark:bg-slate-800/50 rounded-full animate-pulse" />
            {/* Bottom-right mock view count tag */}
            <div className="absolute bottom-3 right-3 w-10 h-4 bg-black/10 dark:bg-slate-800/40 rounded animate-pulse" />
          </div>

          {/* Mock Text Details Area */}
          <div className="pt-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Mock Date line */}
              <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              {/* Mock Title line */}
              <div className="h-5 w-5/6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              {/* Mock Location line */}
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>

            {/* Mock Card Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* Mock Category pill */}
              <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
              {/* Mock Contact action button */}
              <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[272px_1fr] min-h-[calc(100vh-68px)] relative bg-brand-cream dark:bg-[#0B111E]">
      {/* Left side Filter Sidebar - Desktop only */}
      <aside className="bg-white dark:bg-[#111A2E] border-r border-brand-border dark:border-slate-800 p-6 flex-col overflow-y-auto hidden lg:flex">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-lg font-bold text-brand-navy dark:text-white">Filters</h3>
          <button 
            onClick={clearAllFilters}
            className="text-xs font-bold text-brand-gold hover:text-brand-gold-mid inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Clear
          </button>
        </div>

        {/* Filter Type */}
        <div className="border-b border-brand-border dark:border-slate-800 pb-6 mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400 mb-3">Item Type</h4>
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
              <span className="flex items-center gap-2">
                <input 
                  type="radio" 
                  checked={selectedType === 'all'} 
                  onChange={() => setSelectedType('all')} 
                  className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                />
                All Items
              </span>
              <span className="bg-brand-surface2 dark:bg-slate-800 text-brand-ink3 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </label>
            <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
              <span className="flex items-center gap-2">
                <input 
                  type="radio" 
                  checked={selectedType === 'lost'} 
                  onChange={() => setSelectedType('lost')} 
                  className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                />
                Lost Items
              </span>
              <span className="bg-brand-surface2 dark:bg-slate-800 text-brand-ink3 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {items.filter(i => i.type === 'lost').length}
              </span>
            </label>
            <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
              <span className="flex items-center gap-2">
                <input 
                  type="radio" 
                  checked={selectedType === 'found'} 
                  onChange={() => setSelectedType('found')} 
                  className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                />
                Found Items
              </span>
              <span className="bg-brand-surface2 dark:bg-slate-800 text-brand-ink3 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {items.filter(i => i.type === 'found').length}
              </span>
            </label>
          </div>
        </div>

        {/* Filter Status */}
        <div className="border-b border-brand-border dark:border-slate-800 pb-6 mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400 mb-3">Item Status</h4>
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
              <span className="flex items-center gap-2">
                <input 
                  type="radio" 
                  checked={selectedStatus === 'all'} 
                  onChange={() => setSelectedStatus('all')} 
                  className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                />
                All Statuses
              </span>
              <span className="bg-brand-surface2 dark:bg-slate-800 text-brand-ink3 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </label>
            <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
              <span className="flex items-center gap-2">
                <input 
                  type="radio" 
                  checked={selectedStatus === 'available'} 
                  onChange={() => setSelectedStatus('available')} 
                  className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                />
                Available / Active
              </span>
              <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200/50 dark:border-teal-700/50">
                {items.filter(i => !i.status || (i.status !== 'returned' && i.status !== 'reunited' && i.status !== 'claimed' && i.status !== 'handover_pending' && i.status !== 'under_verification' && i.status !== 'claim_requested' && i.status !== 'closed' && i.status !== 'deleted')).length}
              </span>
            </label>
            <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
              <span className="flex items-center gap-2">
                <input 
                  type="radio" 
                  checked={selectedStatus === 'reunited'} 
                  onChange={() => setSelectedStatus('reunited')} 
                  className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                />
                Reunited & Returned
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-700/50">
                {items.filter(i => i.status === 'returned' || i.status === 'reunited' || i.status === 'claimed' || i.status === 'resolved').length}
              </span>
            </label>
          </div>
        </div>

        {/* Categories */}
        <div className="border-b border-brand-border dark:border-slate-800 pb-6 mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400 mb-3">Categories</h4>
          <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
            {CATEGORIES.map(cat => {
              const catStyle = getCategoryStyle(cat);
              const IconComponent = catStyle.icon;
              const isSelected = selectedCategories.includes(cat);
              const isExpanded = expandedCategory === cat;
              const totalCount = categoryCounts.counts[cat] || 0;
              const catConfig = CATEGORY_STRUCTURE.find(c => c.name === cat);
              
              return (
                <div key={cat} className="flex flex-col gap-1">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className={`w-full flex items-center text-left text-xs sm:text-sm px-2.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 font-bold shadow-md border border-transparent hover:bg-brand-navy/95 dark:hover:bg-amber-400' 
                        : 'text-brand-navy/90 dark:text-slate-200 hover:bg-brand-navy/5 dark:hover:bg-slate-800/80 hover:text-brand-navy dark:hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${
                        isSelected ? 'scale-110 rotate-3 shadow-sm' : ''
                      } ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                        <IconComponent className="w-3.5 h-3.5 stroke-[2px]" />
                      </div>
                      <span className={`truncate font-bold tracking-tight ${isSelected ? 'text-white dark:text-slate-950' : 'text-brand-navy dark:text-slate-200'}`}>{cat}</span>
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                      <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border transition-all ${
                        isSelected
                          ? 'bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950 border-transparent'
                          : 'bg-brand-navy/5 dark:bg-slate-800 text-brand-navy dark:text-slate-300 border-brand-navy/10 dark:border-slate-700'
                      }`}>
                        {totalCount}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded 
                          ? 'rotate-90 ' + (isSelected ? 'text-white dark:text-slate-950' : 'text-brand-gold') 
                          : (isSelected ? 'text-white dark:text-slate-950' : 'text-brand-gold/70')
                      }`} />
                    </div>
                  </button>
                  {/* Nested Subcategories with Accordion Animation */}
                  {isExpanded && catConfig && catConfig.subcategories.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pl-6 pr-1 py-1 flex flex-col gap-1 border-l-2 border-brand-navy/10 dark:border-slate-700 ml-5 my-0.5"
                    >
                      {catConfig.subcategories.map(sub => {
                        const isSubSelected = selectedSubcategories.includes(sub);
                        const subCount = categoryCounts.subcounts[`${cat}_${sub}`] || 0;
                        return (
                          <button
                            key={sub}
                            onClick={() => toggleSubcategory(sub)}
                            className={`w-full flex items-center justify-between text-left text-xs px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer border ${
                              isSubSelected
                                ? 'bg-brand-navy/10 dark:bg-slate-800 text-brand-navy dark:text-amber-400 border-brand-navy/20 dark:border-slate-700 font-bold font-mono'
                                : 'text-brand-navy/75 dark:text-slate-400 border-transparent hover:bg-brand-navy/5 dark:hover:bg-slate-800/60 font-medium'
                            }`}
                          >
                            <span className="truncate">{sub}</span>
                            <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full border transition-all ${
                              isSubSelected
                                ? 'bg-brand-navy dark:bg-amber-400 text-white dark:text-slate-950 border-transparent'
                                : 'bg-brand-navy/5 dark:bg-slate-800 text-brand-navy dark:text-slate-400 border-brand-navy/10 dark:border-slate-700'
                            }`}>
                              {subCount}
                            </span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Locations */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400 mb-3">Campus Locations</h4>
          <div className="flex flex-col gap-2.5 max-h-[180px] overflow-y-auto pr-1">
            {LOCATIONS.map(loc => (
              <label key={loc} className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
                <span className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={selectedLocations.includes(loc)}
                    onChange={() => toggleLocation(loc)}
                    className="rounded border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                  />
                  {loc.split(' – ')[0]}
                </span>
                <span className="text-[10px] text-brand-ink3 dark:text-slate-400">
                  {items.filter(i => i.location === loc).length}
                </span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile/Tablet Side Drawer Filters Overlay */}
      {showMobileFilters && (
        <div className="fixed inset-0 bg-brand-navy/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111A2E] w-[310px] max-w-[85vw] h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 border-l border-brand-border dark:border-slate-800">
            <div>
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-brand-border dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-brand-gold" />
                  <h3 className="font-serif text-base font-black text-brand-navy dark:text-white">Filter Items</h3>
                </div>
                <button 
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1.5 hover:bg-brand-cream dark:hover:bg-slate-800 rounded-lg text-brand-ink3 dark:text-slate-400 hover:text-brand-navy dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Type */}
              <div className="border-b border-brand-border dark:border-slate-800 pb-5 mb-5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400 mb-3">Item Type</h4>
                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
                    <span className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        checked={selectedType === 'all'} 
                        onChange={() => setSelectedType('all')} 
                        className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                      />
                      All Items
                    </span>
                    <span className="bg-brand-surface2 dark:bg-slate-800 text-brand-ink3 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </label>
                  <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
                    <span className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        checked={selectedType === 'lost'} 
                        onChange={() => setSelectedType('lost')} 
                        className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                      />
                      Lost Items
                    </span>
                    <span className="bg-brand-surface2 dark:bg-slate-800 text-brand-ink3 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {items.filter(i => i.type === 'lost').length}
                    </span>
                  </label>
                  <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
                    <span className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        checked={selectedType === 'found'} 
                        onChange={() => setSelectedType('found')} 
                        className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                      />
                      Found Items
                    </span>
                    <span className="bg-brand-surface2 dark:bg-slate-800 text-brand-ink3 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {items.filter(i => i.type === 'found').length}
                    </span>
                  </label>
                </div>
              </div>

              {/* Mobile Filter Status */}
              <div className="border-b border-brand-border dark:border-slate-800 pb-5 mb-5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400 mb-3">Status</h4>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
                    <span className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        checked={selectedStatus === 'all'} 
                        onChange={() => setSelectedStatus('all')} 
                        className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                      />
                      All Statuses
                    </span>
                    <span className="bg-brand-surface2 dark:bg-slate-800 text-brand-ink3 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </label>
                  <label className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
                    <span className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        checked={selectedStatus === 'reunited'} 
                        onChange={() => setSelectedStatus('reunited')} 
                        className="rounded-full border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                      />
                      Reunited & Returned
                    </span>
                    <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700/50">
                      {items.filter(i => i.status === 'returned' || i.status === 'reunited' || i.status === 'claimed' || i.status === 'resolved').length}
                    </span>
                  </label>
                </div>
              </div>

              {/* Categories */}
              <div className="border-b border-brand-border dark:border-slate-800 pb-5 mb-5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400 mb-3">Categories</h4>
                <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {CATEGORIES.map(cat => {
                    const catStyle = getCategoryStyle(cat);
                    const IconComponent = catStyle.icon;
                    const isSelected = selectedCategories.includes(cat);
                    const itemCount = items.filter(i => i.category === cat).length;
                    
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`w-full flex items-center justify-between text-left text-xs sm:text-sm px-2.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-brand-navy dark:bg-amber-500 text-white dark:text-slate-950 font-bold shadow-md border border-transparent hover:bg-brand-navy/95 dark:hover:bg-amber-400' 
                            : 'text-brand-navy/90 dark:text-slate-200 hover:bg-brand-navy/5 dark:hover:bg-slate-800/80 hover:text-brand-navy dark:hover:text-white border border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${
                            isSelected ? 'scale-110 rotate-3 shadow-sm' : ''
                          } ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                            <IconComponent className="w-3.5 h-3.5 stroke-[2px]" />
                          </div>
                          <span className={`truncate font-bold tracking-tight ${isSelected ? 'text-white dark:text-slate-950' : 'text-brand-navy dark:text-slate-200'}`}>{cat}</span>
                        </span>
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border transition-all ${
                          isSelected
                            ? 'bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950 border-transparent'
                            : 'bg-brand-navy/5 dark:bg-slate-800 text-brand-navy dark:text-slate-300 border-brand-navy/10 dark:border-slate-700'
                        }`}>
                          {itemCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locations */}
              <div className="pb-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400 mb-3">Campus Locations</h4>
                <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {LOCATIONS.map(loc => (
                    <label key={loc} className="flex items-center justify-between text-xs sm:text-sm text-brand-ink2 dark:text-slate-300 cursor-pointer font-medium">
                      <span className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={selectedLocations.includes(loc)}
                          onChange={() => toggleLocation(loc)}
                          className="rounded border-brand-border dark:border-slate-700 text-brand-gold focus:ring-brand-gold/10"
                        />
                        {loc.split(' – ')[0]}
                      </span>
                      <span className="text-[10px] text-brand-ink3 dark:text-slate-400">
                        {items.filter(i => i.location === loc).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-brand-border dark:border-slate-800 mt-auto flex gap-2">
              <button 
                onClick={() => { clearAllFilters(); setShowMobileFilters(false); }}
                className="flex-1 py-2.5 border border-brand-border dark:border-slate-700 text-xs font-bold text-brand-navy dark:text-white hover:bg-brand-cream dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Clear All
              </button>
              <button 
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 py-2.5 bg-gradient-to-r from-brand-gold to-brand-gold-mid text-[#0D1B2A] text-xs font-black rounded-xl shadow cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid view of Listings */}
      <main className="p-4 sm:p-6 md:p-8 bg-brand-cream dark:bg-[#0B111E] overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-start lg:items-center justify-between gap-4 mb-6 border-b border-brand-border/40 dark:border-slate-800/80 pb-5">
          {/* Search with Filter Button for Mobile */}
          <div className="flex flex-col gap-2.5 flex-1 w-full max-w-xl">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden inline-flex items-center justify-center w-11 h-11 bg-white dark:bg-[#162232] border border-brand-border dark:border-slate-700 rounded-xl text-brand-navy dark:text-white hover:bg-brand-cream dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
                title="Show filters"
              >
                <SlidersHorizontal className="w-5 h-5 text-brand-gold" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-brand-ink3 dark:text-slate-400" />
                <input 
                  id="global-search-input"
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items by title or category..."
                  className="w-full pl-11 pr-10 py-3 bg-white dark:bg-[#162232] border border-brand-border dark:border-slate-700 rounded-xl text-brand-ink dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm outline-none focus:border-brand-gold dark:focus:border-brand-gold transition-all shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-brand-cream dark:hover:bg-slate-800 rounded-full text-brand-ink3 dark:text-slate-400 hover:text-brand-navy dark:hover:text-white transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scope Filter Pills */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-ink2 dark:text-slate-300 px-1 flex-wrap">
              <span className="text-brand-ink3/80 dark:text-slate-400 font-medium">Search by:</span>
              <button
                type="button"
                onClick={() => setSearchTarget('all')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer border ${
                  searchTarget === 'all' 
                    ? 'bg-brand-gold/15 dark:bg-brand-gold/20 border-brand-gold text-brand-navy dark:text-amber-300 font-bold' 
                    : 'bg-white dark:bg-[#162232] border-brand-border dark:border-slate-700 text-brand-ink2 dark:text-slate-300 hover:border-brand-ink3/40'
                }`}
              >
                All fields
              </button>
              <button
                type="button"
                onClick={() => setSearchTarget('title')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer border ${
                  searchTarget === 'title' 
                    ? 'bg-brand-gold/15 dark:bg-brand-gold/20 border-brand-gold text-brand-navy dark:text-amber-300 font-bold' 
                    : 'bg-white dark:bg-[#162232] border-brand-border dark:border-slate-700 text-brand-ink2 dark:text-slate-300 hover:border-brand-ink3/40'
                }`}
              >
                Title
              </button>
              <button
                type="button"
                onClick={() => setSearchTarget('category')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer border ${
                  searchTarget === 'category' 
                    ? 'bg-brand-gold/15 dark:bg-brand-gold/20 border-brand-gold text-brand-navy dark:text-amber-300 font-bold' 
                    : 'bg-white dark:bg-[#162232] border-brand-border dark:border-slate-700 text-brand-ink2 dark:text-slate-300 hover:border-brand-ink3/40'
                }`}
              >
                Category
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto self-end md:self-center flex-wrap sm:flex-nowrap">
            <span className="text-xs font-semibold text-brand-ink2 dark:text-slate-400 whitespace-nowrap">{sortedItems.length} listings found</span>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-[#162232] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs sm:text-sm outline-none focus:border-amber-500 cursor-pointer shadow-xs font-medium"
              >
                <option value="Newest First">Newest First (Posted)</option>
                <option value="Oldest First">Oldest First (Posted)</option>
                <option value="Incident Date (Recent)">Incident Date (Recent)</option>
                <option value="Incident Date (Oldest)">Incident Date (Oldest)</option>
                <option value="Most Viewed">Most Viewed</option>
                <option value="Title (A-Z)">Title (A-Z)</option>
                <option value="Title (Z-A)">Title (Z-A)</option>
              </select>
              <button 
                onClick={() => onTabChange('post')}
                className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-brand-gold to-brand-gold-mid text-[#0D1B2A] font-bold rounded-xl text-xs sm:text-sm cursor-pointer shadow-md hover:brightness-105 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Post Item</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Segmented Toggle for Lost/Found/All/Saved */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white dark:bg-[#111A2E] p-2 rounded-2xl border border-brand-border/70 dark:border-slate-800 shadow-sm transition-all w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0 w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-ink2 dark:text-slate-400 sm:pl-1.5 shrink-0">Quick Filter:</span>
            <div className="flex items-center p-1 bg-brand-cream dark:bg-[#162232] rounded-xl border border-brand-border/60 dark:border-slate-700 overflow-x-auto no-scrollbar touch-scroll gap-1 w-full max-w-full">
              <button
                type="button"
                onClick={() => { setSelectedType('all'); setSelectedStatus('all'); setShowOnlySaved(false); }}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer text-center whitespace-nowrap shrink-0 ${
                  selectedType === 'all' && selectedStatus === 'all' && !showOnlySaved
                    ? 'bg-brand-navy dark:bg-amber-400 text-white dark:text-slate-950 font-bold shadow-sm'
                    : 'text-brand-ink2 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                All Items ({items.length})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedType('lost'); setSelectedStatus('all'); setShowOnlySaved(false); }}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  selectedType === 'lost' && selectedStatus === 'all' && !showOnlySaved
                    ? 'bg-rose-600 text-white shadow-sm border border-rose-500/15'
                    : 'text-brand-ink2 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Lost ({items.filter(i => i.type === 'lost').length})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedType('found'); setSelectedStatus('all'); setShowOnlySaved(false); }}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  selectedType === 'found' && selectedStatus === 'all' && !showOnlySaved
                    ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500/15'
                    : 'text-brand-ink2 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Found ({items.filter(i => i.type === 'found').length})
              </button>
              <button
                type="button"
                onClick={() => { setSelectedStatus(selectedStatus === 'reunited' ? 'all' : 'reunited'); setShowOnlySaved(false); }}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  selectedStatus === 'reunited' && !showOnlySaved
                    ? 'bg-emerald-700 text-white shadow-sm border border-emerald-500'
                    : 'text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
                title="View successfully returned and reunited items"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reunited ({items.filter(i => i.status === 'returned' || i.status === 'reunited' || i.status === 'claimed').length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isLoggedIn) {
                    if (onShowToast) onShowToast("Please log in to view and manage your saved bookmarks.", "info");
                  } else if ((savedItemIds || []).length === 0 && !showOnlySaved) {
                    if (onShowToast) onShowToast("You haven't saved any items yet. Click 'Save Item' on any listing to bookmark it!", "info");
                  }
                  setShowOnlySaved(!showOnlySaved);
                }}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  showOnlySaved
                    ? 'bg-amber-500 text-white shadow-sm border border-amber-400'
                    : 'text-brand-ink2 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${showOnlySaved ? 'fill-current' : 'text-brand-gold'}`} />
                <span>Saved ({savedItemIds.length})</span>
              </button>
            </div>
          </div>

          {/* Active category / location filter tags summary */}
          {(selectedCategories.length > 0 || selectedLocations.length > 0) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-brand-ink3 dark:text-slate-400">Active filters:</span>
              {selectedCategories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-gold/10 text-brand-navy dark:text-amber-300 text-[10px] font-bold border border-brand-gold/20 animate-in fade-in zoom-in duration-150">
                  {cat}
                  <button onClick={() => toggleCategory(cat)} className="hover:text-rose-500 font-bold ml-0.5 cursor-pointer" title={`Remove ${cat}`}>×</button>
                </span>
              ))}
              {selectedLocations.map(loc => (
                <span key={loc} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-navy/5 dark:bg-slate-800 text-brand-navy dark:text-slate-300 text-[10px] font-bold animate-in fade-in zoom-in duration-150">
                  {loc.split(' – ')[0]}
                  <button onClick={() => toggleLocation(loc)} className="hover:text-rose-500 font-bold ml-0.5 cursor-pointer" title={`Remove ${loc}`}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Display shimmer loaders if loading */}
        {isLoading ? (
          renderSkeletons()
        ) : sortedItems.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-auto my-6 p-8 sm:p-12 bg-gradient-to-b from-[#0F172A] via-[#0B0F19] to-[#020617] border border-slate-800 rounded-[32px] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)] text-center relative overflow-hidden"
          >
            {/* Top decorative boundary light effect */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-gold/25 to-transparent pointer-events-none" />

            {/* Soft radial ambient glow behind the illustration */}
            <div className="absolute top-[120px] left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-brand-gold/10 blur-[80px] pointer-events-none" />
            <div className="absolute -left-20 -top-20 w-52 h-52 rounded-full bg-brand-gold/5 blur-3xl pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 w-52 h-52 rounded-full bg-slate-900/40 blur-3xl pointer-events-none" />

            {/* Premium Floating Graphic Illustration */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
              transition={{
                opacity: { duration: 0.6, ease: "easeOut" },
                scale: { duration: 0.6, ease: "easeOut" },
                y: { repeat: Infinity, duration: 5, ease: "easeInOut" }
              }}
              className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center"
            >
              {/* Spinning background outline halo */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-brand-gold/30"
              />
              
              {/* Pulse ripple element / Gentle glow */}
              <div className="absolute w-28 h-28 rounded-full bg-brand-gold/10 blur-xl opacity-75" />
              <div className="absolute w-20 h-20 rounded-full bg-brand-gold/5 animate-ping opacity-30" />

              {/* Main glass card and floating items */}
              <div className="absolute w-24 h-24 rounded-3xl bg-slate-900/85 border border-slate-700/60 shadow-[0_12px_24px_rgba(0,0,0,0.5)] flex items-center justify-center relative z-10">
                <Inbox className="w-11 h-11 text-brand-gold" />
              </div>

              {/* Animated Floating Little Search Badge */}
              <motion.div 
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute top-2 -right-1 bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-xl z-20"
              >
                <Search className="w-4 h-4 text-brand-gold" />
              </motion.div>

              {/* Animated Floating Sparks Badge */}
              <motion.div 
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-2 -left-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700 shadow-xl z-20"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F4C430]" />
              </motion.div>
            </motion.div>

            {/* Primary Text Content */}
            <h4 className="font-sans text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-3">
              No Matching Lost &amp; Found Items
            </h4>
            
            <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed mb-8">
              {searchTerm.trim() !== '' ? (
                <span>
                  We couldn't find any items matching <strong className="text-brand-gold font-bold">"{searchTerm}"</strong>. Try checking your spelling, using less specific keywords, or be the first to post an item to help the JKKNIU community.
                </span>
              ) : (
                <span>
                  We couldn't find any Lost or Found items matching your current filters. Try adjusting your search, changing categories, or be the first to post an item and help the JKKNIU community.
                </span>
              )}
            </p>

            {/* Interactive Filter Pills in Empty State */}
            {(selectedCategories.length > 0 || selectedLocations.length > 0 || selectedType !== 'all' || searchTerm.trim() !== '') && (
              <div className="bg-slate-950/40 border border-slate-800/80 p-4.5 rounded-2xl mb-8 max-w-lg mx-auto text-left">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3.5">
                  Click to remove specific active filters:
                </span>
                <div className="flex flex-wrap gap-2">
                  {/* Search query tag */}
                  {searchTerm.trim() !== '' && (
                    <button 
                      onClick={() => { setSearchTerm(''); setDebouncedSearchTerm(''); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/25 transition-all cursor-pointer group"
                    >
                      <span>Search: "{searchTerm}"</span>
                      <X className="w-3.5 h-3.5 text-rose-400/60 group-hover:text-rose-400 transition-colors" />
                    </button>
                  )}

                  {/* Type filter tag */}
                  {selectedType !== 'all' && (
                    <button 
                      onClick={() => setSelectedType('all')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer group ${
                        selectedType === 'lost' 
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20' 
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      <span className="capitalize">{selectedType} items</span>
                      <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
                    </button>
                  )}

                  {/* Category tags */}
                  {selectedCategories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all cursor-pointer group"
                    >
                      <span>{cat}</span>
                      <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
                    </button>
                  ))}

                  {/* Location tags */}
                  {selectedLocations.map(loc => (
                    <button 
                      key={loc}
                      onClick={() => toggleLocation(loc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-all cursor-pointer group"
                    >
                      <span>{loc.split(' – ')[0]}</span>
                      <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Suggestions Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8 text-left">
              <div className="p-5 bg-slate-900/40 border border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] rounded-2xl flex gap-4 hover:-translate-y-0.5 hover:border-brand-gold/30 hover:shadow-lg hover:shadow-brand-gold/5 transition-all duration-300 group">
                <div className="p-2.5 rounded-xl bg-brand-gold/10 text-brand-gold border border-brand-gold/20 group-hover:scale-105 transition-transform flex-shrink-0 h-10 w-10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white mb-1">Broader Keywords</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Try searching for simple general keywords (e.g., "keys" instead of "rusty key ring").
                  </p>
                </div>
              </div>

              <div className="p-5 bg-slate-900/40 border border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.15)] rounded-2xl flex gap-4 hover:-translate-y-0.5 hover:border-brand-gold/30 hover:shadow-lg hover:shadow-brand-gold/5 transition-all duration-300 group">
                <div className="p-2.5 rounded-xl bg-brand-gold/10 text-brand-gold border border-brand-gold/20 group-hover:scale-105 transition-transform flex-shrink-0 h-10 w-10 flex items-center justify-center">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white mb-1">Check Category</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    An item might be cataloged under a different category than expected. Try clearing categories.
                  </p>
                </div>
              </div>
            </div>

            {/* Friendly CTA text */}
            <p className="text-[11px] text-slate-500 font-semibold max-w-sm mx-auto mb-5 tracking-wide leading-relaxed">
              Can't find what you're looking for? Be the first to post a Lost or Found item and help someone in the JKKNIU community.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
              <button 
                onClick={clearAllFilters}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-brand-gold to-brand-gold-mid text-[#0D1B2A] font-extrabold text-xs tracking-wider uppercase rounded-2xl shadow-[0_4px_20px_rgba(244,196,48,0.25)] hover:shadow-[0_6px_24px_rgba(244,196,48,0.4)] hover:brightness-110 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all duration-300 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                Reset Search &amp; Filters
              </button>
              
              <button 
                onClick={() => onTabChange('post')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-900 border border-slate-700/80 hover:border-brand-gold/60 text-slate-300 hover:text-white hover:bg-slate-800 font-extrabold text-xs tracking-wider uppercase rounded-2xl shadow-sm hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-brand-gold/40 transition-all duration-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-brand-gold" />
                Post This Item Instead
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-4 sm:gap-6">
            {sortedItems.map((item, index) => {
              const matches = findPotentialMatches(item, items);
              const bestMatch = matches.length > 0 ? matches[0] : null;
              const catStyle = getCategoryStyle(item.category);
              const CatIcon = catStyle.icon;
              const isItemSaved = (savedItemIds || []).includes(String(item.id));

              const isReunitedOrReturned = item.status === 'returned' || item.status === 'reunited' || item.status === 'claimed' || item.status === 'resolved';

              return (
                <motion.div 
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 350, 
                    damping: 22,
                    opacity: { duration: 0.3, delay: Math.min(index * 0.05, 0.6) },
                    y: { type: 'spring', stiffness: 300, damping: 24, delay: Math.min(index * 0.05, 0.6) }
                  }}
                  className={`bg-white dark:bg-[#111A2E] hover:bg-amber-50/20 dark:hover:bg-[#162238] rounded-[24px] p-5 flex flex-col justify-between cursor-pointer group shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(217,119,6,0.12)] transition-all duration-300 relative border ${
                    isReunitedOrReturned 
                      ? 'border-emerald-300/80 dark:border-emerald-700/60 hover:border-emerald-500 dark:hover:border-emerald-500' 
                      : 'border-amber-200/70 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50'
                  }`}
                >
                  {/* Image Container with Soft Gradient Background */}
                  <div className="h-48 bg-slate-100/90 dark:bg-[#0B111E] rounded-[18px] flex items-center justify-center relative overflow-hidden border border-slate-200/70 dark:border-slate-800">
                    {item.image ? (
                      <>
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-cover transform group-hover:scale-104 transition-transform duration-500 ease-out" 
                          referrerPolicy="no-referrer"
                        />
                        {item.images && item.images.length > 1 && (
                          <div className="absolute bottom-3 left-3 bg-slate-950/80 text-white/95 border border-white/20 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wide flex items-center gap-1.5 z-20 backdrop-blur-md shadow-sm">
                            <ImageIcon className="w-3.5 h-3.5 text-[#F4C430]" />
                            <span>{item.images.length} Photos</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Glowing Decorative Blurred Circles behind Item Icon */}
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-amber-400/10 blur-2xl group-hover:scale-130 transition-transform duration-700 pointer-events-none" />
                        <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl group-hover:scale-130 transition-transform duration-700 pointer-events-none" />
                        
                        {/* Premium Glass Plate Card for Icon with Micro Zoom Animation */}
                        <div className="w-20 h-20 rounded-[20px] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md flex flex-col items-center justify-center shadow-md border border-amber-200/50 dark:border-amber-500/30 transform group-hover:scale-108 group-hover:rotate-1 transition-all duration-300 relative z-10 text-amber-600 dark:text-amber-400 filter drop-shadow-sm select-none">
                          <Inbox className="w-8 h-8 opacity-90 text-amber-600 dark:text-amber-400 mb-1" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 text-center">No Image</span>
                        </div>
                      </>
                    )}

                    {/* Reunited / Returned Celebration Ribbon */}
                    {isReunitedOrReturned && (
                      <div className="absolute inset-x-0 bottom-0 py-1.5 bg-gradient-to-r from-emerald-700/95 via-teal-700/95 to-emerald-700/95 backdrop-blur-md text-white text-center text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 z-20 border-t border-emerald-400/40 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                        <span>{item.type === 'lost' ? '🎉 Reunited with Owner' : '✓ Returned to Owner'}</span>
                      </div>
                    )}

                    {/* Left corner: Redesigned LOST / FOUND Badge & Status Badge */}
                    <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start">
                      {item.type === 'lost' ? (
                        <span className="bg-rose-600 text-white border border-rose-400/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm transform group-hover:scale-105 transition-transform duration-200">
                          <AlertCircle className="w-3 h-3 text-white stroke-[2.5px]" />
                          <span>Lost</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-600 text-white border border-emerald-400/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm transform group-hover:scale-105 transition-transform duration-200">
                          <Check className="w-3 h-3 text-white stroke-[2.5px]" />
                          <span>Found</span>
                        </span>
                      )}

                      {/* Status indicator badge */}
                      {(() => {
                        switch (item.status) {
                          case 'handover_pending':
                            return (
                              <span className="bg-indigo-600 text-white border border-indigo-400/30 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xs animate-pulse">
                                <Clock className="w-2.5 h-2.5 text-white" />
                                <span>Handover Pending</span>
                              </span>
                            );
                          case 'under_verification':
                          case 'claim_requested':
                            return (
                              <span className="bg-amber-600 text-white border border-amber-400/30 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xs">
                                <Clock className="w-2.5 h-2.5 text-white" />
                                <span>In Verification</span>
                              </span>
                            );
                          case 'claimed':
                            return (
                              <span className="bg-blue-600 text-white border border-blue-400/30 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                <span>Claimed</span>
                              </span>
                            );
                          case 'returned':
                          case 'reunited':
                            return (
                              <span className="bg-emerald-600 text-white border border-emerald-400/30 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                <span>{item.type === 'lost' ? 'Reunited' : 'Returned'}</span>
                              </span>
                            );
                          case 'closed':
                            return (
                              <span className="bg-slate-600 text-white border border-slate-400/30 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xs">
                                <AlertCircle className="w-2.5 h-2.5 text-white" />
                                <span>Closed</span>
                              </span>
                            );
                          default:
                            return (
                              <span className="bg-teal-600 text-white border border-teal-400/30 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xs">
                                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                                <span>Available</span>
                              </span>
                            );
                        }
                      })()}

                      {/* Reward Offered Badge - only if owner provided a real reward amount/token */}
                      {item.type === 'lost' && hasItemReward(item) && (
                        <span 
                          className="bg-amber-500 text-slate-950 border border-amber-300 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xs"
                          title={`Reward Offered: ${getRewardDetails(item)}`}
                        >
                          <span>🎁 Reward</span>
                        </span>
                      )}
                    </div>

                    {/* Top Right: Bookmark & Share Actions */}
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToShare(item);
                        }}
                        aria-label="Share this listing"
                        className="w-8 h-8 rounded-full bg-slate-950/80 hover:bg-amber-500 text-white/90 hover:text-slate-950 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                        title="Share on Facebook, Messenger, WhatsApp, or Copy Link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      
                      {onToggleSaveItem && (
                        <div className="relative">
                          <motion.button
                            whileTap={{ scale: 0.82 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isLoggedIn && onRequireLogin) {
                                onRequireLogin({ type: 'save_item', item });
                              } else {
                                const nextState = !isItemSaved;
                                onToggleSaveItem(String(item.id), item.title);
                                setRecentSavedFeedback({
                                  itemId: String(item.id),
                                  type: nextState ? 'saved' : 'unsaved',
                                  title: item.title
                                });
                                setTimeout(() => {
                                  setRecentSavedFeedback(prev => (prev?.itemId === String(item.id) ? null : prev));
                                }, 2500);
                              }
                            }}
                            aria-label={isItemSaved ? 'Remove from Saved' : 'Save Item'}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center backdrop-blur-md shadow-sm transition-all duration-200 cursor-pointer ${
                              isItemSaved 
                                ? 'bg-slate-950/95 text-amber-400 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/40' 
                                : 'bg-slate-950/80 hover:bg-slate-900 text-white/90 border-white/20 hover:scale-110'
                            }`}
                            title={isItemSaved ? 'Saved in Bookmarks (Click to Remove)' : 'Bookmark Item'}
                          >
                            <motion.div
                              animate={
                                recentSavedFeedback?.itemId === String(item.id) && recentSavedFeedback.type === 'saved'
                                  ? { scale: [1, 1.45, 1], rotate: [0, -15, 15, 0] }
                                  : {}
                              }
                              transition={{ duration: 0.35 }}
                            >
                              <Bookmark className={`w-3.5 h-3.5 transition-colors duration-200 ${isItemSaved ? 'fill-amber-400 text-amber-400' : 'text-white/80'}`} />
                            </motion.div>
                          </motion.button>

                          {/* Floating Bookmark Confirmation Message */}
                          <AnimatePresence>
                            {recentSavedFeedback?.itemId === String(item.id) && (
                              <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.85 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                className={`absolute top-10 right-0 z-30 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1.5 shadow-xl border pointer-events-none backdrop-blur-md whitespace-nowrap ${
                                  recentSavedFeedback.type === 'saved'
                                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.4)]'
                                    : 'bg-slate-900/95 text-slate-200 border-slate-700'
                                }`}
                              >
                                {recentSavedFeedback.type === 'saved' ? (
                                  <>
                                    <Sparkles className="w-3 h-3 text-slate-950 flex-shrink-0 animate-spin" />
                                    <span>Saved to Bookmarks!</span>
                                  </>
                                ) : (
                                  <>
                                    <Bookmark className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                    <span>Removed</span>
                                  </>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {/* View Counter Tag overlay inside image corner */}
                    <div className="absolute bottom-3 right-3 bg-slate-950/80 text-white/95 border border-white/20 px-2 py-0.5 rounded-full text-[9px] font-medium tracking-wide flex items-center gap-1 z-20 backdrop-blur-md shadow-xs">
                      <Eye className="w-3.5 h-3.5 text-[#F4C430]" />
                      <span>{item.views}</span>
                    </div>
                  </div>

                  {/* Details Area */}
                  <div className="pt-4.5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Premium Item Title - Bold, maximum 2 lines */}
                      <h4 className="font-sans text-base sm:text-lg leading-snug font-extrabold text-slate-900 dark:text-white line-clamp-2 h-14 mb-3 transition-colors group-hover:text-amber-700 dark:group-hover:text-amber-400">
                        {item.title}
                      </h4>

                      {/* Redesigned Location & Posted Date Metadata */}
                      <div className="space-y-1.5 mb-4">
                        <p className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <span className="truncate">{formatPostTime(item.createdAt || item.date)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Divider and Footer Quick Actions */}
                    {/* Divider and Footer Quick Actions */}
                    <div className="pt-3.5 border-t border-amber-200/60 dark:border-slate-800 space-y-2.5">
                      {/* Premium Category tag & Subcategory */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide border transition-all duration-300 truncate max-w-full ${catStyle.badgeClass}`}>
                          <CatIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.category}</span>
                        </span>
                        {item.subcategory && (
                          <span className="text-[9px] font-mono font-medium text-slate-600 dark:text-slate-400 truncate max-w-[130px]">
                            ↳ {item.subcategory}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons Row: Status indicator & Contact */}
                      <div className="flex items-center gap-2 pt-0.5">
                        {(() => {
                          const isOwner = currentUser && (
                            (currentUser.id && (
                              (item.userId && String(currentUser.id) === String(item.userId)) ||
                              ((item as any).firebaseUid && String(currentUser.id) === String((item as any).firebaseUid)) ||
                              ((item as any).ownerUid && String(currentUser.id) === String((item as any).ownerUid)) ||
                              (item.postedBy && (item.postedBy as any).userId && String(currentUser.id) === String((item.postedBy as any).userId))
                            )) ||
                            (currentUser.email && (
                              (item.email && currentUser.email.toLowerCase() === item.email.toLowerCase()) ||
                              ((item.postedBy as any)?.email && currentUser.email.toLowerCase() === (item.postedBy as any).email.toLowerCase())
                            ))
                          );

                          const isReunitedOrReturned = item.status === 'returned' || item.status === 'reunited' || item.status === 'claimed' || item.status === 'resolved';

                          if (isOwner) {
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectItem(item);
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-[11px] rounded-xl border border-slate-300 dark:border-slate-700 transition-all duration-200 active:scale-95 shadow-xs cursor-pointer min-w-0"
                                title="You are the author of this post. Click to manage."
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <span className="truncate">My Post</span>
                              </button>
                            );
                          }

                          if (isReunitedOrReturned) {
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectItem(item);
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px] rounded-xl border border-emerald-300 dark:border-emerald-700 transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer min-w-0"
                                title="Status: Returned / Reunited - Click to view details"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                <span className="truncate">{item.type === 'lost' ? 'Reunited' : 'Returned'}</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectItem(item);
                              }}
                              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 font-bold text-[11px] rounded-xl border transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer min-w-0 ${
                                item.type === 'found'
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              }`}
                              title={`Status: ${item.type === 'found' ? 'Found' : 'Lost'} Item - Click to view`}
                            >
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.type === 'found' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span className="truncate">{item.type === 'found' ? 'Found Item' : 'Lost Item'}</span>
                            </button>
                          );
                        })()}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onContactPoster(item);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-amber-400 hover:bg-amber-500 dark:hover:bg-amber-300 text-amber-300 dark:text-slate-950 hover:text-slate-950 border border-slate-800 dark:border-amber-400 font-extrabold text-[11px] rounded-xl transition-all duration-200 active:scale-95 shadow-sm cursor-pointer hover:-translate-y-0.5 min-w-0"
                        >
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.type === 'lost' ? 'Contact Owner' : 'Contact Finder'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Share Modal */}
      <ShareModal
        item={itemToShare}
        isOpen={itemToShare !== null}
        onClose={() => setItemToShare(null)}
        onShowToast={onShowToast || ((msg) => console.log(msg))}
      />
    </div>
  );
}
