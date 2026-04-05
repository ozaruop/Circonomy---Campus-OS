import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options) => fetch(url as string, { ...options, cache: 'no-store' }),
      },
    }
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('gigs')
    .select('*, users(full_name, trust_score, avatar_url)')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, price, category, delivery_time, price_type } = body

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('gigs')
    .insert({
      user_id: userId,
      title,
      description,
      price: parseFloat(price),
      category,
      delivery_time,
      price_type: price_type ?? 'PROJECT',
      is_available: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}