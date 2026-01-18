import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/crm/contact/full
 * Get full contact data with all HubSpot properties, marketing attribution,
 * and associated company IDs.
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
    const response = await client.getFullContact(phone);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching full contact:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch full contact' },
      { status: 500 }
    );
  }
}
