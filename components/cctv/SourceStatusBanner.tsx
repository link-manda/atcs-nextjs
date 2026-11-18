import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CCTVSourceHealth, CCTVSourceStatus } from '@/types/cctv';

type DegradedStatus = Exclude<CCTVSourceStatus, 'ok'>;

const STATUS_META: Record<DegradedStatus, { label: string; className: string }> = {
  maintenance: {
    label: 'Pemeliharaan',
    className: 'bg-tertiary/15 text-tertiary',
  },
  blocked: {
    label: 'Diblokir WAF',
    className: 'bg-error/15 text-error',
  },
  unavailable: {
    label: 'Tidak Terjangkau',
    className: 'bg-error/15 text-error',
  },
};

interface Props {
  health: CCTVSourceHealth[];
  compact?: boolean;
  className?: string;
}

/**
 * Memberi tahu pengguna bahwa sebagian sumber kamera sengaja disembunyikan,
 * supaya grid tidak menampilkan pratinjau yang tidak akan pernah termuat.
 */
export default function SourceStatusBanner({ health, compact = false, className }: Props) {
  const degraded = health.filter((source) => source.status !== 'ok');

  if (!degraded.length) return null;

  return (
    <section
      role="status"
      aria-live="polite"
      className={cn('rounded-lg bg-surface-container-high px-4 py-3', className)}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tertiary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-headline text-[11px] font-bold uppercase tracking-widest text-on-surface">
            Sebagian Sumber CCTV Tidak Tersedia
          </p>

          <ul className="mt-1.5 space-y-1">
            {degraded.map((source) => {
              const meta = STATUS_META[source.status as DegradedStatus];
              return (
                <li
                  key={source.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant"
                >
                  <span className="font-medium text-on-surface">{source.label}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                      meta.className
                    )}
                  >
                    {meta.label}
                  </span>
                  {source.detail && <span className="min-w-0">{source.detail}</span>}
                </li>
              );
            })}
          </ul>

          {!compact && (
            <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">
              Kamera dari sumber ini tidak ditampilkan agar tidak muncul pratinjau yang gagal
              dimuat. Daftar kembali otomatis begitu sumber pulih.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
