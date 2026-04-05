import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import Razorpay from 'razorpay'

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
}

// POST /api/payments — create a Razorpay order
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id } = await req.json()
  if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, amount, buyer_id, payment_status')
    .eq('id', order_id)
    .single()

  if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.buyer_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (order.payment_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  const razorpay = getRazorpay()
  const rzpOrder = await razorpay.orders.create({
    amount: Math.round(Number(order.amount) * 100), // paise
    currency: 'INR',
    receipt: `order_${order.id}`,
    notes: { campus_order_id: order.id },
  })

  // Store razorpay_order_id
  await supabase.from('orders').update({ razorpay_order_id: rzpOrder.id }).eq('id', order.id)

  return NextResponse.json({
    razorpay_order_id: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    key_id: process.env.RAZORPAY_KEY_ID,
  })
}
