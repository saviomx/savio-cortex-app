'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MermaidDiagramProps {
  diagram: string;
  className?: string;
  onNodeClick?: (nodeId: string) => void;
  selectedNode?: string | null;
  nodeIdMapping?: Record<string, string>;
}

// Initialize mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis',
    padding: 20,
    nodeSpacing: 50,
    rankSpacing: 80,
  },
  themeVariables: {
    // Node colors
    primaryColor: '#e0e7ff',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#6366f1',
    // Line/edge colors - IMPORTANT: must be visible
    lineColor: '#64748b',
    // Secondary/tertiary
    secondaryColor: '#f1f5f9',
    secondaryTextColor: '#1e293b',
    tertiaryColor: '#fef3c7',
    tertiaryTextColor: '#1e293b',
    // Background
    background: '#f8fafc',
    mainBkg: '#e0e7ff',
    // Node styling
    nodeBorder: '#6366f1',
    nodeTextColor: '#1e293b',
    // Cluster styling
    clusterBkg: '#f1f5f9',
    clusterBorder: '#94a3b8',
    // Title and labels
    titleColor: '#1e293b',
    edgeLabelBackground: '#f8fafc',
    // Text colors for all elements
    textColor: '#1e293b',
    actorTextColor: '#1e293b',
    signalTextColor: '#1e293b',
    labelTextColor: '#1e293b',
  },
});

export function MermaidDiagram({
  diagram,
  className,
  onNodeClick,
  selectedNode,
  nodeIdMapping,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Render the diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !diagram) return;

      try {
        setError(null);
        setIsRendered(false);

        // Clear previous content
        containerRef.current.innerHTML = '';

        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, diagram);

        // Insert the SVG
        containerRef.current.innerHTML = svg;

        // Apply CSS fixes to ensure visibility
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) {
          // Fix all text elements to be dark
          svgElement.querySelectorAll('text, tspan, .nodeLabel, .edgeLabel, .label').forEach((el) => {
            (el as HTMLElement).style.fill = '#1e293b';
            (el as HTMLElement).style.color = '#1e293b';
          });
          // Fix all paths/lines to be visible
          svgElement.querySelectorAll('path, line').forEach((el) => {
            const pathEl = el as SVGPathElement;
            if (pathEl.getAttribute('stroke') === '#fff' || pathEl.getAttribute('stroke') === 'white' || pathEl.getAttribute('stroke') === '#ffffff') {
              pathEl.setAttribute('stroke', '#64748b');
            }
            if (!pathEl.getAttribute('stroke') || pathEl.getAttribute('stroke') === 'none') {
              // Don't override fill-only paths
            }
          });
          // Fix markers (arrowheads)
          svgElement.querySelectorAll('marker path, marker polygon').forEach((el) => {
            (el as SVGElement).setAttribute('fill', '#64748b');
          });
        }

        // Add click handlers to nodes
        if (onNodeClick) {
          const nodes = containerRef.current.querySelectorAll('.node');
          nodes.forEach((node) => {
            const nodeElement = node as HTMLElement;
            nodeElement.style.cursor = 'pointer';

            // Extract node ID from the element - try multiple strategies
            let nodeId = '';

            // Strategy 1: Get from node ID attribute (e.g., "flowchart-orchestrator-123")
            if (node.id) {
              nodeId = node.id
                .replace(/^flowchart-/, '')
                .replace(/^subGraph\d+-/, '')
                .replace(/-\d+$/, '');
            }

            // Strategy 2: Get from data attributes
            if (!nodeId && node.getAttribute('data-id')) {
              nodeId = node.getAttribute('data-id') || '';
            }

            // Strategy 3: Get from the node label text
            if (!nodeId) {
              const labelEl = node.querySelector('.nodeLabel, text');
              if (labelEl) {
                const text = labelEl.textContent?.trim().toLowerCase().replace(/\s+/g, '_') || '';
                nodeId = text;
              }
            }

            // Clean up the node ID - convert to snake_case format used by agents
            nodeId = nodeId.toLowerCase().replace(/[\s-]+/g, '_');

            // Use the nodeIdMapping if provided to get the actual agent ID
            let mappedId = nodeId;
            if (nodeIdMapping) {
              // Try to find a matching key in the mapping
              const mappingKey = Object.keys(nodeIdMapping).find(key => {
                const normalizedKey = key.toLowerCase().replace(/[\s-]+/g, '_');
                return normalizedKey === nodeId ||
                       normalizedKey.includes(nodeId) ||
                       nodeId.includes(normalizedKey);
              });
              if (mappingKey) {
                mappedId = nodeIdMapping[mappingKey];
              }
            }

            nodeElement.addEventListener('click', () => {
              if (mappedId) {
                onNodeClick(mappedId);
              }
            });

            // Add hover effect
            nodeElement.addEventListener('mouseenter', () => {
              nodeElement.style.filter = 'brightness(0.95)';
            });
            nodeElement.addEventListener('mouseleave', () => {
              nodeElement.style.filter = selectedNode === nodeId ? 'brightness(0.9)' : 'none';
            });
          });
        }

        // Apply selection styling if there's a selected node
        if (selectedNode) {
          highlightNode(selectedNode);
        }

        setIsRendered(true);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [diagram, onNodeClick, selectedNode, nodeIdMapping]);

  // Update highlighting when selectedNode changes
  useEffect(() => {
    if (isRendered && containerRef.current) {
      // Reset all nodes
      const nodes = containerRef.current.querySelectorAll('.node');
      nodes.forEach((node) => {
        (node as HTMLElement).style.filter = 'none';
        (node as HTMLElement).style.opacity = selectedNode ? '0.5' : '1';
      });

      // Highlight selected node
      if (selectedNode) {
        highlightNode(selectedNode);
      }
    }
  }, [selectedNode, isRendered]);

  const highlightNode = (nodeId: string) => {
    if (!containerRef.current) return;

    const nodes = containerRef.current.querySelectorAll('.node');
    nodes.forEach((node) => {
      const id = node.id?.replace(/^flowchart-/, '').replace(/-\d+$/, '') || '';
      const nodeElement = node as HTMLElement;

      if (id === nodeId || id.includes(nodeId)) {
        nodeElement.style.filter = 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))';
        nodeElement.style.opacity = '1';
      }
    });
  };

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const container = containerRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();

    const scaleX = (containerRect.width - 40) / svgRect.width;
    const scaleY = (containerRect.height - 40) / svgRect.height;
    const newZoom = Math.min(scaleX, scaleY, 1.5);

    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.25, Math.min(3, prev + delta)));
  }, []);

  if (error) {
    return (
      <div className={cn('flex items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200', className)}>
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to render diagram</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative bg-gray-50 rounded-lg overflow-hidden', className)}>
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-7 w-7 p-0"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-gray-500 min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-7 w-7 p-0"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFitView}
          className="h-7 w-7 p-0"
          title="Fit to view"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetView}
          className="h-7 w-7 p-0"
          title="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Diagram container */}
      <div
        className={cn(
          'w-full h-full overflow-hidden',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          ref={containerRef}
          className="mermaid-container w-full h-full flex items-center justify-center p-4 transition-transform duration-100"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* Loading state */}
      {!isRendered && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-sm">Rendering diagram...</span>
          </div>
        </div>
      )}
    </div>
  );
}
