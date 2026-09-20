import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, 
  Cpu, 
  Briefcase, 
  Users, 
  BookOpen, 
  Scale, 
  Palette, 
  ChevronRight, 
  ArrowLeft, 
  Search, 
  Check, 
  X, 
  Building2 
} from 'lucide-react';
import { DEPARTMENT_GROUPS } from '../data';

interface DepartmentSelectorProps {
  value: string;
  onChange: (deptName: string, facultyName: string, deptId: string, facultyId: string) => void;
  error?: string | null;
}

const getFacultyIcon = (label: string) => {
  switch (label) {
    case 'Faculty of Science and Engineering':
      return <Cpu className="w-4 h-4 text-indigo-500" />;
    case 'Faculty of Business Administration':
      return <Briefcase className="w-4 h-4 text-emerald-500" />;
    case 'Faculty of Social Science':
      return <Users className="w-4 h-4 text-sky-500" />;
    case 'Faculty of Arts':
      return <BookOpen className="w-4 h-4 text-amber-500" />;
    case 'Faculty of Law':
      return <Scale className="w-4 h-4 text-red-500" />;
    case 'Faculty of Fine Arts':
      return <Palette className="w-4 h-4 text-rose-500" />;
    default:
      return <Landmark className="w-4 h-4 text-brand-gold" />;
  }
};

// Map original strings to database-compatible IDs
const getFacultyId = (label: string): string => {
  switch (label) {
    case 'Faculty of Arts': return 'faculty-arts';
    case 'Faculty of Science and Engineering': return 'faculty-science-engineering';
    case 'Faculty of Social Science': return 'faculty-social-science';
    case 'Faculty of Business Administration': return 'faculty-business-admin';
    case 'Faculty of Law': return 'faculty-law';
    case 'Faculty of Fine Arts': return 'faculty-fine-arts';
    default: return `faculty-${String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }
};

const getDepartmentId = (name: string): string => {
  switch (name) {
    case 'Bangla Language and Literature': return 'dept-bangla';
    case 'English Language and Literature': return 'dept-english';
    case 'Music': return 'dept-music';
    case 'Theatre and Performance Studies': return 'dept-theatre';
    case 'Film and Media Studies': return 'dept-film';
    case 'Philosophy': return 'dept-philosophy';
    case 'History': return 'dept-history';
    case 'Computer Science and Engineering': return 'dept-cse';
    case 'Electrical and Electronic Engineering': return 'dept-eee';
    case 'Environmental Science and Engineering': return 'dept-ese';
    case 'Statistics': return 'dept-statistics';
    case 'Economics': return 'dept-economics';
    case 'Public Administration and Governance Studies': return 'dept-public-admin';
    case 'Folklore': return 'dept-folklore';
    case 'Anthropology': return 'dept-anthropology';
    case 'Population Science': return 'dept-population-science';
    case 'Local Government and Urban Development': return 'dept-local-govt';
    case 'Sociology': return 'dept-sociology';
    case 'Accounting and Information Systems': return 'dept-ais';
    case 'Finance and Banking': return 'dept-finance';
    case 'Human Resource Management': return 'dept-hrm';
    case 'Management': return 'dept-management';
    case 'Marketing': return 'dept-marketing';
    case 'Law and Justice': return 'dept-law';
    case 'Fine Arts': return 'dept-fine-arts';
    default: return `dept-${String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }
};

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({ value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'faculties' | 'departments'>('faculties');
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key and focus search input on open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Format department name with its initials/alias if available
  const getFormattedName = (name: string, aliases?: string[]) => {
    if (aliases && aliases.length > 0 && aliases[0].length <= 5) {
      return `${name} (${aliases[0]})`;
    }
    return name;
  };

  // Handle faculty click
  const handleFacultySelect = (facultyLabel: string) => {
    setSelectedFaculty(facultyLabel);
    setCurrentView('departments');
  };

  // Handle department selection
  const handleDeptSelect = (deptName: string, facultyLabel: string, aliases?: string[]) => {
    const formattedDeptName = getFormattedName(deptName, aliases);
    const deptId = getDepartmentId(deptName);
    const facId = getFacultyId(facultyLabel);
    
    onChange(formattedDeptName, facultyLabel, deptId, facId);
    setIsOpen(false);
    // Reset view
    setSearchText('');
    setSelectedFaculty(null);
    setCurrentView('faculties');
  };

  // Filter faculties and departments based on real-time search
  const filteredData = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return null;

    const results: Array<{
      facultyLabel: string;
      deptName: string;
      aliases?: string[];
    }> = [];

    DEPARTMENT_GROUPS.forEach((group) => {
      const facultyMatches = group.label.toLowerCase().includes(query);
      group.departments.forEach((dept) => {
        const deptMatches = dept.name.toLowerCase().includes(query);
        const aliasMatches = dept.aliases?.some(alias => alias.toLowerCase().includes(query)) || false;

        if (facultyMatches || deptMatches || aliasMatches) {
          results.push({
            facultyLabel: group.label,
            deptName: dept.name,
            aliases: dept.aliases
          });
        }
      });
    });

    return results;
  }, [searchText]);

  const activeFacultyGroup = useMemo(() => {
    if (!selectedFaculty) return null;
    return DEPARTMENT_GROUPS.find(g => g.label === selectedFaculty) || null;
  }, [selectedFaculty]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* TRIGGER BUTTON (Styled identical to original select element but responds with active styling when open) */}
      <button
        type="button"
        id="department"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left pl-4 pr-11 pt-5 pb-2 bg-brand-cream dark:bg-slate-900/90 border rounded-xl text-brand-ink dark:text-slate-100 text-sm outline-none transition-all hover:bg-white dark:hover:bg-slate-900 cursor-pointer relative ${
          isOpen 
            ? 'border-brand-gold dark:border-amber-500 bg-white dark:bg-slate-900 ring-4 ring-brand-gold/10 dark:ring-amber-500/20' 
            : 'border-brand-border dark:border-slate-800 focus:border-brand-gold dark:focus:border-amber-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-gold/10 dark:focus:ring-amber-400/10'
        }`}
      >
        <span className="block truncate h-5">
          {value || <span className="text-transparent">Select Department</span>}
        </span>
      </button>

      {/* Premium Dropdown / Popover attached directly below the input field */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 w-full z-50 mt-1.5 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[440px] overflow-hidden"
          >
            {/* Sticky Search Bar on Top */}
            <div className="p-3 border-b border-brand-border dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink3 dark:text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by faculty or department..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-brand-cream dark:bg-slate-950 border border-brand-border dark:border-slate-800 rounded-xl text-brand-ink dark:text-slate-100 placeholder-brand-ink3 dark:placeholder-slate-500 outline-none focus:border-brand-gold dark:focus:border-amber-400 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-brand-gold/10 dark:focus:ring-amber-400/10 transition-all font-semibold"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ink3 dark:text-slate-400 hover:text-brand-ink dark:hover:text-slate-200 cursor-pointer flex items-center justify-center p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable List Content */}
            <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-950/50 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {/* 1. SEARCH RESULTS VIEW */}
              {searchText.trim() !== '' ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-brand-ink3 dark:text-slate-400 uppercase tracking-wider px-2 mb-1">
                    Search Results ({filteredData?.length || 0})
                  </p>
                  {filteredData && filteredData.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredData.map((result, idx) => {
                        const formattedName = getFormattedName(result.deptName, result.aliases);
                        const isSelected = value === formattedName;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleDeptSelect(result.deptName, result.facultyLabel, result.aliases)}
                            className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-brand-gold/5 dark:bg-amber-950/40 border-brand-gold dark:border-amber-500 shadow-sm ring-1 ring-brand-gold dark:ring-amber-500'
                                : 'bg-white dark:bg-slate-900 hover:bg-brand-cream/40 dark:hover:bg-slate-800/80 border-brand-border dark:border-slate-800 hover:border-brand-border/85 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0">
                                {getFacultyIcon(result.facultyLabel)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-brand-navy dark:text-slate-100 truncate">
                                  {formattedName}
                                </p>
                                <p className="text-[10px] text-brand-ink3 dark:text-slate-400 mt-0.5 truncate font-medium">
                                  {result.facultyLabel}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="p-1 bg-brand-gold/10 dark:bg-amber-400/20 text-brand-gold dark:text-amber-400 rounded-full flex-shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-brand-ink3 dark:text-slate-400 font-bold">No results found matching "{searchText}"</p>
                      <p className="text-[10px] text-brand-ink3/80 dark:text-slate-500 mt-0.5">Try searching another keyword</p>
                    </div>
                  )}
                </div>
              ) : (
                /* 2. STANDARD POPULAR FLOW VIEW */
                <AnimatePresence mode="wait">
                  {currentView === 'faculties' ? (
                    /* FACULTIES VIEW */
                    <motion.div
                      key="faculties-screen"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-1.5"
                    >
                      <p className="text-[10px] font-bold text-brand-ink3 dark:text-slate-400 uppercase tracking-wider px-2 mb-1">
                        Select a Faculty
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {DEPARTMENT_GROUPS.map((group) => (
                          <button
                            key={group.label}
                            type="button"
                            onClick={() => handleFacultySelect(group.label)}
                            className="w-full text-left p-3 bg-white dark:bg-slate-900 border border-brand-border dark:border-slate-800 rounded-xl hover:border-brand-gold dark:hover:border-amber-500/60 hover:shadow-sm dark:hover:bg-slate-800/80 transition-all duration-150 flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-brand-cream/60 dark:group-hover:bg-slate-700 transition-colors">
                                {getFacultyIcon(group.label)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-brand-navy dark:text-slate-100 group-hover:text-brand-gold dark:group-hover:text-amber-400 transition-colors truncate">
                                  {group.label}
                                </h4>
                                <p className="text-[10px] text-brand-ink3 dark:text-slate-400 mt-0.5 font-medium">
                                  {group.departments.length} {group.departments.length === 1 ? 'Department' : 'Departments'}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-brand-ink3 dark:text-slate-500 group-hover:text-brand-gold dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    /* DEPARTMENTS VIEW */
                    <motion.div
                      key="departments-screen"
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView('faculties');
                          setSelectedFaculty(null);
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-brand-gold dark:text-amber-400 hover:text-brand-gold-mid dark:hover:text-amber-300 transition-colors uppercase tracking-wider px-2 group cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        Back to Faculties
                      </button>

                      <div className="p-3 bg-brand-cream dark:bg-slate-800/70 border border-brand-border dark:border-slate-700 rounded-xl">
                        <p className="text-[9px] text-brand-ink3 dark:text-slate-400 font-bold uppercase tracking-wider">
                          Selected Faculty
                        </p>
                        <h4 className="text-xs font-bold text-brand-navy dark:text-slate-100 mt-1 flex items-center gap-2">
                          {getFacultyIcon(selectedFaculty || '')}
                          <span className="truncate">{selectedFaculty}</span>
                        </h4>
                      </div>

                      <p className="text-[10px] font-bold text-brand-ink3 dark:text-slate-400 uppercase tracking-wider px-2 mt-3">
                        Select a Department
                      </p>

                      <div className="grid grid-cols-1 gap-1.5">
                        {activeFacultyGroup?.departments.map((dept) => {
                          const formattedName = getFormattedName(dept.name, dept.aliases);
                          const isSelected = value === formattedName;
                          return (
                            <button
                              key={dept.name}
                              type="button"
                              onClick={() => handleDeptSelect(dept.name, selectedFaculty || '', dept.aliases)}
                              className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-brand-gold/5 dark:bg-amber-950/40 border-brand-gold dark:border-amber-500 shadow-sm ring-1 ring-brand-gold dark:ring-amber-500'
                                  : 'bg-white dark:bg-slate-900 hover:bg-brand-cream/40 dark:hover:bg-slate-800/80 border-brand-border dark:border-slate-800 hover:border-brand-border/85 dark:hover:border-slate-700'
                              }`}
                            >
                              <span className="text-xs font-bold text-brand-navy dark:text-slate-100 pr-4 truncate">
                                {formattedName}
                              </span>
                              {isSelected && (
                                <div className="p-1 bg-brand-gold/10 dark:bg-amber-400/20 text-brand-gold dark:text-amber-400 rounded-full flex-shrink-0">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
