'use client';

import React from 'react';
import CCTVMap from '@/components/cctv/CCTVMap';
import { CCTVChannel } from '@/types/cctv';

interface DashboardMapProps {
  cameras: CCTVChannel[];
}

/**
 * Wrapper for the Tactical Map used in Dashboard and Analytics.
 * In this version, it uses the CCTVMap pseudo-interface.
 */
export default function DashboardMap({ cameras }: DashboardMapProps) {
  // CCTVMap expects selectedIds and onCameraClick
  const noop = () => {};
  const emptySet = new Set<number>();

  return (
    <CCTVMap 
      cameras={cameras} 
      selectedIds={emptySet} 
      onCameraClick={noop} 
    />
  );
}
