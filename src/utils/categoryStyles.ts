import { 
  Laptop, Backpack, Gem, Shirt, BookOpen, Key, Trophy, HelpCircle, LucideIcon,
  FileText, GraduationCap, Coins, Bike, Smile
} from 'lucide-react';

export interface CategoryStyle {
  bg: string;
  text: string;
  border: string;
  badgeClass: string;
  icon: LucideIcon;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  'Electronics': {
    bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200',
    text: 'text-blue-900 dark:text-blue-100',
    border: 'border-blue-200 dark:border-blue-800',
    badgeClass: 'bg-blue-100/80 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border-blue-300/80 dark:border-blue-900/50',
    icon: Laptop
  },
  'Bags & Luggage': {
    bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200',
    text: 'text-amber-900 dark:text-amber-100',
    border: 'border-amber-200 dark:border-amber-800',
    badgeClass: 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300/80 dark:border-amber-900/50',
    icon: Backpack
  },
  'Documents & ID Cards': {
    bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-200',
    text: 'text-teal-900 dark:text-teal-100',
    border: 'border-teal-200 dark:border-teal-800',
    badgeClass: 'bg-teal-100/80 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 border-teal-300/80 dark:border-teal-900/50',
    icon: FileText
  },
  'Keys & Access Cards': {
    bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200',
    text: 'text-rose-900 dark:text-rose-100',
    border: 'border-rose-200 dark:border-rose-800',
    badgeClass: 'bg-rose-100/80 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 border-rose-300/80 dark:border-rose-900/50',
    icon: Key
  },
  'Books & Stationery': {
    bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-200',
    text: 'text-teal-900 dark:text-teal-100',
    border: 'border-teal-200 dark:border-teal-800',
    badgeClass: 'bg-teal-100/80 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 border-teal-300/80 dark:border-teal-900/50',
    icon: BookOpen
  },
  'Clothing & Wearables': {
    bg: 'bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-200',
    text: 'text-pink-900 dark:text-pink-100',
    border: 'border-pink-200 dark:border-pink-800',
    badgeClass: 'bg-pink-100/80 dark:bg-pink-950/80 text-pink-900 dark:text-pink-300 border-pink-300/80 dark:border-pink-900/50',
    icon: Shirt
  },
  'Accessories': {
    bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-200',
    text: 'text-purple-900 dark:text-purple-100',
    border: 'border-purple-200 dark:border-purple-800',
    badgeClass: 'bg-purple-100/80 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 border-purple-300/80 dark:border-purple-900/50',
    icon: Gem
  },
  'Academic Items': {
    bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200',
    text: 'text-indigo-900 dark:text-indigo-100',
    border: 'border-indigo-200 dark:border-indigo-800',
    badgeClass: 'bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-300 border-indigo-300/80 dark:border-indigo-900/50',
    icon: GraduationCap
  },
  'Sports Equipment': {
    bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200',
    text: 'text-orange-900 dark:text-orange-100',
    border: 'border-orange-200 dark:border-orange-800',
    badgeClass: 'bg-orange-100/80 dark:bg-orange-950/80 text-orange-900 dark:text-orange-300 border-orange-300/80 dark:border-orange-900/50',
    icon: Trophy
  },
  'Money & Valuables': {
    bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-200',
    text: 'text-yellow-900 dark:text-yellow-100',
    border: 'border-yellow-200 dark:border-yellow-800',
    badgeClass: 'bg-yellow-100/80 dark:bg-yellow-950/80 text-yellow-900 dark:text-yellow-300 border-yellow-300/80 dark:border-yellow-900/50',
    icon: Coins
  },
  'Vehicles & Transport': {
    bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200',
    text: 'text-emerald-900 dark:text-emerald-100',
    border: 'border-emerald-200 dark:border-emerald-800',
    badgeClass: 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-900/50',
    icon: Bike
  },
  'Personal Items': {
    bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-200',
    text: 'text-sky-900 dark:text-sky-100',
    border: 'border-sky-200 dark:border-sky-800',
    badgeClass: 'bg-sky-100/80 dark:bg-sky-950/80 text-sky-900 dark:text-sky-300 border-sky-300/80 dark:border-sky-900/50',
    icon: Smile
  },
  'Other': {
    bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    text: 'text-slate-900 dark:text-slate-100',
    border: 'border-slate-200 dark:border-slate-700',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300/80 dark:border-slate-700/80',
    icon: HelpCircle
  },
  // Compatibility fallbacks:
  'Keys & Cards': {
    bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200',
    text: 'text-rose-900 dark:text-rose-100',
    border: 'border-rose-200 dark:border-rose-800',
    badgeClass: 'bg-rose-100/80 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 border-rose-300/80 dark:border-rose-900/50',
    icon: Key
  },
  'Clothing': {
    bg: 'bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-200',
    text: 'text-pink-900 dark:text-pink-100',
    border: 'border-pink-200 dark:border-pink-800',
    badgeClass: 'bg-pink-100/80 dark:bg-pink-950/80 text-pink-900 dark:text-pink-300 border-pink-300/80 dark:border-pink-900/50',
    icon: Shirt
  }
};

const DEFAULT_STYLE: CategoryStyle = {
  bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  text: 'text-slate-900 dark:text-slate-100',
  border: 'border-slate-200 dark:border-slate-700',
  badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80',
  icon: HelpCircle
};

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] || DEFAULT_STYLE;
}
