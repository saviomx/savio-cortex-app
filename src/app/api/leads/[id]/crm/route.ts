import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/leads/[id]/crm
 * Get CRM (HubSpot) data for a lead - deal, owner, contact, and links
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = getCortexClient();

    // Determine if ID is internal (numeric) or external (string)
    const isNumeric = /^\d+$/.test(id);
    const idParams = isNumeric ? { internal_id: parseInt(id, 10) } : { external_id: id };

    // Fetch CRM data in parallel
    const [dealResponse, ownerResponse, linksResponse] = await Promise.all([
      client.getDeal(idParams).catch(() => ({ deal: null, has_deal: false })),
      client.getAssignedOwner(idParams).catch(() => ({ owner: null })),
      client.getHubSpotLinks(idParams).catch(() => ({ phone: null })),
    ]);

    // Fetch contact if we have a phone number
    let contactResponse: { contact: { id: string } | null; has_contact: boolean } = { contact: null, has_contact: false };
    const phone = (linksResponse as { phone?: string }).phone;
    if (phone) {
      contactResponse = await client.getHubSpotContact(phone).catch(() => ({ contact: null, has_contact: false }));
    }

    return NextResponse.json({
      deal: dealResponse.deal,
      has_deal: dealResponse.has_deal,
      owner: ownerResponse.owner,
      contact: contactResponse.contact,
      has_contact: contactResponse.has_contact,
      links: linksResponse,
    });
  } catch (error) {
    console.error('Error fetching CRM data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch CRM data' },
      { status: 500 }
    );
  }
}
