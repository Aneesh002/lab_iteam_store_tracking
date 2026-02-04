'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, StockTransaction } from '@/lib/supabase'
import { ArrowLeft, History, Loader2, PackageMinus, Calendar } from 'lucide-react'

export default function TechnicianHistoryPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/')
      return
    }

    const { data } = await supabase
      .from('stock_transactions')
      .select(`
        *,
        reagents(name, unit, categories(name), machines(name))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    setTransactions(data?.map(t => ({
      ...t,
      reagent_name: t.reagents?.name,
      reagent_unit: t.reagents?.unit,
      category_name: t.reagents?.categories?.name,
      machine_name: t.reagents?.machines?.name,
    })) || [])
    
    setLoading(false)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/technician" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <h1 className="font-semibold text-gray-900">My History</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto p-4">
        {transactions.length === 0 ? (
          <div className="card text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-1">No Transactions Yet</h3>
            <p className="text-gray-500">Your withdrawal history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <div key={t.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PackageMinus className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{t.reagent_name}</h3>
                    <p className="text-sm text-gray-500">
                      {t.category_name}
                      {t.machine_name && ` → ${t.machine_name}`}
                    </p>
                    {t.reason && (
                      <p className="text-sm text-gray-400 mt-1 italic">"{t.reason}"</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-red-600 font-medium">
                        -{t.quantity} {t.reagent_unit}
                      </span>
                      <span className="text-gray-400">
                        {t.previous_stock} → {t.new_stock}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-400 flex-shrink-0">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {formatDate(t.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
