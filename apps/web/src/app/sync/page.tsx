'use client';

import React from 'react';
import { CloudSyncPanel } from '../../components/sync/CloudSyncPanel';

export default function SyncPage() {
  return (
    <div className="max-w-4xl mx-auto w-full py-4">
      <CloudSyncPanel />
    </div>
  );
}
