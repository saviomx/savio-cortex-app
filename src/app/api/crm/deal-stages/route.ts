import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/crm/deal-stages
 * Get deal stages for mapping IDs to labels
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get('pipeline_id') || 'default';

    const client = getCortexClient();
    const response = await client.getDealStages(pipelineId);

    // Create a map of stage ID to label for easy lookup
    const stagesMap: Record<string, string> = {};
    if (response.stages) {
      response.stages.forEach((stage) => {
        stagesMap[stage.id] = stage.label;
      });
    }

    return NextResponse.json({
      pipeline_id: response.pipeline_id,
      stages: response.stages,
      stages_map: stagesMap,
    });
  } catch (error) {
    console.error('Error fetching deal stages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch deal stages' },
      { status: 500 }
    );
  }
}
