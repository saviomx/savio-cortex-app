import { NextResponse } from 'next/server';

const CORTEX_API_URL = process.env.CORTEX_API_URL;
const CORTEX_API_KEY = process.env.CORTEX_API_KEY;

/**
 * POST /api/templates/send
 * Send a template message to a WhatsApp contact
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, templateName, languageCode, parameters, parameterInfo } = body;

    if (!to || !templateName) {
      return NextResponse.json(
        { error: 'Missing required fields: to, templateName' },
        { status: 400 }
      );
    }

    // Build the request payload for the backend
    const payload: Record<string, unknown> = {
      phone_number: to,
      template_name: templateName,
    };

    if (languageCode) {
      payload.language_code = languageCode;
    }

    // Handle parameters - convert from frontend format to backend format
    if (parameters && Object.keys(parameters).length > 0) {
      payload.parameters = parameters;
    }

    const response = await fetch(`${CORTEX_API_URL}/templates/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CORTEX_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to send template' }));
      return NextResponse.json(
        { error: error.detail || error.error || 'Failed to send template' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send template' },
      { status: 500 }
    );
  }
}
