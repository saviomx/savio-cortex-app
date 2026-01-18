import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/crm/tasks
 * Get all tasks for a contact.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const externalId = searchParams.get('external_id');
    const internalId = searchParams.get('internal_id');

    if (!phone && !externalId && !internalId) {
      return NextResponse.json(
        { error: 'At least one identifier (phone, external_id, or internal_id) is required' },
        { status: 400 }
      );
    }

    const client = getCortexClient();
    const response = await client.getTasks({
      phone: phone || undefined,
      external_id: externalId || undefined,
      internal_id: internalId ? parseInt(internalId, 10) : undefined,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/tasks
 * Create a new task for a contact.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const externalId = searchParams.get('external_id');
    const internalId = searchParams.get('internal_id');

    if (!phone && !externalId && !internalId) {
      return NextResponse.json(
        { error: 'At least one identifier (phone, external_id, or internal_id) is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.title || !body.due_date) {
      return NextResponse.json(
        { error: 'title and due_date are required' },
        { status: 400 }
      );
    }

    const client = getCortexClient();
    const response = await client.createTask(
      {
        phone: phone || undefined,
        external_id: externalId || undefined,
        internal_id: internalId ? parseInt(internalId, 10) : undefined,
      },
      {
        title: body.title,
        due_date: body.due_date,
        task_type: body.task_type,
        notes: body.notes,
      }
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    );
  }
}
