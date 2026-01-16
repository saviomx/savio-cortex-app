import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/leads/[id]/meetings
 * Get meetings for a lead
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = getCortexClient();

    // Determine if ID is internal (numeric) or external (string)
    const isNumeric = /^\d+$/.test(id);

    const meetingsResponse = await client.getMeetings(
      isNumeric ? { conversation_id: parseInt(id, 10) } : { external_id: id }
    );

    return NextResponse.json(meetingsResponse);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads/[id]/meetings
 * Update meeting attendance
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { showed, phone } = body;

    if (showed === undefined) {
      return NextResponse.json(
        { error: 'showed parameter is required (0 = not shown, 1 = shown)' },
        { status: 400 }
      );
    }

    const client = getCortexClient();

    // Determine if ID is internal (numeric) or external (string)
    const isNumeric = /^\d+$/.test(id);

    const updatedMeeting = await client.updateMeetingAttendance({
      ...(isNumeric ? { conversation_id: parseInt(id, 10) } : { external_id: id }),
      ...(phone && { phone }),
      showed: showed as number,
    });

    return NextResponse.json(updatedMeeting);
  } catch (error) {
    console.error('Error updating meeting attendance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update meeting attendance' },
      { status: 500 }
    );
  }
}
