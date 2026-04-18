'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Upload, Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { cn } from '@/lib/utils';

type ParsedRow = {
  player_id: string;
  market_value_eur: number | null;
  contract_end: string | null;
  full_name?: string;
  club?: string;
};

type ImportResponse = {
  success: boolean;
  total_rows: number;
  valid_rows: number;
  applicable_rows: number;
  updated: number;
  errored: number;
  validation_errors: Array<{ index: number; reason: string }>;
  update_error_sample: string[];
};

/**
 * Minimaler CSV-Parser: split by lines, handle quoted fields.
 * Supports comma OR semicolon separator (auto-detect).
 */
function parseCSV(text: string): { header: string[]; rows: string[][]; sep: ',' | ';' } {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const firstLine = text.split('\n')[0];
  const sep: ',' | ';' = (firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length ? ';' : ',';

  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === sep) {
        current.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        current.push(field);
        if (current.some((v) => v.length > 0)) rows.push(current);
        current = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    if (current.some((v) => v.length > 0)) rows.push(current);
  }

  const header = rows.shift() ?? [];
  return { header, rows, sep };
}

export function AdminCSVImportTab() {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [parsed, setParsed] = useState<{ rows: ParsedRow[]; header: string[]; parseErrors: string[] } | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/players-csv/export');
      if (!res.ok) {
        addToast(t('csvImportExportError'), 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `players-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast(t('csvImportExportSuccess'), 'success');
    } catch (err) {
      console.error('[csv-export]', err);
      addToast(t('csvImportExportError'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setResult(null);
    try {
      const text = await file.text();
      const { header, rows: dataRows } = parseCSV(text);
      const idxPlayerId = header.findIndex((h) => h.trim().toLowerCase() === 'player_id');
      const idxFullName = header.findIndex((h) => h.trim().toLowerCase() === 'full_name');
      const idxClub = header.findIndex((h) => h.trim().toLowerCase() === 'club');
      const idxMv = header.findIndex((h) => h.trim().toLowerCase() === 'market_value_eur');
      const idxCe = header.findIndex((h) => h.trim().toLowerCase() === 'contract_end');

      if (idxPlayerId < 0) {
        setParsed({ rows: [], header, parseErrors: [t('csvImportMissingPlayerId')] });
        return;
      }

      const parseErrors: string[] = [];
      const parsed: ParsedRow[] = [];
      for (let i = 0; i < dataRows.length; i++) {
        const r = dataRows[i];
        const player_id = (r[idxPlayerId] ?? '').trim();
        if (!player_id) {
          parseErrors.push(`Row ${i + 2}: empty player_id`);
          continue;
        }
        const mvRaw = idxMv >= 0 ? (r[idxMv] ?? '').trim() : '';
        const ceRaw = idxCe >= 0 ? (r[idxCe] ?? '').trim() : '';
        let market_value_eur: number | null = null;
        if (mvRaw !== '') {
          const n = Number(mvRaw);
          if (!Number.isFinite(n) || n < 0) {
            parseErrors.push(`Row ${i + 2}: invalid market_value "${mvRaw}"`);
            continue;
          }
          market_value_eur = Math.round(n);
        }
        let contract_end: string | null = null;
        if (ceRaw !== '') {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(ceRaw)) {
            parseErrors.push(`Row ${i + 2}: invalid contract_end "${ceRaw}" (expect YYYY-MM-DD)`);
            continue;
          }
          contract_end = ceRaw;
        }
        parsed.push({
          player_id,
          market_value_eur,
          contract_end,
          full_name: idxFullName >= 0 ? r[idxFullName]?.trim() : undefined,
          club: idxClub >= 0 ? r[idxClub]?.trim() : undefined,
        });
      }
      setParsed({ rows: parsed, header, parseErrors: parseErrors.slice(0, 20) });
    } catch (err) {
      console.error('[csv-parse]', err);
      setParsed({ rows: [], header: [], parseErrors: [String(err)] });
    } finally {
      setParsing(false);
    }
  };

  const handleApply = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    if (!confirm(t('csvImportConfirm', { count: parsed.rows.length }))) return;

    setApplying(true);
    try {
      const res = await fetch('/api/admin/players-csv/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsed.rows.map((r) => ({
            player_id: r.player_id,
            market_value_eur: r.market_value_eur,
            contract_end: r.contract_end,
          })),
        }),
      });
      const json = (await res.json()) as ImportResponse;
      setResult(json);
      if (json.success) {
        addToast(t('csvImportSuccess', { n: json.updated }), 'success');
      } else {
        addToast(t('csvImportPartial', { ok: json.updated, err: json.errored }), 'error');
      }
    } catch (err) {
      console.error('[csv-apply]', err);
      addToast(t('csvImportError'), 'error');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-white/60">{t('csvImportIntro')}</div>

      {/* Export Section */}
      <Card className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
            <Download className="size-5 text-white/60" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-white">{t('csvImportExportTitle')}</div>
            <div className="text-xs text-white/50 mt-0.5">{t('csvImportExportDesc')}</div>
          </div>
        </div>
        <Button onClick={handleExport} disabled={exporting} className="w-full min-h-[44px]">
          {exporting ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          <span className="ml-2">{exporting ? t('dataSyncRunning') : t('csvImportExportBtn')}</span>
        </Button>
      </Card>

      {/* Import Section */}
      <Card className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
            <Upload className="size-5 text-white/60" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-white">{t('csvImportUploadTitle')}</div>
            <div className="text-xs text-white/50 mt-0.5">{t('csvImportUploadDesc')}</div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={parsing || applying}
          className="block w-full text-xs text-white/60 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:cursor-pointer hover:file:bg-white/15"
        />

        {parsing && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {t('csvImportParsing')}
          </div>
        )}

        {parsed && (
          <div className="space-y-2">
            <div className="text-xs text-white/70 flex items-center gap-2">
              <FileText className="size-3.5" aria-hidden="true" />
              {t('csvImportParsedCount', { n: parsed.rows.length })}
              {parsed.parseErrors.length > 0 && (
                <span className="text-rose-400">· {parsed.parseErrors.length} {t('csvImportErrorsLabel')}</span>
              )}
            </div>

            {parsed.parseErrors.length > 0 && (
              <div className="text-[10px] text-rose-400/80 bg-rose-500/5 border border-rose-400/20 rounded-lg p-2 max-h-24 overflow-y-auto font-mono">
                {parsed.parseErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}

            {parsed.rows.length > 0 && (
              <>
                <div className="text-[10px] text-white/40 font-mono overflow-x-auto whitespace-nowrap border-t border-white/5 pt-2">
                  {parsed.rows.slice(0, 5).map((r, i) => (
                    <div key={i} className="truncate">
                      {r.full_name ?? r.player_id.slice(0, 8)} · MV={r.market_value_eur ?? '—'} · Contract={r.contract_end ?? '—'}
                    </div>
                  ))}
                  {parsed.rows.length > 5 && <div className="text-white/30">… +{parsed.rows.length - 5} more</div>}
                </div>

                <Button
                  onClick={handleApply}
                  disabled={applying || parsed.rows.length === 0}
                  className="w-full min-h-[44px]"
                >
                  {applying ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <Upload className="size-4" aria-hidden="true" />
                  )}
                  <span className="ml-2">
                    {applying ? t('csvImportApplying') : t('csvImportApplyBtn', { n: parsed.rows.length })}
                  </span>
                </Button>
              </>
            )}
          </div>
        )}

        {result && (
          <div
            className={cn(
              'rounded-xl p-3 border text-xs space-y-1.5',
              result.success
                ? 'bg-emerald-500/5 border-emerald-400/20'
                : 'bg-rose-500/5 border-rose-400/20',
            )}
            role="status"
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <XCircle className="size-4 text-rose-400" aria-hidden="true" />
              )}
              <span className="font-medium text-white">
                {result.updated} updated · {result.errored} errored · {result.validation_errors.length} invalid
              </span>
            </div>
            <pre className="text-white/60 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}
