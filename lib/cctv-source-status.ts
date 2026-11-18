import type { CCTVSourceStatus } from '@/types/cctv';

/**
 * ATCS Denpasar memakai SafeLine WAF yang membalas kode nonstandar 468
 * (bukan bagian dari spesifikasi HTTP) untuk permintaan yang dianggap bot.
 */
export const WAF_BLOCKED_STATUS = 468;

/** Subdomain yang menjadi tujuan redirect saat Pemkot Denpasar memelihara situsnya. */
export const MAINTENANCE_HOST = 'maintenance.denpasarkota.go.id';

export interface SourceStatusResult {
  status: CCTVSourceStatus;
  detail?: string;
}

function hostOf(location: string): string {
  try {
    return new URL(location).host;
  } catch {
    return location;
  }
}

/**
 * Menerjemahkan respons HTTP sumber ATCS Denpasar menjadi status yang bisa
 * ditampilkan ke pengguna. Dipisah dari lapisan fetch agar bisa diuji tanpa
 * jaringan.
 */
export function classifyDenpasarResponse(
  status: number,
  location: string | null
): SourceStatusResult {
  if (status >= 300 && status < 400) {
    if (location && location.includes(MAINTENANCE_HOST)) {
      return {
        status: 'maintenance',
        detail: 'Situs ATCS Denpasar dialihkan ke halaman pemeliharaan Pemkot Denpasar.',
      };
    }

    return {
      status: 'unavailable',
      detail: location
        ? `ATCS Denpasar mengalihkan ke ${hostOf(location)}.`
        : 'ATCS Denpasar membalas redirect tanpa tujuan yang jelas.',
    };
  }

  if (status === WAF_BLOCKED_STATUS) {
    return {
      status: 'blocked',
      detail: 'Permintaan ditolak WAF ATCS Denpasar (HTTP 468).',
    };
  }

  if (status === 403) {
    return {
      status: 'blocked',
      detail: 'ATCS Denpasar menolak akses (HTTP 403).',
    };
  }

  if (status < 200 || status >= 300) {
    return {
      status: 'unavailable',
      detail: `ATCS Denpasar membalas HTTP ${status}.`,
    };
  }

  return { status: 'ok' };
}

/**
 * Status untuk sumber yang diakses lewat koneksi langsung. Kegagalan jaringan
 * (DNS, TLS, connection refused) diterjemahkan menjadi `unavailable`.
 */
export function classifyNetworkFailure(error: unknown): SourceStatusResult {
  const code =
    typeof error === 'object' && error !== null && 'cause' in error
      ? (error as { cause?: { code?: string } }).cause?.code
      : undefined;

  return {
    status: 'unavailable',
    detail: code
      ? `Tidak dapat terhubung ke sumber (${code}).`
      : 'Tidak dapat terhubung ke sumber.',
  };
}
