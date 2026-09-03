import { Link } from 'react-router-dom';
import { ChevronRight, Sun, Moon, Check, Sliders, Type, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AppSettings() {
  const { theme, toggleTheme, fontSize, setFontSize } = useTheme();
  const { t } = useLanguage();

  const fontOptions = [
    { key: 'normal', label: t('Normal'), sizeLabel: '16px', sampleScale: 'text-sm' },
    { key: 'large', label: t('Large'), sizeLabel: '18px', sampleScale: 'text-base' },
    { key: 'extra_large', label: t('Extra Large'), sizeLabel: '20px', sampleScale: 'text-lg' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <Link
          to="/profile"
          className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-3"
        >
          <ChevronRight className="rotate-180" size={16} />
          {t('Back to Dashboard')}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center">
            <Sliders size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('App Settings Title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('App Settings Subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
            <Sun size={18} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {t('Appearance')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('Appearance Subtitle')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Mode Option */}
          <button
            type="button"
            onClick={() => toggleTheme('light')}
            className={`cursor-pointer text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative overflow-hidden ${
              theme === 'light'
                ? 'border-primary-600 bg-primary-50/40 dark:bg-slate-800 shadow-sm ring-2 ring-primary-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                theme === 'light'
                  ? 'bg-amber-100 text-amber-600 shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Sun size={24} />
            </div>
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Light Mode')}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('Light Mode Desc')}
              </p>
            </div>
            {theme === 'light' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-sm">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </button>

          {/* Dark Mode Option */}
          <button
            type="button"
            onClick={() => toggleTheme('dark')}
            className={`cursor-pointer text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative overflow-hidden ${
              theme === 'dark'
                ? 'border-primary-500 bg-slate-800/80 dark:bg-slate-800 shadow-sm ring-2 ring-primary-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                theme === 'dark'
                  ? 'bg-indigo-900/60 text-indigo-400 shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Moon size={24} />
            </div>
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Dark Mode')}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('Dark Mode Desc')}
              </p>
            </div>
            {theme === 'dark' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-sm">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Font Size Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Type size={18} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {t('Font Size')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('Font Size Subtitle')}
        </p>

        {/* Font Size Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {fontOptions.map((opt) => {
            const isSelected = fontSize === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFontSize(opt.key)}
                className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center relative ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50/50 dark:bg-slate-800 ring-2 ring-primary-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                <span
                  className={`font-black text-slate-800 dark:text-slate-100 ${
                    opt.key === 'normal'
                      ? 'text-base'
                      : opt.key === 'large'
                      ? 'text-xl'
                      : 'text-2xl'
                  }`}
                >
                  Aa
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {opt.label}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {opt.sizeLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Preview Snippet */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('Live Preview')}
            </span>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700/60 transition-all">
            <div className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-xs uppercase tracking-wide mb-2.5">
              {t('Live Preview Sample Badge')}
            </div>
            <h4 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl mb-2 leading-tight">
              {t('Live Preview Sample Heading')}
            </h4>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
              {t('Live Preview Sample Body')}
            </p>
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-slate-900 dark:text-white text-lg">
                ₹249
              </span>
              <span className="line-through text-slate-400 text-sm">
                ₹299
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow-sm">
                {t('Add to Cart')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
