import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  if (!resend) {
    console.log('Email not configured. Would send to:', to)
    return false
  }

  try {
    await resend.emails.send({
      from: 'Lab Inventory <onboarding@resend.dev>',
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error('Email error:', error)
    return false
  }
}

export function getLowStockEmailHTML(data: {
  reagentName: string
  machineName?: string
  categoryName: string
  currentStock: number
  minimumStock: number
  unit: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .alert-box { background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; background: #f9f9f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ LOW STOCK ALERT</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <h2 style="margin: 0 0 10px 0; color: #dc2626;">${data.reagentName}</h2>
        <div class="info-row">
          <span>Category:</span>
          <strong>${data.categoryName}</strong>
        </div>
        ${data.machineName ? `
        <div class="info-row">
          <span>Machine:</span>
          <strong>${data.machineName}</strong>
        </div>
        ` : ''}
        <div class="info-row">
          <span>Current Stock:</span>
          <strong style="color: #dc2626;">${data.currentStock} ${data.unit}</strong>
        </div>
        <div class="info-row">
          <span>Minimum Required:</span>
          <strong>${data.minimumStock} ${data.unit}</strong>
        </div>
      </div>
      
      <div class="warning">
        <strong>⚠️ ACTION REQUIRED</strong><br>
        You need to RESTOCK this item immediately!
      </div>
    </div>
    <div class="footer">
      Lab Inventory Management System<br>
      This is an automated notification.
    </div>
  </div>
</body>
</html>
  `
}
