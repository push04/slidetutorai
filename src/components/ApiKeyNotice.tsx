import { ShieldAlert, Settings } from 'lucide-react';

interface ApiKeyNoticeProps {
  onOpenSettings: () => void;
  title?: string;
  description?: string;
}

export function ApiKeyNotice({ onOpenSettings, title = 'Connect your AI key', description }: ApiKeyNoticeProps) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-300/40 bg-amber-50/80 p-4 text-amber-900 shadow-sm shadow-amber-100 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-50">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-400/20 dark:text-amber-100">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold leading-6">{title}</p>
          <p className="text-sm text-amber-800/90 dark:text-amber-100/80">
            {description || 'Add your OpenRouter API key in Settings to unlock AI-powered features.'}
          </p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400"
          >
            <Settings className="h-4 w-4" />
            Open Settings
          </button>
        </div>
      </div>
    </div>
  );
}

