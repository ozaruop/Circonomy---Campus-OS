import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// GET /api/messages?other_user_id=xxx  — fetch conversation
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const other = searchParams.get('other_user_id')
  if (!other) return NextResponse.json({ error: 'other_user_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:users!messages_sender_id_fkey(id, full_name, avatar_url)')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${other}),and(sender_id.eq.${other},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark received messages as read
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('sender_id', other)
    .eq('receiver_id', userId)
    .eq('is_read', false)

  return NextResponse.json(data)
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiver_id, content, listing_id, order_id, borrow_id } = await req.json()

  if (!receiver_id || !content?.trim()) {
    return NextResponse.json({ error: 'receiver_id and content required' }, { status: 400 })
  }
  if (receiver_id === userId) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: userId,
      receiver_id,
      content: content.trim(),
      listing_id: listing_id ?? null,
      order_id: order_id ?? null,
      borrow_id: borrow_id ?? null,
    })
    .select('*, sender:users!messages_sender_id_fkey(id, full_name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create notification for receiver
  const { data: sender } = await supabase.from('users').select('full_name').eq('id', userId).single()
  await supabase.from('notifications').insert({
    user_id: receiver_id,
    type: 'message',
    title: 'New message from ' + (sender?.full_name ?? 'someone'),
    body: content.trim().slice(0, 100),
    href: '/chat?user=' + userId,
  })

  return NextResponse.json(data)
}
