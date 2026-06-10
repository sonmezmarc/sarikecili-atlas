'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEditorStore } from '@/stores/editorStore';
import {
  Workflow,
  FolderOpen,
  Settings,
  Sun,
  Moon,
  ExternalLink,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin/nodes', label: 'Düzenleyici', icon: Workflow },
  { href: '/admin/media', label: 'Medya', icon: FolderOpen },
  { href: '/admin/settings', label: 'Ayarlar', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useEditorStore();

  return (
    <aside className="w-14 flex flex-col items-center py-3 gap-1 border-r border-editor-border bg-editor-panel shrink-0">
      {/* Brand mark */}
      <div className="w-8 h-8 rounded-lg bg-selection/20 flex items-center justify-center mb-3">
        <span className="text-xs font-bold text-selection">SA</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
                isActive
                  ? 'bg-selection/15 text-selection'
                  : 'text-editor-text-muted hover:text-editor-text hover:bg-editor-surface-hover'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-editor-text-muted hover:text-editor-text hover:bg-editor-surface-hover transition-all duration-150"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Public atlas link */}
        <Link
          href="/"
          target="_blank"
          title="Atlası Görüntüle"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-editor-text-muted hover:text-editor-text hover:bg-editor-surface-hover transition-all duration-150"
        >
          <ExternalLink size={16} />
        </Link>
      </div>
    </aside>
  );
}
