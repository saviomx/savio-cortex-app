'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Loader2, ChevronRight, Search, Send, ArrowLeft, Sparkles, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Template, TemplateParameterInfo } from '@/types/whatsapp';
import { getTemplateParameters, formatParametersForTemplate } from '@/lib/template-parser';

export interface ContactData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  contactData?: ContactData;
  onTemplateSent?: () => void;
};

type ViewState = 'list' | 'parameters';

/**
 * Auto-fill parameter values based on parameter name matching contact data fields
 */
function getAutoFillValue(paramName: string, contactData?: ContactData): string {
  if (!contactData) return '';

  const lowerName = paramName.toLowerCase();

  // Name variations
  if (lowerName.includes('name') && !lowerName.includes('last') && !lowerName.includes('company')) {
    if (lowerName.includes('first') || lowerName === 'name' || lowerName === 'customer_name' || lowerName === 'client_name') {
      return contactData.firstName || contactData.name || '';
    }
    if (lowerName.includes('last')) {
      return contactData.lastName || '';
    }
    if (lowerName.includes('full')) {
      return contactData.name || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim();
    }
    return contactData.firstName || contactData.name || '';
  }

  // Email
  if (lowerName.includes('email') || lowerName.includes('correo')) {
    return contactData.email || '';
  }

  // Phone
  if (lowerName.includes('phone') || lowerName.includes('telefono') || lowerName.includes('numero')) {
    return contactData.phone || '';
  }

  // Company
  if (lowerName.includes('company') || lowerName.includes('empresa') || lowerName.includes('organization')) {
    return contactData.company || '';
  }

  // Position/Title
  if (lowerName.includes('position') || lowerName.includes('title') || lowerName.includes('cargo') || lowerName.includes('puesto')) {
    return contactData.position || '';
  }

  return '';
}

export function TemplateSelectorDialog({ open, onOpenChange, phoneNumber, contactData, onTemplateSent }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // View state - 'list' or 'parameters'
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [parameterInfo, setParameterInfo] = useState<TemplateParameterInfo | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});

  const hasInitialized = useRef(false);

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.body_text?.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      // Reset state when dialog opens
      setSearchQuery('');
      setViewState('list');
      setSelectedTemplate(null);
      setParameterInfo(null);
      setParameterValues({});
      setError(null);
      hasInitialized.current = false;
    }
  }, [open]);

  // Auto-fill parameters when template is selected
  useEffect(() => {
    if (viewState === 'parameters' && parameterInfo && !hasInitialized.current) {
      const autoFilledValues: Record<string, string> = {};
      parameterInfo.parameters.forEach(param => {
        const autoValue = getAutoFillValue(param.name, contactData);
        if (autoValue) {
          autoFilledValues[param.name] = autoValue;
        }
      });
      setParameterValues(autoFilledValues);
      hasInitialized.current = true;
    }
  }, [viewState, parameterInfo, contactData]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch templates');
      }

      const approvedTemplates = (data.data || []).filter(
        (t: Template) => t.status === 'APPROVED'
      );
      setTemplates(approvedTemplates);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    const params = getTemplateParameters(template);

    if (params.parameters.length > 0) {
      // Template has parameters - show parameters view
      setSelectedTemplate(template);
      setParameterInfo(params);
      setParameterValues({});
      hasInitialized.current = false;
      setViewState('parameters');
    } else {
      // No parameters - send immediately
      handleSendTemplate(template);
    }
  };

  const handleBack = () => {
    setViewState('list');
    setSelectedTemplate(null);
    setParameterInfo(null);
    setParameterValues({});
    setError(null);
    hasInitialized.current = false;
  };

  const handleParameterChange = (paramName: string, value: string) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleSendTemplate = async (template: Template, params?: TemplateParameterInfo) => {
    setSending(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        to: phoneNumber,
        templateName: template.name,
        languageCode: template.language,
      };

      if (params && params.parameters.length > 0) {
        body.parameters = formatParametersForTemplate(params, parameterValues);
        body.parameterInfo = params;
      }

      const response = await fetch('/api/templates/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send template');
      }

      onOpenChange(false);
      onTemplateSent?.();
    } catch (err) {
      console.error('Error sending template:', err);
      setError(err instanceof Error ? err.message : 'Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const handleSendWithParameters = () => {
    if (selectedTemplate && parameterInfo) {
      handleSendTemplate(selectedTemplate, parameterInfo);
    }
  };

  const allParametersFilled = parameterInfo?.parameters.every(
    param => parameterValues[param.name]?.trim()
  ) ?? true;

  // Generate preview text with filled parameters
  const previewText = useMemo(() => {
    if (!selectedTemplate) return '';
    let text = selectedTemplate.body_text || '';
    parameterInfo?.parameters.forEach(param => {
      const value = parameterValues[param.name] || `{{${param.name}}}`;
      const namedRegex = new RegExp(`\\{\\{${param.name}\\}\\}`, 'gi');
      text = text.replace(namedRegex, value);
      const match = param.name.match(/param_(\d+)/i);
      if (match) {
        const positionalRegex = new RegExp(`\\{\\{${match[1]}\\}\\}`, 'g');
        text = text.replace(positionalRegex, value);
      }
    });
    return text;
  }, [selectedTemplate, parameterInfo, parameterValues]);

  const headerPreviewText = useMemo(() => {
    if (!selectedTemplate?.header_text) return '';
    let text = selectedTemplate.header_text;
    parameterInfo?.parameters.forEach(param => {
      if (param.component === 'HEADER') {
        const value = parameterValues[param.name] || `{{${param.name}}}`;
        const namedRegex = new RegExp(`\\{\\{${param.name}\\}\\}`, 'gi');
        text = text.replace(namedRegex, value);
      }
    });
    return text;
  }, [selectedTemplate, parameterInfo, parameterValues]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MARKETING':
        return 'bg-blue-100 text-blue-800';
      case 'UTILITY':
        return 'bg-green-100 text-green-800';
      case 'AUTHENTICATION':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatParameterName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .replace(/Param (\d+)/, 'Parameter $1')
      .replace(/Button (\d+) Parameter (\d+)/, 'Button $1 URL Parameter $2');
  };

  const autoFilledCount = parameterInfo?.parameters.filter(
    param => getAutoFillValue(param.name, contactData)
  ).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col" style={{ maxWidth: '700px', width: '95vw' }}>
        {/* Header */}
        <DialogHeader className="flex-shrink-0">
          {viewState === 'list' ? (
            <>
              <DialogTitle>Send template message</DialogTitle>
              <DialogDescription>
                Select a template to send to {phoneNumber}
              </DialogDescription>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <DialogTitle className="truncate">
                  {selectedTemplate?.name.replace(/_/g, ' ')}
                </DialogTitle>
                <DialogDescription>
                  Fill in the parameters
                  {autoFilledCount > 0 && (
                    <span className="flex items-center gap-1 text-green-600 mt-0.5">
                      <Sparkles className="w-3 h-3" />
                      {autoFilledCount} auto-filled
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          )}
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {viewState === 'list' ? (
            // Template List View
            <>
              {/* Search Bar */}
              <div className="relative flex-shrink-0 mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {/* Template count */}
              {!loading && templates.length > 0 && (
                <div className="text-xs text-gray-500 mb-2 flex-shrink-0">
                  {searchQuery ? (
                    <span>{filteredTemplates.length} of {templates.length} active templates</span>
                  ) : (
                    <span>{templates.length} active templates</span>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00a884]" />
                </div>
              ) : templates.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No approved templates found
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No templates match your search
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto">
                  <div className="space-y-2 pr-2">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate text-sm">
                              {template.name.replace(/_/g, ' ')}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={`text-xs ${getCategoryColor(template.category)}`}>
                                {template.category}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {template.language}
                              </span>
                            </div>
                            {template.body_text && (
                              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                                {template.body_text}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-shrink-0 h-8 w-8 p-0"
                            disabled={sending}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Parameters View
            <>
              {/* WhatsApp Preview */}
              <div className="bg-[#efeae2] rounded-lg p-3 border border-[#d1d7db] flex-shrink-0 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-[#667781]" />
                  <span className="text-xs font-medium text-[#667781]">Preview</span>
                </div>
                <div className="bg-[#d9fdd3] rounded-lg shadow-sm max-w-[280px] overflow-hidden">
                  {headerPreviewText && (
                    <p className="text-sm font-semibold text-[#111b21] px-3 pt-2">
                      {headerPreviewText}
                    </p>
                  )}
                  <p className="text-sm text-[#111b21] whitespace-pre-wrap px-3 py-2 line-clamp-4">
                    {previewText}
                  </p>
                  {selectedTemplate?.footer_text && (
                    <p className="text-xs text-[#667781] px-3 pb-2">
                      {selectedTemplate.footer_text}
                    </p>
                  )}
                </div>
              </div>

              {/* Parameter Inputs */}
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="space-y-3 pr-2">
                  {parameterInfo?.parameters.map((param) => {
                    const isAutoFilled = Boolean(getAutoFillValue(param.name, contactData));
                    return (
                      <div key={param.name} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={param.name} className="text-sm text-gray-700">
                            {formatParameterName(param.name)}
                          </Label>
                          {isAutoFilled && parameterValues[param.name] && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                        </div>
                        <Input
                          id={param.name}
                          value={parameterValues[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          placeholder={param.example || `Enter ${formatParameterName(param.name)}`}
                          className={`h-9 ${isAutoFilled && parameterValues[param.name] ? 'border-green-300' : ''}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <Separator className="my-2" />
        <div className="flex justify-end gap-2 flex-shrink-0">
          {viewState === 'list' ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          ) : (
            <Button
              onClick={handleSendWithParameters}
              disabled={!allParametersFilled || sending}
              className="bg-[#00a884] hover:bg-[#008f6f]"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
