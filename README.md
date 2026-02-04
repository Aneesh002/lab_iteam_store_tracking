# 🧪 Lab Inventory System

**100% FREE FOREVER** - Hospital Laboratory Inventory Management System

Built with Next.js 14, Supabase, and Tailwind CSS.

## ✨ Features

### For Technicians (Simple Interface)
- 📦 Withdraw reagents with step-by-step flow
- 📋 View personal transaction history
- 🔐 Secure login

### For Administrators (Full Interface)
- ➕ Add/Edit/Delete reagents
- 📊 Add stock to existing items
- 👥 User management
- 📈 Transaction reports with CSV export
- 🔔 Real-time notifications for low stock
- 📧 **Email alerts when stock is low**
- 🏷️ Manage categories and machines
- ⚙️ Set minimum stock levels

## 🆓 100% FREE Hosting

| Service | Purpose | Free Tier | Credit Card Required |
|---------|---------|-----------|---------------------|
| **Supabase** | Database + Auth | 500MB, 50K users | ❌ No |
| **Vercel** | Hosting | Unlimited | ❌ No |
| **Resend** | Emails | 100/day | ❌ No |

---

## 🚀 Deployment Guide

### Step 1: Create Supabase Project (5 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub
3. Click **"New Project"**
4. Enter:
   - **Name**: `lab-inventory`
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
5. Wait for setup (2 minutes)

### Step 2: Setup Database (3 minutes)

1. In Supabase Dashboard → **SQL Editor**
2. Click **"New Query"**
3. Copy ALL content from `supabase/migrations/001_complete_schema.sql`
4. Paste and click **"Run"**
5. You should see "Success" ✅

### Step 3: Get Your API Keys

1. In Supabase Dashboard → **Settings** → **API**
2. Copy these values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Deploy to Vercel (5 minutes)

1. Push this code to GitHub
2. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
3. Click **"Add New"** → **"Project"**
4. Import your GitHub repository
5. Add **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```
6. Click **Deploy**
7. Your app is live! 🎉

### Step 5: Create First Admin

1. Open your app URL
2. Click **"Create Account"** or go to `/signup`
3. Fill in your details
4. **First user automatically becomes Admin!**

### Step 6: Setup Email Notifications (Optional)

1. Go to [resend.com](https://resend.com) → Sign up (FREE)
2. Get your API key
3. In Vercel → Settings → Environment Variables:
   ```
   RESEND_API_KEY=re_xxxxx
   ```
4. Redeploy

---

## 📱 How to Use

### First Time Setup (Admin)
1. Create your admin account via signup
2. Go to **Categories** - already pre-loaded
3. Go to **Machines** - Zybio & Getein already added
4. Go to **Reagents** - 40+ reagents pre-loaded
5. Go to **Users** - Create technician accounts

### Daily Use - Technician
```
Login → Directly lands on Withdraw page
   ↓
Select Category (Biochemistry/Hematology/Lab Kits)
   ↓
Select Machine (if Biochemistry)
   ↓
Select Reagent
   ↓
Enter Quantity → Withdraw
```

### Daily Use - Admin
```
Login → Dashboard with stats & alerts
   ↓
Check low stock alerts
Add stock when needed
View reports
Manage users
```

---

## 📁 Project Structure

```
lab-inventory-supabase/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Login
│   │   ├── signup/               # Signup
│   │   ├── technician/           # Technician pages (simple)
│   │   │   ├── page.tsx          # Withdraw (their home)
│   │   │   └── history/          # Their history
│   │   ├── admin/                # Admin pages (full)
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── reagents/         # Manage reagents
│   │   │   ├── withdraw/         # Withdraw stock
│   │   │   ├── add-stock/        # Add stock
│   │   │   ├── categories/       # Manage categories
│   │   │   ├── machines/         # Manage machines
│   │   │   ├── users/            # Manage users
│   │   │   ├── reports/          # Transaction reports
│   │   │   ├── notifications/    # View notifications
│   │   │   └── settings/         # Profile settings
│   │   └── api/
│   │       ├── create-user/      # Create user API
│   │       └── notify/           # Low stock notification
│   └── lib/
│       ├── supabase.ts           # Client + types
│       ├── supabase-server.ts    # Server client
│       └── email.ts              # Email service
├── supabase/
│   └── migrations/
│       └── 001_complete_schema.sql
└── package.json
```

---

## 🗄️ Database Structure

### Categories
- Biochemistry (has_machines: true)
- Hematology (has_machines: false)
- Laboratory Kits/Reagents (has_machines: false)

### Machines (for Biochemistry only)
- Zybio
- Getein Biotech

### Pre-loaded Reagents
**Biochemistry - Zybio**: Glucose, Urea, Creatinine, Cholesterol, etc.
**Biochemistry - Getein**: HbA1c, TSH, Troponin, CRP, etc.
**Hematology**: Diluent, Lyse, Rinse, etc.
**Lab Kits**: Urine Strips, PT Reagent, Blood Collection Tubes, etc.

---

## 📧 Email Notification

When stock falls below minimum:
```
┌─────────────────────────────────────────┐
│  ⚠️ LOW STOCK ALERT                     │
│                                         │
│  Machine: Zybio                         │
│  Reagent: Glucose                       │
│                                         │
│  Current Stock: 2 bottles               │
│  Minimum Required: 5 bottles            │
│                                         │
│  ⚠️ You need to RESTOCK this item!      │
└─────────────────────────────────────────┘
```

---

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
# Edit with your Supabase keys

# Run dev server
npm run dev

# Open http://localhost:3000
```

---

## 🆘 Troubleshooting

### "Invalid API Key"
- Check environment variables in Vercel
- Make sure no extra spaces

### Can't Login
- Verify user exists in Supabase Auth
- Check if profile exists

### Emails Not Sending
- Verify RESEND_API_KEY is set
- Check Resend dashboard for logs

---

## ✅ Summary

- **Cost**: $0 forever
- **Credit Card**: Not required
- **Deploy Time**: ~15 minutes
- **Pre-loaded**: Categories, Machines, 40+ Reagents

**Made with ❤️ for Hospital Labs**
