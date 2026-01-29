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
  const [assignedSdrId, setAssignedSdrId] = useState<number | null>(null);
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

  const handleSdrChange = useCallback((sdrId: number | null) => {
    setAssignedSdrId(sdrId);
  }, []);

  const handleSelectLead = useCallback((lead: SelectedLead | null) => {
    setSelectedLead(lead);
  }, []);

  const handleLeadUpdate = useCallback(() => {
    leadListRef.current?.refresh();
  }, []);

  // Mobile back handler - clears selected lead to show list
  const handleMobileBack = useCallback(() => {
    setSelectedLead(null);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Top Header - hidden on mobile when conversation is open */}
      <div className={selectedLead ? 'hidden md:block' : ''}>
        <Header activeTab="inbox" />
      </div>

      {/* Main Content - pb-14 on mobile for bottom nav, pb-0 when header hidden */}
      <div className={`flex-1 flex overflow-hidden md:pb-0 ${selectedLead ? 'pb-0' : 'pb-14'}`}>
        {/* Left Sidebar - Categories */}
        <LeadSidebar
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          onDateChange={handleDateChange}
          initialDateFrom={defaultDates.from}
          initialDateTo={defaultDates.to}
          windowStatus={windowStatus}
          onWindowStatusChange={handleWindowStatusChange}
          assignedSdrId={assignedSdrId}
          onSdrChange={handleSdrChange}
          className="w-56 flex-shrink-0 hidden md:flex flex-col"
        />

        {/* Middle Panel - Lead List */}
        {/* On mobile: show only when no lead selected. On desktop: always show */}
        <LeadList
          ref={leadListRef}
          selectedCategory={selectedCategory}
          dateFrom={dateFrom}
          dateTo={dateTo}
          windowStatus={windowStatus}
          assignedSdrId={assignedSdrId}
          selectedLeadId={selectedLead?.external_id || (selectedLead?.id ? String(selectedLead.id) : null)}
          onSelectLead={handleSelectLead}
          onCategoryChange={handleCategoryChange}
          onDateChange={handleDateChange}
          onWindowStatusChange={handleWindowStatusChange}
          onSdrChange={handleSdrChange}
          className={`w-full md:w-80 flex-shrink-0 min-h-0 ${selectedLead ? 'hidden md:flex' : 'flex'}`}
        />

        {/* Right Panel - Chat */}
        {/* On mobile: show only when lead selected. On desktop: always show */}
        <ChatPanel
          leadId={selectedLead?.external_id || (selectedLead?.id ? String(selectedLead.id) : null)}
          leadName={selectedLead?.displayName || selectedLead?.client_name || undefined}
          leadCompany={selectedLead?.client_company || undefined}
          leadPhone={selectedLead?.client_phone || undefined}
          onLeadUpdate={handleLeadUpdate}
          onMobileBack={handleMobileBack}
          className={`flex-1 min-w-0 min-h-0 ${selectedLead ? 'flex' : 'hidden md:flex'}`}
        />
      </div>
    </div>
  );
}
