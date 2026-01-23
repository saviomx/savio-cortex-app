'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { Header } from '@/components/header';
import { MermaidDiagram } from '@/components/mermaid-diagram';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronRight,
  Brain,
  FileText,
  Code2,
  Zap,
  GitBranch,
  Copy,
  Check,
  Search,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AgentArchitectureResponse,
  PromptListResponse,
  PromptDetail,
  PromptMetadata,
  PromptCategory,
} from '@/types/cortex';

// Helper type for architecture node display
interface ArchitectureNode {
  id: string;
  name: string;
  description?: string;
}

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

// Debounce delay for search (ms)
const SEARCH_DEBOUNCE_MS = 300;

// Fetcher function for SWR
const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load data');
  }
  return response.json();
};

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Category colors and labels
const CATEGORY_CONFIG: Record<PromptCategory, { color: string; label: string; bgColor: string }> = {
  system: { color: 'text-blue-700', label: 'System', bgColor: 'bg-blue-50 border-blue-200' },
  qualification: { color: 'text-purple-700', label: 'Qualification', bgColor: 'bg-purple-50 border-purple-200' },
  data_gathering: { color: 'text-green-700', label: 'Data Gathering', bgColor: 'bg-green-50 border-green-200' },
  scheduling: { color: 'text-orange-700', label: 'Scheduling', bgColor: 'bg-orange-50 border-orange-200' },
  terminal: { color: 'text-red-700', label: 'Terminal', bgColor: 'bg-red-50 border-red-200' },
  routing: { color: 'text-cyan-700', label: 'Routing', bgColor: 'bg-cyan-50 border-cyan-200' },
  detection: { color: 'text-yellow-700', label: 'Detection', bgColor: 'bg-yellow-50 border-yellow-200' },
};

function formatLastUpdated(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function AIBrainPage() {
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [loadingPrompt, setLoadingPrompt] = useState<string | null>(null);
  const [promptDetails, setPromptDetails] = useState<Record<string, PromptDetail>>({});
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Debounced search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Fetch architecture data
  const {
    data: architecture,
    error: archError,
    isLoading: archLoading,
    isValidating: archValidating,
    mutate: mutateArch,
  } = useSWR<AgentArchitectureResponse>('/api/ai/architecture', fetcher, {
    dedupingInterval: CACHE_DURATION,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    onSuccess: () => setLastFetched(new Date()),
  });

  // Fetch prompts list
  const {
    data: promptsData,
    error: promptsError,
    isLoading: promptsLoading,
    mutate: mutatePrompts,
  } = useSWR<PromptListResponse>('/api/ai/prompts', fetcher, {
    dedupingInterval: CACHE_DURATION,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  const handleRefresh = () => {
    mutateArch();
    mutatePrompts();
  };

  // Handle node click from diagram - toggle selection
  const handleNodeClick = useCallback((agentId: string) => {
    setSelectedNode((prev) => (prev === agentId ? null : agentId));
  }, []);

  // Toggle prompt expansion and fetch details
  const togglePrompt = useCallback(async (promptId: string) => {
    const newExpanded = new Set(expandedPrompts);

    if (newExpanded.has(promptId)) {
      newExpanded.delete(promptId);
    } else {
      newExpanded.add(promptId);

      // Fetch prompt details if not already loaded
      if (!promptDetails[promptId]) {
        setLoadingPrompt(promptId);
        try {
          const response = await fetch(`/api/ai/prompts/${encodeURIComponent(promptId)}`);
          if (response.ok) {
            const detail: PromptDetail = await response.json();
            setPromptDetails((prev) => ({ ...prev, [promptId]: detail }));
          }
        } catch (err) {
          console.error('Failed to fetch prompt details:', err);
        } finally {
          setLoadingPrompt(null);
        }
      }
    }

    setExpandedPrompts(newExpanded);
  }, [expandedPrompts, promptDetails]);

  // Copy prompt content to clipboard
  const copyPromptContent = useCallback(async (promptId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPromptId(promptId);
      setTimeout(() => setCopiedPromptId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Filter prompts based on selected node and debounced search query
  const filteredPrompts = useMemo(() => {
    if (!promptsData?.prompts) return [];

    let filtered = promptsData.prompts;

    // Filter by selected node with flexible matching
    if (selectedNode) {
      const normalizedSelected = selectedNode.toLowerCase().replace(/[\s-]+/g, '_');

      filtered = filtered.filter((p) => {
        // Check if any of the prompt's nodes match the selected node
        return p.nodes.some((node) => {
          const normalizedNode = node.toLowerCase().replace(/[\s-]+/g, '_');
          // Match exactly, or if one contains the other
          return normalizedNode === normalizedSelected ||
                 normalizedNode.includes(normalizedSelected) ||
                 normalizedSelected.includes(normalizedNode);
        });
      });
    }

    // Filter by debounced search query for performance
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [promptsData?.prompts, selectedNode, debouncedSearchQuery]);

  // Group prompts by category
  const promptsByCategory = useMemo(() => {
    const groups: Record<PromptCategory, PromptMetadata[]> = {
      system: [],
      qualification: [],
      data_gathering: [],
      scheduling: [],
      terminal: [],
      routing: [],
      detection: [],
    };

    filteredPrompts.forEach((prompt) => {
      if (groups[prompt.category]) {
        groups[prompt.category].push(prompt);
      }
    });

    return groups;
  }, [filteredPrompts]);

  const loading = archLoading || promptsLoading;
  const error = archError || promptsError;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header activeTab="ai-brain" />

      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-7 h-7 text-indigo-600" />
                AI Brain
              </h1>
              <p className="text-gray-500">
                Multi-agent architecture and prompt system
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Last Updated & Refresh */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {lastFetched && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatLastUpdated(lastFetched)}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={archValidating}
                  className="gap-1.5"
                >
                  <RefreshCw className={cn('w-4 h-4', archValidating && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span>{error.message || 'Failed to load AI architecture'}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Diagram */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-indigo-600" />
                  Simplified Agent Flow
                </h2>
                {selectedNode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedNode(null)}
                    className="text-gray-500 gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear selection
                  </Button>
                )}
              </div>

              {loading ? (
                <Skeleton className="h-[500px]" />
              ) : architecture?.diagram ? (
                <div className="relative">
                  <MermaidDiagram
                    diagram={architecture.diagram}
                    selectedNode={selectedNode}
                    onNodeClick={handleNodeClick}
                    nodeIdMapping={architecture.node_id_mapping}
                    className="h-[500px]"
                  />
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Click on a node to filter prompts. Scroll to zoom, drag to pan.
                  </p>
                </div>
              ) : (
                <div className="h-[500px] flex items-center justify-center text-gray-500">
                  No diagram available
                </div>
              )}

              {/* Node Legend */}
              {architecture?.nodes && (
                <div className="mt-4 pt-4 border-t border-gray-100" role="group" aria-label="Filter by agent node">
                  <p className="text-xs font-medium text-gray-500 mb-2">Agent Nodes</p>
                  <div className="flex flex-wrap gap-2">
                    {(architecture.nodes as unknown as ArchitectureNode[]).map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleNodeClick(node.id)}
                        aria-pressed={selectedNode === node.id}
                        title={node.description || `Filter by ${node.name}`}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
                          selectedNode === node.id
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-medium'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        {node.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Prompts */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Prompts
                  {promptsData && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredPrompts.length}
                      {selectedNode && ` / ${promptsData.total}`}
                    </Badge>
                  )}
                </h2>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <label htmlFor="prompt-search" className="sr-only">
                  Search prompts
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  id="prompt-search"
                  type="text"
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  aria-describedby={debouncedSearchQuery !== searchQuery ? 'search-loading' : undefined}
                />
                {debouncedSearchQuery !== searchQuery && (
                  <span id="search-loading" className="sr-only">Searching...</span>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredPrompts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {selectedNode || searchQuery
                    ? 'No prompts match the current filter'
                    : 'No prompts available'}
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {Object.entries(promptsByCategory).map(
                    ([category, prompts]) =>
                      prompts.length > 0 && (
                        <div key={category}>
                          <div
                            className={cn(
                              'px-3 py-1.5 rounded-t-lg border-b text-sm font-medium',
                              CATEGORY_CONFIG[category as PromptCategory]?.bgColor
                            )}
                          >
                            <span className={CATEGORY_CONFIG[category as PromptCategory]?.color}>
                              {CATEGORY_CONFIG[category as PromptCategory]?.label}
                            </span>
                            <span className="text-gray-400 ml-2">({prompts.length})</span>
                          </div>
                          <div className="space-y-1 border-x border-b border-gray-100 rounded-b-lg">
                            {prompts.map((prompt) => (
                              <PromptItem
                                key={prompt.id}
                                prompt={prompt}
                                isExpanded={expandedPrompts.has(prompt.id)}
                                isLoading={loadingPrompt === prompt.id}
                                detail={promptDetails[prompt.id]}
                                onToggle={() => togglePrompt(prompt.id)}
                                onCopy={copyPromptContent}
                                isCopied={copiedPromptId === prompt.id}
                              />
                            ))}
                          </div>
                        </div>
                      )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          {architecture && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Nodes"
                value={architecture.nodes.length}
                icon={<Zap className="w-5 h-5" />}
                color="blue"
              />
              <StatCard
                title="Total Prompts"
                value={promptsData?.total || 0}
                icon={<FileText className="w-5 h-5" />}
                color="purple"
              />
              <StatCard
                title="State Fields"
                value={architecture.state_fields.length}
                icon={<Code2 className="w-5 h-5" />}
                color="green"
              />
              <StatCard
                title="Categories"
                value={architecture.prompts_summary.length}
                icon={<GitBranch className="w-5 h-5" />}
                color="orange"
              />
            </div>
          )}

          {/* State Fields Reference */}
          {architecture?.state_fields && architecture.state_fields.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Code2 className="w-5 h-5 text-indigo-600" />
                State Fields
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {architecture.state_fields.map((field, index) => {
                  // State fields are objects with name as key and type as value
                  const entries = Object.entries(field);
                  if (entries.length === 0) return null;
                  const [name, type] = entries[0];
                  return (
                    <div
                      key={`${name}-${index}`}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono font-medium text-indigo-600">
                          {name}
                        </code>
                        <Badge variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Prompt item component
function PromptItem({
  prompt,
  isExpanded,
  isLoading,
  detail,
  onToggle,
  onCopy,
  isCopied,
}: {
  prompt: PromptMetadata;
  isExpanded: boolean;
  isLoading: boolean;
  detail?: PromptDetail;
  onToggle: () => void;
  onCopy: (id: string, content: string) => void;
  isCopied: boolean;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger
        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-start gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        aria-expanded={isExpanded}
        title={prompt.name}
      >
        <span className="mt-0.5" aria-hidden="true">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm truncate" title={prompt.name}>
              {prompt.name}
            </span>
            {prompt.nodes.map((node) => (
              <Badge key={node} variant="outline" className="text-xs shrink-0">
                {node}
              </Badge>
            ))}
          </div>
          {prompt.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1" title={prompt.description}>
              {prompt.description}
            </p>
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 pb-3 pl-9">
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : detail ? (
            <div className="space-y-2">
              {/* Variables */}
              {detail.variables && detail.variables.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {detail.variables.map((varName) => (
                    <code
                      key={varName}
                      className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200"
                    >
                      {`{${varName}}`}
                    </code>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="relative">
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-64">
                  <code>{detail.content}</code>
                </pre>
                <button
                  onClick={() => onCopy(prompt.id, detail.content)}
                  className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={isCopied ? 'Copied!' : 'Copy to clipboard'}
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>{detail.line_count} lines</span>
                <span>{detail.char_count} chars</span>
                {detail.file_path && (
                  <span className="font-mono truncate">{detail.file_path}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Click to load content</div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'green' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg border', colorClasses[color])}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}
