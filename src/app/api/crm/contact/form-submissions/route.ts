import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/crm/contact/form-submissions
 * Get all form submissions for a contact with field values and campaign attribution.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone parameter is required' },
        { status: 400 }
      );
    }

    const client = getCortexClient();
    const response = await client.getFormSubmissions(phone);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch form submissions' },
      { status: 500 }
    );
  }
}
