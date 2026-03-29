import type { CCTVRegion } from '@/types/cctv';

export const ALL_REGIONS: CCTVRegion[] = [
  'Badung',
  'Badung Selatan',
  'Denpasar',
  'Gianyar',
  'Klungkung',
  'Karangasem',
  'Buleleng',
  'Jembrana',
  'Tabanan',
  'Bangli',
  'Lainnya',
];

export function detectPlayerType(url: string): 'iframe' | 'video' {
  return url.endsWith('.mp4') || url.includes('/mp4/') ? 'video' : 'iframe';
}

interface RawCCTV {
  ch_name: string;
  streaming_url: string;
  lat: number | null;
  lng: number | null;
}

export function detectRegion(cctv: RawCCTV): CCTVRegion {
  const name = cctv.ch_name.toLowerCase();
  const url  = cctv.streaming_url.toLowerCase();

  if (url.includes('bulelengkab')) return 'Buleleng';

  if (
    name.includes('besakih') ||
    name.includes('pura batur') ||
    name.includes('batur') ||
    (name.includes('subagan') || name.includes('kodim')) &&
      cctv.lng !== null && cctv.lng > 115.5
  )
    return 'Karangasem';

  if (
    name.includes('jembrana') ||
    (name.includes('sudirman') && cctv.lng !== null && cctv.lng < 115.0) ||
    (name.includes('terminal cargo') && cctv.lng !== null && cctv.lng < 115.0)
  )
    return 'Jembrana';

  if (
    name.includes('semarapura') ||
    name.includes('klungkung') ||
    name.includes('goa lawah') ||
    name.includes('galiran') ||
    name.includes('tojan') ||
    name.includes('catus pata') ||
    name.includes('lepang') ||
    name.includes('banjarangkan') ||
    name.includes('pasar satria') ||
    name.includes('pasar senggol') ||
    (name.includes('simpang lima') && cctv.lng !== null && cctv.lng > 115.35)
  )
    return 'Klungkung';

  if (name.includes('padang galak') || name.includes('bali beach'))
    return 'Gianyar';

  if (
    name.includes('taman kota') ||
    name.includes('mario') ||
    name.includes('bale bengong') ||
    name.includes('wifi corner') ||
    name.includes('dangin carik') ||
    name.includes('garuda') ||
    name.includes('taman kota')
  )
    return 'Denpasar';

  if (
    name.includes('jimbaran') ||
    name.includes('kedongan') ||
    name.includes('tanjung benoa') ||
    name.includes('btdc') ||
    name.includes('ngurah rai') ||
    name.includes('underpass') ||
    name.includes('patung kuda') ||
    name.includes('tirtanadi') ||
    name.includes('pamelisan') ||
    name.includes('simpang benoa') ||
    name.includes('pintu tol') ||
    name.includes('kedonganan') ||
    name.includes('unud') ||
    name.includes('taman griya') ||
    name.includes('pantai jerman') ||
    name.includes('baruna')
  )
    return 'Badung Selatan';

  if (
    name.includes('legian') ||
    name.includes('seminyak') ||
    name.includes('kuta') ||
    name.includes('hardrock') ||
    name.includes('tuban') ||
    name.includes('patih jelantik') ||
    name.includes('arjuna') ||
    name.includes('double') ||
    name.includes('popies') ||
    name.includes('ground zero') ||
    name.includes('mengwi') ||
    name.includes('bencingah') ||
    name.includes('abiansemal') ||
    name.includes('petang')
  )
    return 'Badung';

  // Coordinate-based fallback
  if (cctv.lat !== null && cctv.lng !== null) {
    if (cctv.lat > -8.20)                                  return 'Buleleng';
    if (cctv.lng < 115.0)                                  return 'Jembrana';
    if (cctv.lng > 115.50)                                 return 'Karangasem';
    if (cctv.lat < -8.75)                                  return 'Badung Selatan';
    if (cctv.lat < -8.65 && cctv.lng < 115.22)            return 'Badung';
    if (cctv.lat > -8.55 && cctv.lng > 115.35)            return 'Klungkung';
    if (cctv.lng >= 115.10 && cctv.lng <= 115.15)          return 'Tabanan';
  }

  return 'Lainnya';
}
