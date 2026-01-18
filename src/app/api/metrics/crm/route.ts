import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';
import type { CRMMetricsResponse } from '@/types/cortex';

/**
 * GET /api/metrics/crm
 * Get CRM funnel metrics data (both volume and conversion rates)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    const client = getCortexClient();

    // Fetch both endpoints in parallel for better performance
    const [volume, conversions] = await Promise.all([
      client.getCRMFunnelVolume(startDate, endDate),
      client.getCRMConversionRates(startDate, endDate),
    ]);

    const response: CRMMetricsResponse = {
      volume,
      conversions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching CRM metrics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch CRM metrics' },
      { status: 500 }
    );
  }
}
