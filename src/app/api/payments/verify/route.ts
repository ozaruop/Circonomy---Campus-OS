import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = await req.json()

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSig !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: order, error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', status: 'accepted', razorpay_payment_id })
    .eq('id', order_id)
    .eq('buyer_id', userId)
    .select('*, gigs(title)')
    .single()

  if (error || !order) return NextResponse.json({ error: 'Order update failed' }, { status: 500 })

  const gig = order.gigs as any
  await supabase.from('notifications').insert({
    user_id: order.seller_id,
    type: 'payment',
    title: 'Payment received!',
    body: 'Payment of Rs.' + Number(order.amount).toLocaleString() + ' for "' + (gig?.title ?? 'your gig') + '"',
    href: '/activity',
  })

  return NextResponse.json({ success: true })
}
