import React from 'react';
import { LOOKUP_CLIENTS } from '@/lib/lookupData';

interface DynamicDropdownsProps {
  clientId?: string;
  siteId?: string;
  auditorId?: string;
  address?: string;
  onChange: (updates: { clientId?: string; clientName?: string; siteId?: string; siteName?: string; address?: string; auditorId?: string; auditorName?: string }) => void;
  readOnly?: boolean;
}

export function DynamicDropdowns({
  clientId = '',
  siteId = '',
  auditorId = '',
  address = '',
  onChange,
  readOnly = false
}: DynamicDropdownsProps) {
  const selectedClient = LOOKUP_CLIENTS.find((c) => c.id === clientId);
  const selectedSite = selectedClient?.sites.find((s) => s.id === siteId);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    const client = LOOKUP_CLIENTS.find((c) => c.id === cid);
    onChange({
      clientId: cid,
      clientName: client?.name || '',
      siteId: '',
      siteName: '',
      address: '',
      auditorId: '',
      auditorName: ''
    });
  };

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sid = e.target.value;
    const site = selectedClient?.sites.find((s) => s.id === sid);
    onChange({
      siteId: sid,
      siteName: site?.name || '',
      address: site?.address || '',
      auditorId: '',
      auditorName: ''
    });
  };

  const handleAuditorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const audId = e.target.value;
    const auditor = selectedSite?.auditors.find((a) => a.id === audId);
    onChange({
      auditorId: audId,
      auditorName: auditor?.name || ''
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full">
      {/* Client Selection */}
      <div className="space-y-2 text-left">
        <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Client Organization</label>
        <select
          value={clientId}
          disabled={readOnly}
          onChange={handleClientChange}
          className="w-full h-11 text-xs rounded-lg border border-border/80 bg-card px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
        >
          <option value="">Select Client</option>
          {LOOKUP_CLIENTS.map((cli) => (
            <option key={cli.id} value={cli.id}>
              {cli.name}
            </option>
          ))}
        </select>
      </div>

      {/* Site Selection */}
      <div className="space-y-2 text-left">
        <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Site / Branch Location</label>
        <select
          value={siteId}
          disabled={readOnly || !clientId}
          onChange={handleSiteChange}
          className="w-full h-11 text-xs rounded-lg border border-border/80 bg-card px-3 py-2.5 text-foreground focus:border-primary focus:outline-none disabled:opacity-50 focus:ring-1 focus:ring-primary/20"
        >
          <option value="">Select Site</option>
          {selectedClient?.sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {/* Auditor Selection */}
      <div className="space-y-2 text-left">
        <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Lead Auditor</label>
        <select
          value={auditorId}
          disabled={readOnly || !siteId}
          onChange={handleAuditorChange}
          className="w-full h-11 text-xs rounded-lg border border-border/80 bg-card px-3 py-2.5 text-foreground focus:border-primary focus:outline-none disabled:opacity-50 focus:ring-1 focus:ring-primary/20"
        >
          <option value="">Select Lead Auditor</option>
          {selectedSite?.auditors.map((aud) => (
            <option key={aud.id} value={aud.id}>
              {aud.name}
            </option>
          ))}
        </select>
      </div>

      {/* Auto-filled Site Address Block */}
      {address && (
        <div className="md:col-span-3 bg-muted/20 border border-border/60 p-3 rounded-lg text-left">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">Physical Audit Address</span>
          <span className="text-xs text-foreground font-semibold leading-relaxed block">{address}</span>
        </div>
      )}
    </div>
  );
}
