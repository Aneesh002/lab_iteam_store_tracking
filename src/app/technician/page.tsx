'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, Category, Machine, Reagent, Profile } from '@/lib/supabase'
import { 
  FlaskConical, LogOut, History, Loader2, ChevronRight, 
  PackageMinus, AlertTriangle, Check, ArrowLeft
} from 'lucide-react'

export default function TechnicianPage() {
  const [user, setUser] = useState<Profile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [reagents, setReagents] = useState<Reagent[]>([])
  const [loading, setLoading] = useState(true)
  
  // Selection state
  const [step, setStep] = useState(1) // 1: Category, 2: Machine (if needed), 3: Reagent, 4: Confirm
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [selectedReagent, setSelectedReagent] = useState<Reagent | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  
  // Withdraw state
  const [withdrawing, setWithdrawing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      router.push('/')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!profile || profile.role !== 'technician') {
      router.push('/admin')
      return
    }

    setUser(profile)
    fetchCategories()
    setLoading(false)
  }

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setCategories(data || [])
  }

  const fetchMachines = async (categoryId: number) => {
    const { data } = await supabase
      .from('machines')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name')
    setMachines(data || [])
  }

  const fetchReagents = async (categoryId: number, machineId?: number) => {
    let query = supabase
      .from('reagents')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name')

    if (machineId) {
      query = query.eq('machine_id', machineId)
    } else {
      query = query.is('machine_id', null)
    }

    const { data } = await query
    setReagents(data || [])
  }

  const handleCategorySelect = async (category: Category) => {
    setSelectedCategory(category)
    setSelectedMachine(null)
    setSelectedReagent(null)
    setMessage(null)

    if (category.has_machines) {
      await fetchMachines(category.id)
      setStep(2)
    } else {
      await fetchReagents(category.id)
      setStep(3)
    }
  }

  const handleMachineSelect = async (machine: Machine) => {
    setSelectedMachine(machine)
    setSelectedReagent(null)
    await fetchReagents(selectedCategory!.id, machine.id)
    setStep(3)
  }

  const handleReagentSelect = (reagent: Reagent) => {
    if (reagent.current_stock <= 0) return
    setSelectedReagent(reagent)
    setQuantity(1)
    setReason('')
    setStep(4)
  }

  const handleBack = () => {
    if (step === 4) {
      setStep(3)
      setSelectedReagent(null)
    } else if (step === 3) {
      if (selectedCategory?.has_machines) {
        setStep(2)
        setSelectedMachine(null)
      } else {
        setStep(1)
        setSelectedCategory(null)
      }
    } else if (step === 2) {
      setStep(1)
      setSelectedCategory(null)
    }
  }

  const handleWithdraw = async () => {
    if (!selectedReagent || quantity <= 0) return
    if (quantity > selectedReagent.current_stock) {
      setMessage({ type: 'error', text: `Only ${selectedReagent.current_stock} available` })
      return
    }

    setWithdrawing(true)
    setMessage(null)

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Not authenticated')

      const newStock = selectedReagent.current_stock - quantity

      // Insert transaction (trigger will update stock)
      const { error: txError } = await supabase
        .from('stock_transactions')
        .insert({
          reagent_id: selectedReagent.id,
          user_id: authUser.id,
          transaction_type: 'withdraw',
          quantity,
          previous_stock: selectedReagent.current_stock,
          new_stock: newStock,
          reason: reason || 'Stock withdrawal',
        })

      if (txError) throw txError

      // Check low stock and notify
      const { data: reagent } = await supabase
        .from('reagents')
        .select(`
          *,
          categories(name),
          machines(name)
        `)
        .eq('id', selectedReagent.id)
        .single()

      if (reagent && reagent.current_stock <= reagent.minimum_stock) {
        // Call notification API
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reagent }),
        })
      }

      setMessage({
        type: 'success',
        text: `Successfully withdrew ${quantity} ${selectedReagent.unit}! Remaining: ${newStock}`,
      })

      // Reset after success
      setTimeout(() => {
        setStep(1)
        setSelectedCategory(null)
        setSelectedMachine(null)
        setSelectedReagent(null)
        setQuantity(1)
        setReason('')
        setMessage(null)
      }, 2000)

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Withdrawal failed' })
    } finally {
      setWithdrawing(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Lab Inventory</h1>
              <p className="text-xs text-gray-500">{user?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/technician/history" className="btn btn-secondary py-2 px-3">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary py-2 px-3">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            1. Category
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {selectedCategory?.has_machines && (
            <>
              <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                2. Machine
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </>
          )}
          <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            {selectedCategory?.has_machines ? '3' : '2'}. Reagent
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className={`px-3 py-1 rounded-full ${step >= 4 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            Withdraw
          </span>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Back Button */}
        {step > 1 && (
          <button onClick={handleBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Step 1: Select Category */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Select Category</h2>
            <div className="space-y-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat)}
                  className="w-full card flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                      <FlaskConical className="w-6 h-6" style={{ color: cat.color }} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                      {cat.has_machines && (
                        <p className="text-sm text-gray-500">Has multiple machines</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Machine */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Select Machine</h2>
            <p className="text-gray-500 mb-4">{selectedCategory?.name}</p>
            <div className="space-y-3">
              {machines.map((machine) => (
                <button
                  key={machine.id}
                  onClick={() => handleMachineSelect(machine)}
                  className="w-full card flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-xl">🖥️</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{machine.name}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Reagent */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Select Reagent</h2>
            <p className="text-gray-500 mb-4">
              {selectedCategory?.name}
              {selectedMachine && ` → ${selectedMachine.name}`}
            </p>
            <div className="space-y-3">
              {reagents.length === 0 ? (
                <div className="card text-center py-8 text-gray-500">
                  No reagents found
                </div>
              ) : (
                reagents.map((reagent) => {
                  const isLow = reagent.current_stock <= reagent.minimum_stock
                  const isOut = reagent.current_stock <= 0
                  
                  return (
                    <button
                      key={reagent.id}
                      onClick={() => handleReagentSelect(reagent)}
                      disabled={isOut}
                      className={`w-full card flex items-center justify-between transition-all ${
                        isOut ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{reagent.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`badge ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {reagent.current_stock} {reagent.unit}
                          </span>
                          {isLow && !isOut && (
                            <span className="badge bg-yellow-100 text-yellow-700">Low Stock</span>
                          )}
                          {isOut && (
                            <span className="badge bg-red-100 text-red-700">Out of Stock</span>
                          )}
                        </div>
                      </div>
                      {!isOut && <ChevronRight className="w-5 h-5 text-gray-400" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Step 4: Withdraw */}
        {step === 4 && selectedReagent && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Withdraw Stock</h2>
            
            <div className="card mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <PackageMinus className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedReagent.name}</h3>
                  <p className="text-gray-500">
                    {selectedCategory?.name}
                    {selectedMachine && ` → ${selectedMachine.name}`}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Available Stock</span>
                  <span className="font-semibold">{selectedReagent.current_stock} {selectedReagent.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Minimum Required</span>
                  <span className="text-gray-900">{selectedReagent.minimum_stock} {selectedReagent.unit}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Quantity to Withdraw *</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max={selectedReagent.current_stock}
                    className="input text-lg font-semibold"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    After withdrawal: {selectedReagent.current_stock - quantity} {selectedReagent.unit}
                  </p>
                  {selectedReagent.current_stock - quantity <= selectedReagent.minimum_stock && (
                    <p className="text-sm text-yellow-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-4 h-4" />
                      Will be below minimum - Admin will be notified
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Reason (Optional)</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input"
                    placeholder="e.g., Patient testing, QC..."
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={withdrawing || quantity > selectedReagent.current_stock || quantity <= 0}
              className="btn btn-primary w-full py-3 text-base"
            >
              {withdrawing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {withdrawing ? 'Processing...' : `Withdraw ${quantity} ${selectedReagent.unit}`}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
