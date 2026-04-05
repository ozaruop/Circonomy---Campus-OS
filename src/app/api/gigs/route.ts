import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('gigs')
    .select('*, users(id, full_name, trust_score, avatar_url)')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, category, price, price_type, delivery_time, images } = await req.json()
  if (!title || !category || !price) {
    return NextResponse.json({ error: 'title, category and price are required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('gigs')
    .insert({
      user_id: userId,
      title,
      description: description ?? '',
      category,
      price: parseFloat(price),
      price_type: price_type ?? 'PROJECT',
      delivery_time: delivery_time ?? '3 days',
      images: images ?? [],
      is_available: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
