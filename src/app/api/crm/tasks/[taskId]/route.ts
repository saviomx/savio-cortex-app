import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/crm/tasks/[taskId]
 * Get a single task by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const client = getCortexClient();
    const response = await client.getTask(taskId);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/crm/tasks/[taskId]
 * Update a task by ID.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();

    const client = getCortexClient();
    const response = await client.updateTask(taskId, {
      title: body.title,
      due_date: body.due_date,
      status: body.status,
      task_type: body.task_type,
      priority: body.priority,
      owner_id: body.owner_id,
      notes: body.notes,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/tasks/[taskId]
 * Delete a task by ID.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const client = getCortexClient();
    const response = await client.deleteTask(taskId);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete task' },
      { status: 500 }
    );
  }
}
