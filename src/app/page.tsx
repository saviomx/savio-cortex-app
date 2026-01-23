'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Header } from '@/components/header';
import { LeadSidebar, type LeadStatus, type WindowStatus } from '@/components/lead-sidebar';
import { LeadList, type LeadListRef } from '@/components/lead-list';
import { ChatPanel } from '@/components/chat-panel';
import type { ConversationSearchItem } from '@/types/cortex';

interface SelectedLead extends ConversationSearchItem {
  displayName: string;
}

// Helper to get date string in YYYY-MM-DD format
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Calculate default date range (last 7 days)
function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  return {
    from: getDateString(sevenDaysAgo),
    to: getDateString(today),
  };
}

export default function Home() {
  // Initialize with default 7-day date range
  const defaultDates = useMemo(() => getDefaultDateRange(), []);
  const [selectedCategory, setSelectedCategory] = useState<LeadStatus>('all');
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(defaultDates.from);
  const [dateTo, setDateTo] = useState<string | null>(defaultDates.to);
  const [windowStatus, setWindowStatus] = useState<WindowStatus>('all');
  const leadListRef = useRef<LeadListRef>(null);

  const handleCategoryChange = useCallback((category: LeadStatus) => {
    setSelectedCategory(category);
  }, []);

  const handleDateChange = useCallback((from: string | null, to: string | null) => {
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const handleWindowStatusChange = useCallback((status: WindowStatus) => {
    setWindowStatus(status);
  }, []);

  const handleSelectLead = useCallback((lead: SelectedLead | null) => {
    setSelectedLead(lead);
  }, []);

  const handleLeadUpdate = useCallback(() => {
    leadListRef.current?.refresh();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Top Header */}
      <Header activeTab="inbox" />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Categories */}
        <LeadSidebar
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          onDateChange={handleDateChange}
          initialDateFrom={defaultDates.from}
          initialDateTo={defaultDates.to}
          windowStatus={windowStatus}
          onWindowStatusChange={handleWindowStatusChange}
          className="w-56 flex-shrink-0 hidden md:flex flex-col"
        />

        {/* Middle Panel - Lead List */}
        <LeadList
          ref={leadListRef}
          selectedCategory={selectedCategory}
          dateFrom={dateFrom}
          dateTo={dateTo}
          windowStatus={windowStatus}
          selectedLeadId={selectedLead?.external_id || (selectedLead?.id ? String(selectedLead.id) : null)}
          onSelectLead={handleSelectLead}
          className="w-80 flex-shrink-0 min-h-0"
        />

        {/* Right Panel - Chat */}
        <ChatPanel
          leadId={selectedLead?.external_id || (selectedLead?.id ? String(selectedLead.id) : null)}
          leadName={selectedLead?.displayName || selectedLead?.client_name || undefined}
          leadCompany={selectedLead?.client_company || undefined}
          leadPhone={selectedLead?.client_phone || undefined}
          onLeadUpdate={handleLeadUpdate}
          className="flex-1 min-w-0 min-h-0"
        />
      </div>
    </div>
  );
}
