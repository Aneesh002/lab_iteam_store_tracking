'use client'

import { useState, useEffect } from 'react'
import { createClient, StockTransaction } from '@/lib/supabase'
import { FileText, Download, Loader2, PackageMinus, PackagePlus, Calendar, Search } from 'lucide-react'

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    startDate: '',
    endDate: '',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('stock_transactions')
      .select(`
        *,
        reagents(name, unit, categories(name), machines(name)),
        profiles(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    setTransactions(data?.map(t => ({
      ...t,
      reagent_name: t.reagents?.name,
      reagent_unit: t.reagents?.unit,
      category_name: t.reagents?.categories?.name,
      machine_name: t.reagents?.machines?.name,
      user_name: t.profiles?.full_name,
    })) || [])
    setLoading(false)
  }

  const filteredTransactions = transactions.filter(t => {
    if (filters.type && t.transaction_type !== filters.type) return false
    if (filters.search && !t.reagent_name?.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.startDate && new Date(t.created_at) < new Date(filters.startDate)) return false
    if (filters.endDate && new Date(t.created_at) > new Date(filters.endDate + 'T23:59:59')) return false
    return true
  })

  const exportCSV = () => {
    const headers = ['Date', 'Time', 'Reagent', 'Category', 'Machine', 'Type', 'Quantity', 'Previous', 'New', 'User', 'Reason']
    const rows = filteredTransactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      new Date(t.created_at).toLocaleTimeString(),
      t.reagent_name,
      t.category_name || '',
      t.machine_name || '',
      t.transaction_type,
      t.quantity,
      t.previous_stock,
      t.new_stock,
      t.user_name,
      t.reason || '',
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction Reports</h2>
          <p className="text-gray-500">{filteredTransactions.length} transactions</p>
        </div>
        <button onClick={exportCSV} className="btn btn-primary">
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reagent..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="select"
          >
            <option value="">All Types</option>
            <option value="withdraw">Withdrawals</option>
            <option value="add">Additions</option>
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="input"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="input"
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Reagent</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Qty</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Stock</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(t.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{t.reagent_name}</p>
                    <p className="text-xs text-gray-500">{t.category_name}{t.machine_name && ` → ${t.machine_name}`}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      t.transaction_type === 'withdraw' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {t.transaction_type === 'withdraw' ? <PackageMinus className="w-3 h-3" /> : <PackagePlus className="w-3 h-3" />}
                      {t.transaction_type}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${t.transaction_type === 'withdraw' ? 'text-red-600' : 'text-green-600'}`}>
                      {t.transaction_type === 'withdraw' ? '-' : '+'}{t.quantity}
                    </span>
                    <span className="text-gray-500 text-sm"> {t.reagent_unit}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.previous_stock} → {t.new_stock}</td>
                  <td className="px-4 py-3 text-gray-600">{t.user_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm max-w-[200px] truncate">{t.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  )
}
