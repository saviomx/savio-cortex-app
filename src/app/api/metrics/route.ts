import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/metrics
 * Get metrics data for the funnel page
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const type = searchParams.get('type') || 'all';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    const client = getCortexClient();

    // Fetch different metrics based on type
    if (type === 'funnel') {
      const data = await client.getFunnelMetrics(startDate, endDate);
      return NextResponse.json(data);
    }

    if (type === 'conversion-rates') {
      const data = await client.getConversionRates(startDate, endDate);
      return NextResponse.json(data);
    }

    if (type === 'conversion-summary') {
      const data = await client.getConversionSummary(startDate, endDate);
      return NextResponse.json(data);
    }

    if (type === 'conversations-count') {
      const data = await client.getConversationsCount(startDate, endDate);
      return NextResponse.json(data);
    }

    if (type === 'messages-by-role') {
      const data = await client.getMessagesByRole(startDate, endDate);
      return NextResponse.json(data);
    }

    if (type === 'total-messages') {
      const data = await client.getTotalMessages(startDate, endDate);
      return NextResponse.json(data);
    }

    if (type === 'response-time') {
      const data = await client.getResponseTime(startDate, endDate);
      return NextResponse.json(data);
    }

    if (type === 'conversions-daily') {
      const data = await client.getConversionsDaily(startDate, endDate);
      return NextResponse.json(data);
    }

    // Default: fetch all metrics
    const [
      funnel,
      conversionRates,
      conversionSummary,
      conversationsCount,
      messagesByRole,
      totalMessages,
      responseTime,
      conversionsDaily,
    ] = await Promise.all([
      client.getFunnelMetrics(startDate, endDate),
      client.getConversionRates(startDate, endDate),
      client.getConversionSummary(startDate, endDate),
      client.getConversationsCount(startDate, endDate),
      client.getMessagesByRole(startDate, endDate),
      client.getTotalMessages(startDate, endDate),
      client.getResponseTime(startDate, endDate),
      client.getConversionsDaily(startDate, endDate),
    ]);

    return NextResponse.json({
      funnel,
      conversionRates,
      conversionSummary,
      conversationsCount,
      messagesByRole,
      totalMessages,
      responseTime,
      conversionsDaily,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
