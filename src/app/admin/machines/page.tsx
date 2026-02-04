'use client'

import { useState, useEffect } from 'react'
import { createClient, Category, Machine } from '@/lib/supabase'
import { Plus, Edit, Trash2, Loader2, X, Monitor } from 'lucide-react'

export default function MachinesPage() {
  const [machines, setMachines] = useState<(Machine & { category_name?: string })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Machine | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category_id: '',
    description: '',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // Only categories with has_machines = true
    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .eq('has_machines', true)
      .order('name')
    setCategories(catData || [])

    const { data: machineData } = await supabase
      .from('machines')
      .select(`*, categories(name)`)
      .eq('is_active', true)
      .order('name')
    
    setMachines(machineData?.map(m => ({
      ...m,
      category_name: m.categories?.name,
    })) || [])
    
    setLoading(false)
  }

  const openModal = (machine?: Machine) => {
    if (machine) {
      setEditing(machine)
      setForm({
        name: machine.name,
        category_id: machine.category_id.toString(),
        description: machine.description || '',
      })
    } else {
      setEditing(null)
      setForm({ name: '', category_id: categories[0]?.id.toString() || '', description: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.category_id) return
    setSaving(true)

    try {
      const data = {
        name: form.name,
        category_id: parseInt(form.category_id),
        description: form.description,
      }

      if (editing) {
        await supabase.from('machines').update(data).eq('id', editing.id)
      } else {
        await supabase.from('machines').insert(data)
      }
      await fetchData()
      setModalOpen(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this machine?')) return
    await supabase.from('machines').update({ is_active: false }).eq('id', id)
    await fetchData()
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
          <h2 className="text-2xl font-bold text-gray-900">Machines</h2>
          <p className="text-gray-500">{machines.length} machines</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary" disabled={categories.length === 0}>
          <Plus className="w-5 h-5" />
          Add Machine
        </button>
      </div>

      {categories.length === 0 && (
        <div className="card text-center py-8">
          <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No categories with machines enabled.</p>
          <p className="text-sm text-gray-400 mt-1">First, create a category with "Has Multiple Machines" checked.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((machine) => (
          <div key={machine.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Monitor className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => openModal(machine)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(machine.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900">{machine.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{machine.category_name}</p>
            {machine.description && <p className="text-sm text-gray-400 mt-1">{machine.description}</p>}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Machine' : 'Add Machine'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Zybio"
                />
              </div>
              <div>
                <label className="label">Category *</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="select"
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.category_id} className="btn btn-primary flex-1">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editing ? 'Update' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
