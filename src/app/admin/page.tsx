'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, Reagent, StockTransaction, Profile } from '@/lib/supabase'
import { 
  FlaskConical, AlertTriangle, Users, Activity, 
  PackageMinus, PackagePlus, Loader2, ArrowRight
} from 'lucide-react'

interface Stats {
  totalReagents: number
  lowStockCount: number
  totalUsers: number
  todayTransactions: number
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [lowStockItems, setLowStockItems] = useState<Reagent[]>([])
  const [recentTransactions, setRecentTransactions] = useState<StockTransaction[]>([])
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      setUser(profile)
    }

    const { data: reagents } = await supabase
      .from('reagents')
      .select('*')
      .eq('is_active', true)

    const lowStock = reagents?.filter(r => r.current_stock <= r.minimum_stock) || []

    const { count: usersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const today = new Date().toISOString().split('T')[0]
    const { count: txCount } = await supabase
      .from('stock_transactions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)

    setStats({
      totalReagents: reagents?.length || 0,
      lowStockCount: lowStock.length,
      totalUsers: usersCount || 0,
      todayTransactions: txCount || 0,
    })

    const { data: lowStockData } = await supabase
      .from('reagents')
      .select(`*, categories(name), machines(name)`)
      .eq('is_active', true)
      .order('current_stock', { ascending: true })
      .limit(100)

    const filteredLow = lowStockData
      ?.filter(r => r.current_stock <= r.minimum_stock)
      .slice(0, 5)
      .map(r => ({
        ...r,
        category_name: r.categories?.name,
        machine_name: r.machines?.name,
      })) || []

    setLowStockItems(filteredLow)

    const { data: txData } = await supabase
      .from('stock_transactions')
      .select(`*, reagents(name, unit), profiles(full_name)`)
      .order('created_at', { ascending: false })
      .limit(5)

    setRecentTransactions(txData?.map(t => ({
      ...t,
      reagent_name: t.reagents?.name,
      reagent_unit: t.reagents?.unit,
      user_name: t.profiles?.full_name,
    })) || [])

    setLoading(false)
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
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
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">Welcome back, {user?.full_name}!</h2>
        <p className="mt-1 text-blue-100">Here's what's happening in your lab today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Reagents" value={stats?.totalReagents || 0} icon={FlaskConical} color="blue" />
        <StatCard title="Low Stock" value={stats?.lowStockCount || 0} icon={AlertTriangle} color="red" />
        <StatCard title="Active Users" value={stats?.totalUsers || 0} icon={Users} color="green" />
        <StatCard title="Today's Transactions" value={stats?.todayTransactions || 0} icon={Activity} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Low Stock Alerts
            </h3>
            <Link href="/admin/reagents" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8">
              <FlaskConical className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-gray-500">All items well stocked!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.category_name}
                      {item.machine_name && ` → ${item.machine_name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{item.current_stock} {item.unit}</p>
                    <p className="text-xs text-gray-500">Min: {item.minimum_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Recent Transactions
            </h3>
            <Link href="/admin/reports" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.transaction_type === 'withdraw' ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {tx.transaction_type === 'withdraw' ? (
                      <PackageMinus className="w-5 h-5 text-red-600" />
                    ) : (
                      <PackagePlus className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{tx.reagent_name}</p>
                    <p className="text-sm text-gray-500">{tx.user_name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.transaction_type === 'withdraw' ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.transaction_type === 'withdraw' ? '-' : '+'}{tx.quantity} {tx.reagent_unit}
                    </p>
                    <p className="text-xs text-gray-400">{formatTime(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/withdraw" className="card hover:border-blue-300 hover:shadow-md transition-all text-center py-6">
          <PackageMinus className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="font-medium">Withdraw Stock</p>
        </Link>
        <Link href="/admin/add-stock" className="card hover:border-blue-300 hover:shadow-md transition-all text-center py-6">
          <PackagePlus className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="font-medium">Add Stock</p>
        </Link>
        <Link href="/admin/reagents" className="card hover:border-blue-300 hover:shadow-md transition-all text-center py-6">
          <FlaskConical className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="font-medium">Manage Reagents</p>
        </Link>
        <Link href="/admin/users" className="card hover:border-blue-300 hover:shadow-md transition-all text-center py-6">
          <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="font-medium">Manage Users</p>
        </Link>
      </div>
    </div>
  )
}
