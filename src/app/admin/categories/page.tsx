'use client'

import { useState, useEffect } from 'react'
import { createClient, Category } from '@/lib/supabase'
import { Plus, Edit, Trash2, Loader2, X, Tags } from 'lucide-react'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    has_machines: false,
    color: '#3b82f6',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setCategories(data || [])
    setLoading(false)
  }

  const openModal = (category?: Category) => {
    if (category) {
      setEditing(category)
      setForm({
        name: category.name,
        description: category.description || '',
        has_machines: category.has_machines,
        color: category.color,
      })
    } else {
      setEditing(null)
      setForm({ name: '', description: '', has_machines: false, color: '#3b82f6' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)

    try {
      if (editing) {
        await supabase.from('categories').update(form).eq('id', editing.id)
      } else {
        await supabase.from('categories').insert(form)
      }
      await fetchCategories()
      setModalOpen(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    await supabase.from('categories').update({ is_active: false }).eq('id', id)
    await fetchCategories()
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
          <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
          <p className="text-gray-500">{categories.length} categories</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                <Tags className="w-6 h-6" style={{ color: cat.color }} />
              </div>
              <div className="flex gap-1">
                <button onClick={() => openModal(cat)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900">{cat.name}</h3>
            {cat.description && <p className="text-sm text-gray-500 mt-1">{cat.description}</p>}
            {cat.has_machines && (
              <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                Has Machines
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Category' : 'Add Category'}</h3>
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
                  placeholder="e.g., Biochemistry"
                />
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
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`w-10 h-10 rounded-lg ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_machines}
                  onChange={(e) => setForm({ ...form, has_machines: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <span className="font-medium">Has Multiple Machines</span>
                  <p className="text-sm text-gray-500">Check if this category has different machines (e.g., Biochemistry has Zybio, Getein)</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="btn btn-primary flex-1">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editing ? 'Update' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
