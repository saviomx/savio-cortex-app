import type {
  Template,
  TemplateComponent,
  TemplateParameterInfo,
  ParameterFormat,
} from '@/types/whatsapp';

/**
 * Extract parameter placeholders from text (e.g., {{name}}, {{1}})
 */
function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  // Remove duplicates while preserving order
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
}

/**
 * Extracts parameter information from a WhatsApp template
 * Supports both Meta components format and our database format
 */
export function getTemplateParameters(template: Template): TemplateParameterInfo {
  const parameters: TemplateParameterInfo['parameters'] = [];
  let format: ParameterFormat = 'POSITIONAL';

  // First try: Use Meta components format if available
  if (template.components && template.components.length > 0) {
    for (const component of template.components) {
      if (component.type === 'HEADER' && component.format === 'TEXT') {
        const headerParams = extractHeaderParameters(component);
        if (headerParams.length > 0) {
          parameters.push(...headerParams.map(p => ({ ...p, component: 'HEADER' as const })));
          if (component.example?.headerTextNamedParams) {
            format = 'NAMED';
          }
        }
      }

      if (component.type === 'BODY') {
        const bodyParams = extractBodyParameters(component);
        if (bodyParams.length > 0) {
          parameters.push(...bodyParams.map(p => ({ ...p, component: 'BODY' as const })));
          if (component.example?.bodyTextNamedParams) {
            format = 'NAMED';
          }
        }
      }

      if (component.type === 'BUTTONS') {
        const buttonParams = extractButtonParameters(component);
        if (buttonParams.length > 0) {
          parameters.push(...buttonParams.map(p => ({ ...p, component: 'BUTTON' as const })));
        }
      }
    }
    return { format, parameters };
  }

  // Fallback: Parse from our database format (body_text, header_text, parameters_json)

  // Check parameter format from database
  if (template.parameter_format === 'NAMED') {
    format = 'NAMED';
  }

  // Get examples from parameters_json if available
  const storedParams = template.parameters_json as {
    body_parameters?: Array<{ param_name: string; example: string }>;
    header_parameters?: Array<{ param_name: string; example: string }>;
    format?: string;
  } | undefined;

  // Build example lookup
  const exampleLookup: Record<string, string> = {};
  if (storedParams?.body_parameters) {
    storedParams.body_parameters.forEach(p => {
      exampleLookup[p.param_name] = p.example;
    });
  }
  if (storedParams?.header_parameters) {
    storedParams.header_parameters.forEach(p => {
      exampleLookup[p.param_name] = p.example;
    });
  }

  // Extract from header_text
  if (template.header_text) {
    const headerPlaceholders = extractPlaceholders(template.header_text);
    headerPlaceholders.forEach(name => {
      // Check if it's positional (numeric) or named
      if (/^\d+$/.test(name)) {
        format = 'POSITIONAL';
      } else {
        format = 'NAMED';
      }
      parameters.push({
        name,
        example: exampleLookup[name],
        component: 'HEADER',
      });
    });
  }

  // Extract from body_text
  if (template.body_text) {
    const bodyPlaceholders = extractPlaceholders(template.body_text);
    bodyPlaceholders.forEach(name => {
      // Check if it's positional (numeric) or named
      if (/^\d+$/.test(name)) {
        format = 'POSITIONAL';
      } else {
        format = 'NAMED';
      }
      parameters.push({
        name,
        example: exampleLookup[name],
        component: 'BODY',
      });
    });
  }

  // Extract button parameters from buttons_json
  if (template.buttons_json?.buttons) {
    template.buttons_json.buttons.forEach((button, buttonIndex) => {
      if (button.example && button.example.length > 0) {
        button.example.forEach((exampleValue, paramIndex) => {
          parameters.push({
            name: `button_${buttonIndex}_param_${paramIndex + 1}`,
            example: exampleValue,
            component: 'BUTTON',
            buttonIndex,
          });
        });
      }
      // Also check for URL parameters like {{1}} in button URLs
      if (button.url) {
        const urlPlaceholders = extractPlaceholders(button.url);
        urlPlaceholders.forEach((name, paramIndex) => {
          parameters.push({
            name: `button_${buttonIndex}_url_${name}`,
            example: button.example?.[paramIndex],
            component: 'BUTTON',
            buttonIndex,
          });
        });
      }
    });
  }

  return { format, parameters };
}

/**
 * Extracts parameters from HEADER component
 */
function extractHeaderParameters(component: TemplateComponent): Array<{ name: string; example?: string }> {
  const params: Array<{ name: string; example?: string }> = [];

  if (!component.example) {
    return params;
  }

  // Named parameters
  if (component.example.headerTextNamedParams) {
    return component.example.headerTextNamedParams.map(p => ({
      name: p.paramName,
      example: p.example,
    }));
  }

  // Positional parameters
  if (component.example.headerText) {
    return component.example.headerText.map((example, index) => ({
      name: `header_param_${index + 1}`,
      example,
    }));
  }

  return params;
}

/**
 * Extracts parameters from BODY component
 */
function extractBodyParameters(component: TemplateComponent): Array<{ name: string; example?: string }> {
  const params: Array<{ name: string; example?: string }> = [];

  if (!component.example) {
    return params;
  }

  // Named parameters
  if (component.example.bodyTextNamedParams) {
    return component.example.bodyTextNamedParams.map(p => ({
      name: p.paramName,
      example: p.example,
    }));
  }

  // Positional parameters (bodyText is 2D array)
  if (component.example.bodyText && component.example.bodyText.length > 0) {
    const firstExample = component.example.bodyText[0];
    return firstExample.map((example, index) => ({
      name: `body_param_${index + 1}`,
      example,
    }));
  }

  return params;
}

/**
 * Extracts parameters from BUTTONS component
 */
function extractButtonParameters(component: TemplateComponent): Array<{ name: string; example?: string; buttonIndex: number }> {
  const params: Array<{ name: string; example?: string; buttonIndex: number }> = [];

  if (!component.buttons) {
    return params;
  }

  // Button parameters are always positional
  component.buttons.forEach((button, buttonIndex) => {
    if (button.example && button.example.length > 0) {
      button.example.forEach((exampleValue, paramIndex) => {
        params.push({
          name: `button_${buttonIndex}_param_${paramIndex + 1}`,
          example: exampleValue,
          buttonIndex,
        });
      });
    }
  });

  return params;
}

/**
 * Converts user input to the appropriate format for the template
 * Always returns a dict - backend will handle conversion based on parameter_format
 */
export function formatParametersForTemplate(
  parameterInfo: TemplateParameterInfo,
  values: Record<string, string>
): Record<string, string> {
  // Always return as dict - backend handles the conversion
  return values;
}

/**
 * Checks if a template requires parameters
 */
export function templateHasParameters(template: Template): boolean {
  const paramInfo = getTemplateParameters(template);
  return paramInfo.parameters.length > 0;
}
