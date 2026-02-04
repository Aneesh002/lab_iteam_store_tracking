'use client'

import { useEffect, useState } from 'react'
import { createClient, Category, Machine, Reagent } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, Loader2, X, FlaskConical, AlertTriangle } from 'lucide-react'

export default function ReagentsPage() {
  const [reagents, setReagents] = useState<Reagent[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMachine, setFilterMachine] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Reagent | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category_id: '',
    machine_id: '',
    unit: 'bottles',
    minimum_stock: 5,
    storage_condition: 'Room Temperature',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (filterCategory) {
      fetchMachinesForCategory(parseInt(filterCategory))
    } else {
      setMachines([])
      setFilterMachine('')
    }
  }, [filterCategory])

  const fetchData = async () => {
    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setCategories(catData || [])

    await fetchReagents()
    setLoading(false)
  }

  const fetchReagents = async () => {
    const { data } = await supabase
      .from('reagents')
      .select(`*, categories(name), machines(name)`)
      .eq('is_active', true)
      .order('name')

    setReagents(data?.map(r => ({
      ...r,
      category_name: r.categories?.name,
      machine_name: r.machines?.name,
    })) || [])
  }

  const fetchMachinesForCategory = async (categoryId: number) => {
    const { data } = await supabase
      .from('machines')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name')
    setMachines(data || [])
  }

  const filteredReagents = reagents.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && r.category_id !== parseInt(filterCategory)) return false
    if (filterMachine && r.machine_id !== parseInt(filterMachine)) return false
    if (showLowStock && r.current_stock > r.minimum_stock) return false
    return true
  })

  const openModal = (reagent?: Reagent) => {
    if (reagent) {
      setEditing(reagent)
      setForm({
        name: reagent.name,
        category_id: reagent.category_id.toString(),
        machine_id: reagent.machine_id?.toString() || '',
        unit: reagent.unit,
        minimum_stock: reagent.minimum_stock,
        storage_condition: reagent.storage_condition,
      })
      if (reagent.category_id) {
        fetchMachinesForCategory(reagent.category_id)
      }
    } else {
      setEditing(null)
      setForm({
        name: '',
        category_id: '',
        machine_id: '',
        unit: 'bottles',
        minimum_stock: 5,
        storage_condition: 'Room Temperature',
      })
    }
    setModalOpen(true)
  }

  const handleCategoryChange = async (catId: string) => {
    setForm({ ...form, category_id: catId, machine_id: '' })
    if (catId) {
      await fetchMachinesForCategory(parseInt(catId))
    } else {
      setMachines([])
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.category_id) return
    setSaving(true)

    try {
      const category = categories.find(c => c.id === parseInt(form.category_id))
      const data = {
        name: form.name,
        category_id: parseInt(form.category_id),
        machine_id: category?.has_machines && form.machine_id ? parseInt(form.machine_id) : null,
        unit: form.unit,
        minimum_stock: form.minimum_stock,
        storage_condition: form.storage_condition,
      }

      if (editing) {
        await supabase.from('reagents').update(data).eq('id', editing.id)
      } else {
        await supabase.from('reagents').insert({ ...data, current_stock: 0 })
      }

      await fetchReagents()
      setModalOpen(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this reagent?')) return
    await supabase.from('reagents').update({ is_active: false }).eq('id', id)
    await fetchReagents()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const selectedCategory = categories.find(c => c.id === parseInt(form.category_id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reagents</h2>
          <p className="text-gray-500">{filteredReagents.length} items</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Add Reagent
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reagents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="select"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {machines.length > 0 && (
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="select"
            >
              <option value="">All Machines</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium">Low Stock Only</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Reagent</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Category/Machine</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Stock</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Min</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReagents.map((r) => {
                const isLow = r.current_stock <= r.minimum_stock
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{r.name}</p>
                          <p className="text-sm text-gray-500">{r.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{r.category_name}</p>
                      {r.machine_name && (
                        <p className="text-sm text-gray-500">{r.machine_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {r.current_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.minimum_stock}</td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="badge bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="badge bg-green-100 text-green-700">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(r)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filteredReagents.length === 0 && (
          <div className="text-center py-12">
            <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No reagents found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Reagent' : 'Add Reagent'}</h3>
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
                  placeholder="e.g., Glucose"
                />
              </div>
              <div>
                <label className="label">Category *</label>
                <select
                  value={form.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="select"
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {selectedCategory?.has_machines && machines.length > 0 && (
                <div>
                  <label className="label">Machine *</label>
                  <select
                    value={form.machine_id}
                    onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
                    className="select"
                  >
                    <option value="">Select machine</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="select"
                  >
                    <option value="bottles">bottles</option>
                    <option value="kits">kits</option>
                    <option value="liters">liters</option>
                    <option value="boxes">boxes</option>
                    <option value="vials">vials</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
                <div>
                  <label className="label">Minimum Stock</label>
                  <input
                    type="number"
                    value={form.minimum_stock}
                    onChange={(e) => setForm({ ...form, minimum_stock: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="label">Storage Condition</label>
                <select
                  value={form.storage_condition}
                  onChange={(e) => setForm({ ...form, storage_condition: e.target.value })}
                  className="select"
                >
                  <option value="Room Temperature">Room Temperature</option>
                  <option value="2-8°C">2-8°C (Refrigerated)</option>
                  <option value="-20°C">-20°C (Frozen)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.category_id}
                className="btn btn-primary flex-1"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editing ? 'Update' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
