'use client';

import { useState } from 'react';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface GISImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function GISImportDialog({ open, onClose }: GISImportDialogProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{ created: number; summary: Array<{ name: string; features: number }> } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const handleImport = async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/import-geojson', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Bilinmeyen hata');
        return;
      }

      setStatus('success');
      setResult(data);
    } catch (err) {
      setStatus('error');
      setErrorMsg(String(err));
    }
  };

  const handleClose = () => {
    if (status === 'success') {
      window.location.reload();
    }
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-editor-panel border border-editor-border rounded-lg shadow-xl w-[420px] max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-editor-border">
          <Upload size={16} className="text-editor-accent" />
          <h2 className="text-sm font-semibold text-editor-text">GIS Veritabanı İçe Aktar</h2>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {status === 'idle' && (
            <>
              <p className="text-xs text-editor-text-muted mb-3">
                Göçer veritabanından aşağıdaki katmanlar içe aktarılacak:
              </p>
              <div className="space-y-1 mb-4">
                {[
                  { name: 'Göçer Noktaları', count: 22, type: 'anchor' },
                  { name: 'Göç Rotaları', count: 8, type: 'route' },
                  { name: 'Göç Rotaları (Ek)', count: 4, type: 'route' },
                  { name: 'Kış Yurtları', count: 7, type: 'anchor' },
                  { name: 'Kış Yurtları (Bazın)', count: 8, type: 'anchor' },
                  { name: 'Yerleşimler', count: 74, type: 'anchor' },
                  { name: 'Görülen Köyler', count: 45, type: 'anchor' },
                  { name: 'Şehir Sınırları', count: 5, type: 'annotation' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="text-editor-text">{item.name}</span>
                    <span className="text-editor-text-muted">
                      {item.count} {item.type}
                    </span>
                  </div>
                ))}
                <div className="border-t border-editor-border pt-1 mt-2 flex items-center justify-between text-xs font-semibold">
                  <span className="text-editor-text">Toplam</span>
                  <span className="text-editor-accent">~181 düğüm (8 grup + 173 veri)</span>
                </div>
              </div>
            </>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center py-6">
              <Loader2 size={24} className="animate-spin text-editor-accent mb-2" />
              <p className="text-xs text-editor-text-muted">İçe aktarılıyor...</p>
            </div>
          )}

          {status === 'success' && result && (
            <div className="py-3">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-sm font-semibold text-green-500">
                  {result.created} düğüm oluşturuldu
                </span>
              </div>
              <div className="space-y-1">
                {result.summary.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="text-editor-text">{s.name}</span>
                    <span className="text-editor-text-muted">{s.features} öğe</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-editor-text-muted mt-3">
                Sayfa yenilenecek ve düğümler editörde görünecek.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-3">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-red-500" />
                <span className="text-sm font-semibold text-red-500">Hata</span>
              </div>
              <p className="text-xs text-red-400">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-editor-border">
          {status === 'idle' && (
            <>
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs rounded-md text-editor-text-muted hover:text-editor-text hover:bg-editor-surface-hover transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleImport}
                className="px-3 py-1.5 text-xs rounded-md bg-editor-accent text-white hover:bg-editor-accent/90 transition-colors"
              >
                İçe Aktar
              </button>
            </>
          )}
          {(status === 'success' || status === 'error') && (
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-xs rounded-md bg-editor-accent text-white hover:bg-editor-accent/90 transition-colors"
            >
              {status === 'success' ? 'Tamam' : 'Kapat'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
