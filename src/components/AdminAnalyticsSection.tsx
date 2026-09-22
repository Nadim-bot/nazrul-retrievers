import { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  PieChart as PieIcon, 
  RefreshCw, 
  CheckCircle2, 
  Inbox, 
  Building2,
  FileSpreadsheet,
  Eye,
  Users,
  Search,
  Clock,
  Clock4,
  Layers,
  Sparkles,
  UserCheck,
  Calendar,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../utils/api';
import { Item } from '../types';

interface DailyVolume {
  date: string;
  day: string;
  lost: number;
  found: number;
  posts: number;
  registrations?: number;
  claims?: number;
}

interface CategoryDistribution {
  name: string;
  value: number;
  color: string;
}

interface DepartmentDistribution {
  department: string;
  count: number;
}

interface UserGrowth {
  month: string;
  students: number;
  staff: number;
  total: number;
}

interface DynamicInsight {
  type: string;
  title: string;
  description: string;
}

interface RecentRegisteredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  studentId: string;
  isVerified: boolean;
  idVerificationStatus?: 'verified' | 'pending' | 'unverified' | 'rejected';
  hasIdDocument?: boolean;
  createdAt: string;
  status: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 18
    }
  }
};

const CHART_COLORS = [
  '#C9963F', // Gold
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B'  // Slate
];

export default function AdminAnalyticsSection({ items = [] }: { items?: Item[] }) {
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [subcategories, setSubcategories] = useState<{ name: string; value: number; color: string }[]>([]);
  const [departments, setDepartments] = useState<DepartmentDistribution[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserGrowth[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentRegisteredUser[]>([]);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [rawAnalytics, setRawAnalytics] = useState<any>(null);

  // Dynamic fallback calculation for categories if backend payload is loading
  const computeLocalCategories = (itemList: Item[]) => {
    const counts: { [key: string]: number } = {};
    itemList.forEach(item => {
      if (item.isDeleted || item.status === 'deleted') return;
      const cat = item.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.keys(counts).map((name, index) => ({
      name,
      value: counts[name],
      color: CHART_COLORS[index % CHART_COLORS.length]
    })).sort((a, b) => b.value - a.value);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/analytics');
      if (res && !res.error) {
        setRawAnalytics(res);

        // 1. Daily Activity (real lost vs found per day)
        if (res.dailyActivity && Array.isArray(res.dailyActivity)) {
          setDailyVolume(res.dailyActivity.map((d: any) => ({
            date: d.date,
            day: d.day || d.date,
            lost: d.lost || 0,
            found: d.found || 0,
            posts: d.posts || (d.lost || 0) + (d.found || 0),
            registrations: d.registrations || 0,
            claims: d.claims || 0
          })));
        }

        // 2. Categories Distribution
        if (res.postsByCategory && Array.isArray(res.postsByCategory) && res.postsByCategory.length > 0) {
          const mappedCats = res.postsByCategory.map((c: any, index: number) => ({
            name: c.category || 'Other',
            value: c.count || 0,
            color: CHART_COLORS[index % CHART_COLORS.length]
          }));
          setCategories(mappedCats);
        } else if (items.length > 0) {
          setCategories(computeLocalCategories(items));
        }

        // 3. Subcategories Distribution
        if (res.postsBySubcategory && Array.isArray(res.postsBySubcategory)) {
          const mappedSubs = res.postsBySubcategory.map((s: any, index: number) => ({
            name: s.subcategory || 'Other',
            value: s.count || 0,
            color: CHART_COLORS[index % CHART_COLORS.length]
          })).slice(0, 8);
          setSubcategories(mappedSubs);
        }

        // 4. Department Distribution
        if (res.postsByDepartment && Array.isArray(res.postsByDepartment)) {
          setDepartments(res.postsByDepartment.slice(0, 7));
        }

        // 5. User Growth Trajectory
        if (res.usersJoinedPerMonth && Array.isArray(res.usersJoinedPerMonth)) {
          setUserGrowth(res.usersJoinedPerMonth);
        }

        // 6. Recent Registered Users (Live Data)
        if (res.recentRegisteredUsers && Array.isArray(res.recentRegisteredUsers)) {
          setRecentUsers(res.recentRegisteredUsers);
        }

        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.warn('Failed to load real-time analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on component mount only - subsequent fetches are triggered manually via the 'Refresh Data' button
    fetchAnalytics();
  }, []);

  // Executive Overview Stats directly from live data
  const totalPosts = rawAnalytics?.overview?.totalPosts ?? items.filter(i => !i.isDeleted && i.status !== 'deleted').length;
  const lostCount = rawAnalytics?.overview?.lostCount ?? rawAnalytics?.lostVsFound?.lost ?? items.filter(i => !i.isDeleted && i.type === 'lost').length;
  const foundCount = rawAnalytics?.overview?.foundCount ?? rawAnalytics?.lostVsFound?.found ?? items.filter(i => !i.isDeleted && i.type === 'found').length;
  const returnedCount = rawAnalytics?.overview?.returnedItems ?? items.filter(i => !i.isDeleted && ['returned', 'reunited', 'claimed', 'resolved'].includes(i.status)).length;
  const pendingCount = rawAnalytics?.overview?.pendingApproval ?? items.filter(i => !i.isDeleted && (i.status === 'pending' || i.approvalStatus === 'pending')).length;
  const pendingVerificationsCount = recentUsers.filter(u => u.idVerificationStatus === 'pending' || (u.hasIdDocument && u.idVerificationStatus !== 'verified')).length;
  const verifiedUsersCount = recentUsers.filter(u => u.isVerified || u.idVerificationStatus === 'verified').length;
  const totalUsers = rawAnalytics?.overview?.totalUsers ?? (userGrowth.length > 0 ? userGrowth[userGrowth.length - 1].total : 0);
  const studentUsers = rawAnalytics?.overview?.studentUsers ?? 0;
  const staffUsers = rawAnalytics?.overview?.staffUsers ?? 0;
  const returnRate = rawAnalytics?.overview?.returnedRate ?? rawAnalytics?.rates?.returnedRate ?? (totalPosts > 0 ? ((returnedCount / totalPosts) * 100).toFixed(1) : "0.0");
  const avgResolutionHours = rawAnalytics?.overview?.avgResolutionTime ?? rawAnalytics?.avgResolutionTime ?? "0";

  // Top 10 Most Viewed Items
  const getTopViewedItems = () => {
    if (rawAnalytics?.mostViewedPosts && rawAnalytics.mostViewedPosts.length > 0) {
      return rawAnalytics.mostViewedPosts.map((p: any) => ({
        id: p._id || p.id,
        title: p.title,
        category: p.category,
        type: p.type,
        views: p.views || 0,
        status: p.status,
        emoji: p.emoji
      }));
    }
    return [...items]
      .filter(i => !i.isDeleted && i.status !== 'deleted')
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10);
  };

  // CSV Report Generator with 100% real-time data
  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFullReportCSV = () => {
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }) || new Date().toISOString();
    const totalCatValue = categories.reduce((sum, c) => sum + c.value, 0);
    
    let csvContent = `Nazrul Retrievers - Campus Lost and Found Official Analytics Report\n`;
    csvContent += `Generated At: ${timestamp}\n`;
    csvContent += `Total Records: ${totalPosts} (Lost: ${lostCount}, Found: ${foundCount}, Returned: ${returnedCount})\n\n`;
    
    csvContent += `=== SECTION 1: 7-DAY INTAKE VOLUME ===\n`;
    csvContent += `Date,Day,Lost Items,Found Items,Total Posts,User Signups\n`;
    dailyVolume.forEach(item => {
      csvContent += `${item.date},${item.day},${item.lost},${item.found},${item.posts},${item.registrations || 0}\n`;
    });
    csvContent += `\n`;
    
    csvContent += `=== SECTION 2: CATEGORY CLASSIFICATION ===\n`;
    csvContent += `Category,Item Count,Percentage Share\n`;
    categories.forEach(item => {
      const percentage = totalCatValue > 0 ? ((item.value / totalCatValue) * 100).toFixed(1) + "%" : "0%";
      csvContent += `"${item.name}",${item.value},${percentage}\n`;
    });
    csvContent += `\n`;

    csvContent += `=== SECTION 3: DEPARTMENT DISTRIBUTION ===\n`;
    csvContent += `Department,Logged Items Count\n`;
    departments.forEach(dept => {
      csvContent += `"${dept.department}",${dept.count}\n`;
    });
    csvContent += `\n`;
    
    csvContent += `=== SECTION 4: USER REGISTRATIONS TRAJECTORY ===\n`;
    csvContent += `Month,Registered Students,Registered Staff,Total Accounts\n`;
    userGrowth.forEach(item => {
      csvContent += `"${item.month}",${item.students},${item.staff},${item.total}\n`;
    });
    csvContent += `\n`;

    csvContent += `=== SECTION 5: RECENT REGISTERED USERS ===\n`;
    csvContent += `User ID,Name,Email,Role,Department,Verification Status,Registered At\n`;
    recentUsers.forEach(u => {
      const isSuperAdmin = String(u.email || '').toLowerCase() === 'nazrulretrievers@gmail.com';
      const isAdmin = u.role === 'admin' || isSuperAdmin;
      const isMod = u.role === 'moderator' || u.role === 'coordinator';
      let verStatus = 'Unverified (ID Not Submitted)';
      if (isAdmin) {
        verStatus = 'Official (System Admin Authority)';
      } else if (isMod) {
        verStatus = 'Official (Staff Moderator Authority)';
      } else if (u.isVerified || u.idVerificationStatus === 'verified') {
        verStatus = 'Verified (Student ID Approved)';
      } else if (u.idVerificationStatus === 'pending' || u.hasIdDocument) {
        verStatus = 'Pending Review';
      }
      csvContent += `"${u.id || u.studentId}","${u.name}","${u.email}","${u.role}","${u.department}","${verStatus}","${u.createdAt}"\n`;
    });
    
    downloadCSV(`nazrul_retrievers_analytics_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  const dynamicInsights: DynamicInsight[] = rawAnalytics?.dynamicInsights || [
    {
      type: 'category',
      title: 'Top Reported Category',
      description: categories.length > 0 
        ? `Category "${categories[0].name}" accounts for the highest volume with ${categories[0].value} verified listings.`
        : 'Listings are currently spread across multiple categories.'
    },
    {
      type: 'resolution',
      title: 'Resolution Success',
      description: returnedCount > 0 
        ? `${returnedCount} items have been securely handed over and reunited with their rightful owners (${returnRate}% return rate).`
        : 'No items marked as reunited or returned yet.'
    },
    {
      type: 'queue',
      title: 'Verification Queue',
      description: (pendingCount > 0 || pendingVerificationsCount > 0)
        ? `${pendingCount} item post${pendingCount === 1 ? '' : 's'} and ${pendingVerificationsCount} student ID${pendingVerificationsCount === 1 ? '' : 's'} are currently pending administrator review.`
        : 'All reported items and student verification reviews are up to date with zero backlog.'
    }
  ];

  // Format date helper with proper date & time
  const formatRegistrationDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateFormatted} • ${timeFormatted}`;
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Top Banner Control Section */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-brand-border p-5 rounded-2xl shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-navy text-brand-gold flex items-center justify-center flex-shrink-0 shadow-xs border border-brand-gold/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-brand-navy">
                Live Database Analytics
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Real-Time
              </span>
            </div>
            <p className="text-xs text-brand-ink2 font-light mt-0.5">
              Accurate statistics aggregated directly from campus listings, verified users, and claims
              {lastRefreshed && (
                <span className="ml-1 text-[11px] text-slate-400">
                  • Refreshed {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-3.5 py-2 bg-brand-cream hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-brand-navy dark:text-white border border-brand-border dark:border-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs active:scale-95 disabled:opacity-50"
            title="Refresh analytics directly from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-gold' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button
            onClick={exportFullReportCSV}
            className="px-3.5 py-2 bg-brand-navy hover:bg-brand-navy/90 dark:bg-brand-gold dark:text-brand-navy dark:hover:bg-amber-400 text-brand-gold border border-brand-gold/30 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-xs active:scale-95"
            title="Download consolidated CSV report with real database metrics"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV Report
          </button>
        </div>
      </motion.div>

      {/* 4 Core Executive KPI Cards */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Total Listings */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-brand-gold/50 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Campus Listings
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="font-serif text-3xl font-extrabold text-brand-navy dark:text-white">
              {totalPosts}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-brand-border/40 dark:border-slate-800 text-[11px] font-semibold">
            <span className="text-red-600 dark:text-red-400 font-bold">{lostCount} Lost</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-brand-gold-mid dark:text-amber-300 font-bold">{foundCount} Found</span>
          </div>
        </motion.div>

        {/* Card 2: Registered Accounts */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-brand-gold/50 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Registered Users
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="font-serif text-3xl font-extrabold text-brand-navy dark:text-white">
              {totalUsers}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-brand-border/40 dark:border-slate-800 text-[11px] font-semibold">
            <span className="text-blue-600 dark:text-blue-400 font-bold">{studentUsers || totalUsers} Students</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-slate-500 dark:text-slate-400">{staffUsers} Staff/Mods</span>
          </div>
        </motion.div>

        {/* Card 3: Successfully Returned Items */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-brand-gold/50 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recovered &amp; Returned
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <div className="font-serif text-3xl font-extrabold text-brand-navy dark:text-white">
              {returnedCount}
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              ({returnRate}% rate)
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-brand-border/40 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
            <Clock4 className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" />
            <span>Avg resolution: <strong className="text-brand-navy dark:text-white">{avgResolutionHours !== "0" ? `${avgResolutionHours}h` : 'Quick'}</strong></span>
          </div>
        </motion.div>

        {/* Card 4: Actionable Queue Backlog */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-brand-gold/50 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Review Queue
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="font-serif text-3xl font-extrabold text-brand-navy dark:text-white">
              {pendingCount + pendingVerificationsCount}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-brand-border/40 dark:border-slate-800 text-[11px] font-semibold">
            <span className="text-amber-600 dark:text-amber-400 font-bold">{pendingCount} Item Posts</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{pendingVerificationsCount} ID Reviews</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Row 1: Primary Charts - 7-Day Activity Trend & Category Distribution */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Daily Post Volume (7 Days Real Comparison) */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border/40 dark:border-slate-800 pb-4 mb-4 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-navy dark:bg-slate-800 text-brand-gold flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-white">Daily Intake Activity (Last 7 Days)</h4>
                <p className="text-[11px] text-brand-ink2 dark:text-slate-400 font-light">Real-time breakdown of newly posted Lost vs. Found items</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold self-end sm:self-auto">
              <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600" /> Lost
              </span>
              <span className="flex items-center gap-1.5 text-brand-gold dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-gold" /> Found
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full mt-2">
            {dailyVolume.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No activity logs recorded for the past 7 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailyVolume}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.2} />
                  <XAxis 
                    dataKey="day" 
                    stroke="#94A3B8" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      borderRadius: '12px', 
                      border: '1px solid #334155',
                      color: '#F8FAFC' 
                    }} 
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px', color: '#F4C430' }}
                    itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                  />
                  <Bar 
                    dataKey="lost" 
                    name="Lost Items" 
                    fill="#EF4444" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                  />
                  <Bar 
                    dataKey="found" 
                    name="Found Items" 
                    fill="#C9963F" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Item Classification Categories */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-brand-border/40 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-navy dark:bg-slate-800 text-brand-gold flex items-center justify-center shadow-xs">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-white">Classification Categories</h4>
                <p className="text-[11px] text-brand-ink2 dark:text-slate-400 font-light">Real-time database volume by category</p>
              </div>
            </div>
          </div>

          <div className="h-[180px] w-full flex items-center justify-center relative mt-2">
            {categories.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-semibold py-8">
                No active categories logged yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                      onMouseEnter={(_, index) => setActiveSegment(categories[index].name)}
                      onMouseLeave={() => setActiveSegment(null)}
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0F172A', 
                        borderRadius: '12px', 
                        border: '1px solid #334155',
                        color: '#F8FAFC' 
                      }} 
                      itemStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {activeSegment ? 'Selected' : 'Total'}
                  </span>
                  <span className="text-base font-black text-brand-navy dark:text-white">
                    {activeSegment 
                      ? categories.find(c => c.name === activeSegment)?.value 
                      : categories.reduce((sum, c) => sum + c.value, 0)
                    }
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Category Legends list */}
          {categories.length > 0 && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-3 text-[11px] font-medium flex-1 overflow-y-auto max-h-[100px] pr-1 custom-scrollbar">
              {categories.map(c => (
                <div 
                  key={c.name} 
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${activeSegment === c.name ? 'bg-brand-cream dark:bg-slate-800 font-bold' : ''}`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="truncate text-slate-700 dark:text-slate-300">{c.name}</span>
                  <span className="text-slate-400 dark:text-slate-400 ml-auto font-semibold">{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Row 2: Department Activity & User Growth & Subcategories */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Posts By Department */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-brand-border/40 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-navy dark:bg-slate-800 text-brand-gold flex items-center justify-center shadow-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-white">Academic Departments</h4>
                <p className="text-[11px] text-brand-ink2 dark:text-slate-400 font-light">Logged listings grouped by campus department</p>
              </div>
            </div>
          </div>

          <div className="h-[230px] w-full mt-2">
            {departments.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No department records logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departments}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.2} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} fontWeight={600} tickLine={false} allowDecimals={false} />
                  <YAxis 
                    dataKey="department" 
                    type="category" 
                    stroke="#94A3B8" 
                    fontSize={10} 
                    fontWeight={600} 
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      borderRadius: '12px', 
                      border: '1px solid #334155',
                      color: '#F8FAFC' 
                    }} 
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Items" 
                    fill="#3B82F6" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* User Growth Trajectory */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-brand-border/40 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-navy dark:bg-slate-800 text-brand-gold flex items-center justify-center shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-white">User Growth Trajectory</h4>
                <p className="text-[11px] text-brand-ink2 dark:text-slate-400 font-light">Monthly registration counts of students &amp; faculty</p>
              </div>
            </div>
          </div>

          <div className="h-[230px] w-full mt-2">
            {userGrowth.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No user growth history recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={userGrowth}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="growthTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9963F" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#C9963F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.2} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94A3B8" 
                    fontSize={10} 
                    fontWeight={600}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={10} 
                    fontWeight={600} 
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      borderRadius: '12px', 
                      border: '1px solid #334155',
                      color: '#F8FAFC' 
                    }} 
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Users" 
                    stroke="#C9963F" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#growthTotal)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Top Subcategories Breakdown */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-brand-border/40 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-navy dark:bg-slate-800 text-brand-gold flex items-center justify-center shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-white">Top Subcategories</h4>
                <p className="text-[11px] text-brand-ink2 dark:text-slate-400 font-light">Specific item classifications reported</p>
              </div>
            </div>
          </div>

          <div className="h-[230px] w-full mt-2">
            {subcategories.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No subcategories recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={subcategories}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.2} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} fontWeight={600} tickLine={false} allowDecimals={false} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#94A3B8" 
                    fontSize={10} 
                    fontWeight={600} 
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      borderRadius: '12px', 
                      border: '1px solid #334155',
                      color: '#F8FAFC' 
                    }} 
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Bar 
                    dataKey="value" 
                    name="Items" 
                    fill="#10B981" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Row 3: RECENT REGISTERED USERS (Real Database Table with Scrollbar) */}
      <motion.div 
        variants={itemVariants}
        className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border/40 dark:border-slate-800 pb-4 mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-white">Recent Registered Users</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                  {recentUsers.length} Logged
                </span>
              </div>
              <p className="text-[11px] text-brand-ink2 dark:text-slate-400 font-light">
                Live database log of students and faculty members registered on Nazrul Retrievers (Scrollable)
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Container with Max Height & Sticky Table Header */}
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar touch-scroll border border-brand-border/40 dark:border-slate-800/80 rounded-xl">
          {recentUsers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold">
              No registered user records found in the database.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/95 dark:bg-[#0F1829]/95 backdrop-blur-xs border-b border-brand-border/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">User / ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role / Dept</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-200">
                {recentUsers.map((user, idx) => (
                  <tr key={user.id || idx} className="hover:bg-brand-cream/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] font-bold text-brand-navy dark:text-amber-300 bg-brand-cream dark:bg-slate-800/80 px-2 py-0.5 rounded border border-brand-border dark:border-slate-700">
                        {user.studentId && user.studentId !== '-' ? user.studentId : (user.id ? (user.id.length > 12 ? `${user.id.substring(0, 10)}...` : user.id) : `USR-${idx + 1}`)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-brand-navy dark:text-white">
                      {user.name}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {user.email}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-semibold capitalize text-slate-800 dark:text-slate-200 text-[11px]">
                          {user.role}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                          {user.department || 'Campus Member'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {(() => {
                        const isSuperAdmin = String(user.email || '').toLowerCase() === 'nazrulretrievers@gmail.com';
                        const isAdmin = user.role === 'admin' || isSuperAdmin;
                        const isModerator = user.role === 'moderator' || user.role === 'coordinator';

                        if (isAdmin) {
                          return (
                            <span 
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60"
                              title="System Administrator (Official Institutional Authority)"
                            >
                              <Shield className="w-3 h-3 text-rose-500 shrink-0" />
                              Admin Official
                            </span>
                          );
                        }

                        if (isModerator) {
                          return (
                            <span 
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60"
                              title="Staff Moderator / Coordinator (Official Institutional Authority)"
                            >
                              <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />
                              Staff Official
                            </span>
                          );
                        }

                        const isVerified = user.idVerificationStatus === 'verified' || user.isVerified === true;
                        const isPending = !isVerified && (user.idVerificationStatus === 'pending' || user.hasIdDocument);
                        
                        if (isVerified) {
                          return (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60"
                              title="Verified JKKNIU Student ID"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              ID Verified
                            </span>
                          );
                        }
                        if (isPending) {
                          return (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60"
                              title="Student ID Submitted — Pending Admin Review"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              ID Pending
                            </span>
                          );
                        }
                        return (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            title="Student ID Not Submitted Yet"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Unverified
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span className="inline-flex items-center gap-1.5 justify-end" title={user.createdAt ? new Date(user.createdAt).toLocaleString() : undefined}>
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{formatRegistrationDate(user.createdAt)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Row 4: Most Viewed Items Table & Claims Pipeline */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Top 10 Most Viewed Items */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-brand-border/40 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-navy dark:bg-slate-800 text-brand-gold flex items-center justify-center shadow-xs">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-white">Most Viewed Listings (Top 10)</h4>
                <p className="text-[11px] text-brand-ink2 dark:text-slate-400 font-light">Real-time visitor views tracked across verified posts</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[260px] pr-1 custom-scrollbar touch-scroll border border-brand-border/30 dark:border-slate-800/80 rounded-xl">
            {getTopViewedItems().length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 text-xs font-semibold">
                No active listings recorded yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50/95 dark:bg-[#0F1829]/95 backdrop-blur-xs border-b border-brand-border/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2">Type</th>
                    <th className="py-2.5 px-3 text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-200">
                  {getTopViewedItems().map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-brand-cream/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 flex items-center gap-2 max-w-[200px] truncate">
                        <span className="text-sm">{item.emoji || '📦'}</span>
                        <span className="truncate font-semibold text-brand-navy dark:text-white" title={item.title}>{item.title}</span>
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-slate-500 dark:text-slate-400">{item.category}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.type === 'lost' 
                            ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60' 
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400 font-mono">
                        👁 {item.views || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Recovery & Resolution Pipeline Summary */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-[#0C1322] border border-brand-border dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-brand-border/40 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="font-serif text-sm font-bold text-brand-navy dark:text-white">Recovery &amp; Resolution</h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
              Live Database
            </span>
          </div>
          
          <div className="space-y-2.5 flex-1 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Reunited &amp; Returned</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-serif text-sm">{returnedCount} Items</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Active Lost Searches</span>
              <span className="text-red-500 dark:text-red-400 font-bold font-serif text-sm">{lostCount}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Active Found Notices</span>
              <span className="text-brand-gold-mid dark:text-amber-400 font-bold font-serif text-sm">{foundCount}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Student ID Status</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold font-serif text-xs">
                {verifiedUsersCount} Verified {pendingVerificationsCount > 0 && `(${pendingVerificationsCount} Pending)`}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-brand-border/40 dark:border-slate-800 font-bold">
              <span className="text-slate-700 dark:text-slate-300">Overall Recovery Rate</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-serif text-sm">{returnRate}%</span>
            </div>
          </div>

          {/* Top Search Keywords Preview */}
          <div className="mt-4 pt-3 border-t border-brand-border/40 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-brand-gold" />
                <span>Top Campus Searches:</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">Real Queries</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1 custom-scrollbar">
              {(!rawAnalytics?.topSearchKeywords || rawAnalytics.topSearchKeywords.length === 0) ? (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">No search queries logged yet</span>
              ) : (
                rawAnalytics.topSearchKeywords.slice(0, 6).map((k: any, idx: number) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-cream dark:bg-slate-800 text-[11px] font-semibold text-brand-navy dark:text-slate-200 border border-brand-border dark:border-slate-700 shadow-2xs"
                  >
                    <span>{k.keyword}</span>
                    <span className="text-[10px] text-brand-gold dark:text-amber-400 font-bold">({k.count})</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Dynamic Data-Driven Insights Banner */}
      <motion.div 
        variants={itemVariants}
        className="bg-brand-cream/80 dark:bg-slate-800/40 border border-brand-border dark:border-slate-800 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-brand-gold" />
          <h4 className="font-serif text-xs font-black uppercase tracking-wider text-brand-navy dark:text-white">
            Live Automated System Insights
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
          {dynamicInsights.map((insight, idx) => (
            <div key={idx} className="bg-white dark:bg-[#0C1322] p-3.5 rounded-xl border border-brand-border dark:border-slate-800 shadow-xs">
              <span className="font-bold text-brand-navy dark:text-white block mb-1">
                {insight.title}
              </span>
              <p className="text-[11px] text-brand-ink2 dark:text-slate-400 leading-relaxed font-light">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
