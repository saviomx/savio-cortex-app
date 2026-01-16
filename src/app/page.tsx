'use client';

import { useState, useRef } from 'react';
import { Header } from '@/components/header';
import { LeadSidebar, type LeadStatus } from '@/components/lead-sidebar';
import { LeadList, type LeadListRef } from '@/components/lead-list';
import { ChatPanel } from '@/components/chat-panel';
import type { ConversationSearchItem } from '@/types/cortex';

interface SelectedLead extends ConversationSearchItem {
  displayName: string;
  timeAgo: string;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<LeadStatus>('all');
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const leadListRef = useRef<LeadListRef>(null);

  const handleCategoryChange = (category: LeadStatus) => {
    setSelectedCategory(category);
  };

  const handleDateChange = (from: string | null, to: string | null) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleSelectLead = (lead: SelectedLead) => {
    setSelectedLead(lead);
  };

  const handleLeadUpdate = () => {
    leadListRef.current?.refresh();
  };

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
          className="w-56 flex-shrink-0 hidden md:flex flex-col"
        />

        {/* Middle Panel - Lead List */}
        <LeadList
          ref={leadListRef}
          selectedCategory={selectedCategory}
          dateFrom={dateFrom}
          dateTo={dateTo}
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
