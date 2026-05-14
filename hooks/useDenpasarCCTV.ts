import { useState, useEffect } from 'react';
import { CCTVChannel } from '@/types/cctv';

const DENPASAR_API_URL = 'https://atcs.denpasarkota.go.id/api/v3/pv/ldevice';

export function useDenpasarCCTV() {
  const [data, setData] = useState<CCTVChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(DENPASAR_API_URL)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const channels: CCTVChannel[] = [];
        
        if (result && result.data && Array.isArray(result.data)) {
          result.data.forEach((lokasi: any) => {
             if (lokasi.tb_device_lokasi && Array.isArray(lokasi.tb_device_lokasi)) {
                lokasi.tb_device_lokasi.forEach((cam: any, idx: number) => {
                   channels.push({
                     cctv_id: parseInt(`999${lokasi.id_lokasi}${idx}`),
                     ch_id: `DPS-${lokasi.id_lokasi}-${idx}`,
                     ch_name: cam.nama_alias || cam.nama || 'Denpasar CCTV',
                     lat: lokasi.lat_lokasi || null,
                     lng: lokasi.lon_lokasi || null,
                     streaming_url: (cam.url_proxy_hls || '').trim(),
                     player_type: 'iframe',
                     region: 'Denpasar'
                   });
                });
             }
          });
        }
        
        setData(channels);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}

