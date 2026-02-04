import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendEmail, getLowStockEmailHTML } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reagent } = body

    if (!reagent) {
      return NextResponse.json({ error: 'Missing reagent data' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get all active admin users
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (!admins || admins.length === 0) {
      return NextResponse.json({ message: 'No admins to notify' })
    }

    const categoryName = reagent.categories?.name || 'Unknown'
    const machineName = reagent.machines?.name || null

    // Create notification and send email for each admin
    for (const admin of admins) {
      // Check if notification already exists (unread)
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', admin.id)
        .eq('reagent_id', reagent.id)
        .eq('type', 'low_stock')
        .eq('is_read', false)
        .single()

      if (existing) continue // Skip if unread notification exists

      // Create notification
      await supabase.from('notifications').insert({
        user_id: admin.id,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${reagent.name} (${categoryName}${machineName ? ' - ' + machineName : ''}) is running low. Current: ${reagent.current_stock} ${reagent.unit}, Minimum: ${reagent.minimum_stock}`,
        reagent_id: reagent.id,
      })

      // Send email
      const emailSent = await sendEmail({
        to: admin.email,
        subject: `⚠️ Low Stock Alert: ${reagent.name}`,
        html: getLowStockEmailHTML({
          reagentName: reagent.name,
          categoryName,
          machineName,
          currentStock: reagent.current_stock,
          minimumStock: reagent.minimum_stock,
          unit: reagent.unit,
        }),
      })

      // Update notification with email status
      if (emailSent) {
        await supabase
          .from('notifications')
          .update({ email_sent: true })
          .eq('user_id', admin.id)
          .eq('reagent_id', reagent.id)
          .eq('type', 'low_stock')
          .eq('is_read', false)
      }
    }

    return NextResponse.json({ success: true, notified: admins.length })
  } catch (error: any) {
    console.error('Notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
