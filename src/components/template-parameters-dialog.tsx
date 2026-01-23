'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Send, Loader2, ArrowLeft, Sparkles, Eye } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Template, TemplateParameterInfo } from '@/types/whatsapp';
import { formatParametersForTemplate } from '@/lib/template-parser';
import type { ContactData } from './template-selector-dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template;
  parameterInfo: TemplateParameterInfo;
  phoneNumber: string;
  contactData?: ContactData;
  onBack: () => void;
  onTemplateSent?: () => void;
};

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
    // Default: use first name or full name
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

export function TemplateParametersDialog({
  open,
  onOpenChange,
  template,
  parameterInfo,
  phoneNumber,
  contactData,
  onBack,
  onTemplateSent,
}: Props) {
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const hasInitialized = useRef(false);
  const lastTemplateId = useRef<string | null>(null);

  // Auto-fill parameters only once when dialog opens for a new template
  useEffect(() => {
    // Only initialize when dialog opens AND it's a new template or first time
    if (open && parameterInfo.parameters.length > 0) {
      const currentTemplateId = template.id;

      // Check if this is a new template or first initialization
      if (!hasInitialized.current || lastTemplateId.current !== currentTemplateId) {
        const autoFilledValues: Record<string, string> = {};
        parameterInfo.parameters.forEach(param => {
          const autoValue = getAutoFillValue(param.name, contactData);
          if (autoValue) {
            autoFilledValues[param.name] = autoValue;
          }
        });
        setParameterValues(autoFilledValues);
        hasInitialized.current = true;
        lastTemplateId.current = currentTemplateId;
      }
    }

    // Reset when dialog closes
    if (!open) {
      hasInitialized.current = false;
      lastTemplateId.current = null;
    }
  }, [open, template.id, parameterInfo.parameters, contactData]);

  const handleParameterChange = (paramName: string, value: string) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const allParametersFilled = parameterInfo.parameters.every(
    param => parameterValues[param.name]?.trim()
  );

  // Generate preview text with filled parameters
  const previewText = useMemo(() => {
    let text = template.body_text || '';
    parameterInfo.parameters.forEach(param => {
      const value = parameterValues[param.name] || `{{${param.name}}}`;
      // Replace both named {{param_name}} and positional {{1}} formats
      const namedRegex = new RegExp(`\\{\\{${param.name}\\}\\}`, 'gi');
      text = text.replace(namedRegex, value);
      // For positional parameters like param_1, also replace {{1}}
      const match = param.name.match(/param_(\d+)/i);
      if (match) {
        const positionalRegex = new RegExp(`\\{\\{${match[1]}\\}\\}`, 'g');
        text = text.replace(positionalRegex, value);
      }
    });
    return text;
  }, [template.body_text, parameterInfo.parameters, parameterValues]);

  const headerPreviewText = useMemo(() => {
    if (!template.header_text) return '';
    let text = template.header_text;
    parameterInfo.parameters.forEach(param => {
      if (param.component === 'HEADER') {
        const value = parameterValues[param.name] || `{{${param.name}}}`;
        const namedRegex = new RegExp(`\\{\\{${param.name}\\}\\}`, 'gi');
        text = text.replace(namedRegex, value);
      }
    });
    return text;
  }, [template.header_text, parameterInfo.parameters, parameterValues]);

  const handleSend = async () => {
    if (!allParametersFilled) {
      setError('Please fill in all parameters');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const formattedParameters = formatParametersForTemplate(parameterInfo, parameterValues);

      const response = await fetch('/api/templates/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          templateName: template.name,
          languageCode: template.language,
          parameters: formattedParameters,
          parameterInfo: parameterInfo,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send template');
      }

      onOpenChange(false);
      setParameterValues({});
      onTemplateSent?.();
    } catch (err) {
      console.error('Error sending template:', err);
      setError(err instanceof Error ? err.message : 'Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const formatParameterName = (name: string): string => {
    // Convert snake_case or param_1 to readable format
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .replace(/Param (\d+)/, 'Parameter $1')
      .replace(/Button (\d+) Parameter (\d+)/, 'Button $1 URL Parameter $2');
  };

  const autoFilledCount = parameterInfo.parameters.filter(
    param => getAutoFillValue(param.name, contactData)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                {template.name.replace(/_/g, ' ')}
              </DialogTitle>
              <DialogDescription>
                Fill in the parameters for this template
                {autoFilledCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600 mt-1">
                    <Sparkles className="w-3 h-3" />
                    {autoFilledCount} field{autoFilledCount > 1 ? 's' : ''} auto-filled from contact
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {/* WhatsApp-style Message Preview */}
        {showPreview && (
          <div className="bg-[#efeae2] rounded-lg p-3 border border-[#d1d7db]">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-[#667781]" />
              <span className="text-xs font-medium text-[#667781]">Preview</span>
            </div>
            {/* WhatsApp message bubble */}
            <div className="bg-[#d9fdd3] rounded-lg shadow-sm max-w-[320px] overflow-hidden">
              {/* Media Header */}
              {template.header_type && ['VIDEO', 'IMAGE', 'DOCUMENT'].includes(template.header_type) && (
                <div className="relative bg-[#c8e6c3]">
                  {template.header_media_url ? (
                    template.header_type === 'VIDEO' ? (
                      <video
                        src={template.header_media_url}
                        className="w-full h-40 object-cover"
                        controls={false}
                        muted
                      />
                    ) : template.header_type === 'IMAGE' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={template.header_media_url}
                        alt="Template header"
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-10 h-10 mx-auto text-[#667781]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/>
                          </svg>
                          <span className="text-xs text-[#667781] mt-1 block">Document</span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-[#c8e6c3]">
                      <div className="text-center text-[#667781]">
                        {template.header_type === 'VIDEO' && (
                          <>
                            <svg className="w-10 h-10 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>
                            </svg>
                            <span className="text-xs mt-1 block">Video</span>
                          </>
                        )}
                        {template.header_type === 'IMAGE' && (
                          <>
                            <svg className="w-10 h-10 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                            </svg>
                            <span className="text-xs mt-1 block">Image</span>
                          </>
                        )}
                        {template.header_type === 'DOCUMENT' && (
                          <>
                            <svg className="w-10 h-10 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                            </svg>
                            <span className="text-xs mt-1 block">Document</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Text Header */}
              {headerPreviewText && (
                <p className="text-sm font-semibold text-[#111b21] px-3 pt-2">
                  {headerPreviewText}
                </p>
              )}
              {/* Body */}
              <p className="text-sm text-[#111b21] whitespace-pre-wrap px-3 py-2">
                {previewText}
              </p>
              {/* Footer */}
              {template.footer_text && (
                <p className="text-xs text-[#667781] px-3 pb-2">
                  {template.footer_text}
                </p>
              )}
              {/* Buttons */}
              {template.buttons_json?.buttons && template.buttons_json.buttons.length > 0 && (
                <div className="border-t border-[#c8e6c3] divide-y divide-[#c8e6c3]">
                  {template.buttons_json.buttons.map((btn, idx) => (
                    <div key={idx} className="px-3 py-2 text-center text-sm text-[#00a884] font-medium">
                      {btn.type === 'URL' && '🔗 '}
                      {btn.type === 'PHONE_NUMBER' && '📞 '}
                      {btn.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-4">
            {parameterInfo.parameters.map((param) => {
              const isAutoFilled = Boolean(getAutoFillValue(param.name, contactData));
              return (
                <div key={param.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={param.name} className="text-[#111b21]">
                      {formatParameterName(param.name)}
                    </Label>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-[#f0f2f5] text-[#667781]"
                    >
                      {param.component}
                    </Badge>
                    {isAutoFilled && parameterValues[param.name] && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-green-100 text-green-700"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Auto-filled
                      </Badge>
                    )}
                  </div>
                  <Input
                    id={param.name}
                    value={parameterValues[param.name] || ''}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    placeholder={param.example || `Enter ${formatParameterName(param.name)}`}
                    className={`bg-white border-[#d1d7db] focus-visible:ring-[#00a884] ${
                      isAutoFilled && parameterValues[param.name] ? 'border-green-300' : ''
                    }`}
                  />
                  {param.example && !parameterValues[param.name] && (
                    <p className="text-xs text-[#667781]">
                      Example: {param.example}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={handleSend}
            disabled={!allParametersFilled || sending}
            className="bg-[#00a884] hover:bg-[#008f6f]"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Send template
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
