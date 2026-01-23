export type TemplateButton = {
  type: string;
  text?: string;
  url?: string;
  phone_number?: string;
  example?: string[];
};

export type TemplateComponentExample = {
  headerText?: string[];
  headerHandle?: string[];
  bodyText?: string[][];
  bodyTextNamedParams?: Array<{
    paramName: string;
    example: string;
  }>;
  headerTextNamedParams?: Array<{
    paramName: string;
    example: string;
  }>;
};

export type TemplateComponent = {
  type: string;
  format?: string;
  text?: string;
  example?: TemplateComponentExample;
  buttons?: TemplateButton[];
};

export type Template = {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  components?: TemplateComponent[];
  // Fields returned by our backend
  body_text?: string;
  header_type?: string;
  header_text?: string;
  header_media_url?: string;
  footer_text?: string;
  buttons_json?: { buttons: TemplateButton[] };
  parameter_format?: string;
  parameters_json?: Record<string, unknown>;
  rejection_reason?: string;
  meta_template_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ParameterFormat = 'POSITIONAL' | 'NAMED';

export type TemplateParameterInfo = {
  format: ParameterFormat;
  parameters: Array<{
    name: string;
    example?: string;
    component: 'HEADER' | 'BODY' | 'BUTTON';
    buttonIndex?: number; // For button parameters, which button (0-indexed)
  }>;
};

export type TemplateParameters = Record<string, string>;
