'use client';

import { useState, useRef } from 'react';
import { Header } from '@/components/header';
import { LeadSidebar } from '@/components/lead-sidebar';
import { LeadList, type LeadListRef } from '@/components/lead-list';
import { ChatPanel } from '@/components/chat-panel';
import type { LeadCategory, ConversationSearchItem } from '@/types/cortex';

interface SelectedLead extends ConversationSearchItem {
  displayName: string;
  timeAgo: string;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<LeadCategory>('all');
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null);
  const leadListRef = useRef<LeadListRef>(null);

  const handleCategoryChange = (category: LeadCategory) => {
    setSelectedCategory(category);
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
          className="w-48 flex-shrink-0 hidden md:flex flex-col"
        />

        {/* Middle Panel - Lead List */}
        <LeadList
          ref={leadListRef}
          selectedCategory={selectedCategory}
          selectedLeadId={selectedLead?.external_id || (selectedLead?.id ? String(selectedLead.id) : null)}
          onSelectLead={handleSelectLead}
          className="w-80 flex-shrink-0 min-h-0"
        />

        {/* Right Panel - Chat */}
        <ChatPanel
          leadId={selectedLead?.external_id || (selectedLead?.id ? String(selectedLead.id) : null)}
          leadName={selectedLead?.displayName || selectedLead?.client_name || undefined}
          leadCompany={selectedLead?.client_company || undefined}
          onLeadUpdate={handleLeadUpdate}
          className="flex-1 min-w-0 min-h-0"
        />
      </div>
    </div>
  );
}
