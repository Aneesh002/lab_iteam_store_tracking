'use client'

import { useState, useEffect } from 'react'
import { createClient, Category, Machine, Reagent } from '@/lib/supabase'
import { Loader2, ChevronRight, PackagePlus, Check, ArrowLeft, FlaskConical } from 'lucide-react'

export default function AdminAddStockPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [reagents, setReagents] = useState<Reagent[]>([])
  const [loading, setLoading] = useState(true)
  
  const [step, setStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [selectedReagent, setSelectedReagent] = useState<Reagent | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
    setLoading(false)
  }, [])

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

  const handleAddStock = async () => {
    if (!selectedReagent || quantity <= 0) return

    setAdding(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const newStock = selectedReagent.current_stock + quantity

      const { error: txError } = await supabase
        .from('stock_transactions')
        .insert({
          reagent_id: selectedReagent.id,
          user_id: user.id,
          transaction_type: 'add',
          quantity,
          previous_stock: selectedReagent.current_stock,
          new_stock: newStock,
          reason: reason || 'Stock added',
        })

      if (txError) throw txError

      setMessage({
        type: 'success',
        text: `Successfully added ${quantity} ${selectedReagent.unit}! New stock: ${newStock}`,
      })

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
      setMessage({ type: 'error', text: err.message || 'Failed to add stock' })
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6 text-sm flex-wrap">
        <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          Category
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        {selectedCategory?.has_machines && (
          <>
            <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              Machine
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </>
        )}
        <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          Reagent
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className={`px-3 py-1 rounded-full ${step >= 4 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          Add Stock
        </span>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {step > 1 && (
        <button onClick={handleBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Category</h2>
          <div className="space-y-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat)}
                className="w-full card flex items-center justify-between hover:border-green-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                    <FlaskConical className="w-6 h-6" style={{ color: cat.color }} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                    {cat.has_machines && <p className="text-sm text-gray-500">Has multiple machines</p>}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Select Machine</h2>
          <p className="text-gray-500 mb-4">{selectedCategory?.name}</p>
          <div className="space-y-3">
            {machines.map((machine) => (
              <button
                key={machine.id}
                onClick={() => handleMachineSelect(machine)}
                className="w-full card flex items-center justify-between hover:border-green-300 hover:shadow-md transition-all"
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

      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Select Reagent</h2>
          <p className="text-gray-500 mb-4">
            {selectedCategory?.name}
            {selectedMachine && ` → ${selectedMachine.name}`}
          </p>
          <div className="space-y-3">
            {reagents.length === 0 ? (
              <div className="card text-center py-8 text-gray-500">No reagents found</div>
            ) : (
              reagents.map((reagent) => {
                const isLow = reagent.current_stock <= reagent.minimum_stock
                return (
                  <button
                    key={reagent.id}
                    onClick={() => handleReagentSelect(reagent)}
                    className="w-full card flex items-center justify-between hover:border-green-300 hover:shadow-md transition-all"
                  >
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{reagent.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {reagent.current_stock} {reagent.unit}
                        </span>
                        {isLow && <span className="badge bg-yellow-100 text-yellow-700">Needs Restock</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {step === 4 && selectedReagent && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Add Stock</h2>
          <div className="card mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <PackagePlus className="w-7 h-7 text-green-600" />
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
                <span className="text-gray-600">Current Stock</span>
                <span className="font-semibold">{selectedReagent.current_stock} {selectedReagent.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Minimum Required</span>
                <span>{selectedReagent.minimum_stock} {selectedReagent.unit}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Quantity to Add *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="input text-lg font-semibold"
                />
                <p className="text-sm text-green-600 mt-1">
                  After adding: {selectedReagent.current_stock + quantity} {selectedReagent.unit}
                </p>
              </div>
              <div>
                <label className="label">Note (Optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input"
                  placeholder="e.g., New shipment, Restocking..."
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleAddStock}
            disabled={adding || quantity <= 0}
            className="btn btn-success w-full py-3 text-base"
          >
            {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {adding ? 'Processing...' : `Add ${quantity} ${selectedReagent.unit}`}
          </button>
        </div>
      )}
    </div>
  )
}
