import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  const supabase = await createClient();
  const query = supabase
    .from('public_truck_locations')
    .select('*')
    .order('start_time');

  const { data, error } = date ? await query.eq('service_date', date) : await query;

  if (error) {
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}
