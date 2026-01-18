import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/crm/contact/activity
 * Get contact activity timeline (notes, calls, emails, meetings, tasks).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const limit = searchParams.get('limit');
    const engagementTypes = searchParams.get('engagement_types');

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone parameter is required' },
        { status: 400 }
      );
    }

    const client = getCortexClient();
    const response = await client.getContactActivity({
      phone,
      limit: limit ? parseInt(limit, 10) : undefined,
      engagement_types: engagementTypes || undefined,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching contact activity:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch contact activity' },
      { status: 500 }
    );
  }
}
