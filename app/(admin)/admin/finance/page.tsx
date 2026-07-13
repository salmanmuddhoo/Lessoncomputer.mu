'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2, Plus, Trash2, Wallet, TrendingUp, TrendingDown, Landmark, Receipt, Save,
} from 'lucide-react'
import { toast } from 'sonner'

const EXPENSE_CATEGORIES = [
  'Advertising', 'Salary', 'IT Materials', 'Software & Subscriptions',
  'Rent', 'Utilities', 'Office Supplies', 'Professional Fees', 'Bank Charges', 'Other',
]

interface Expense {
  id: string
  category: string
  description: string | null
  amount: number
  expense_date: string
}

interface Order {
  id: string
  amount: number
  order_type: string
  status: string
  created_at: string
}

function money(n: number) {
  return `Rs ${n.toLocaleString('en-MU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminFinancePage() {
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [taxRate, setTaxRate] = useState(15)
  const [taxRateInput, setTaxRateInput] = useState('15')
  const [savingTax, setSavingTax] = useState(false)
  const [loading, setLoading] = useState(true)

  const [year, setYear] = useState(String(new Date().getFullYear()))

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ category: 'Advertising', customCategory: '', amount: '', expense_date: today(), description: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [{ data: ord }, { data: exp }, { data: settings }] = await Promise.all([
      (supabase as any).from('mips_orders').select('id, amount, order_type, status, created_at').eq('status', 'paid'),
      (supabase as any).from('company_expenses').select('id, category, description, amount, expense_date').order('expense_date', { ascending: false }),
      (supabase as any).from('site_settings').select('tax_rate').eq('id', 1).single(),
    ])
    setOrders((ord ?? []) as Order[])
    setExpenses((exp ?? []) as Expense[])
    const tr = Number((settings as any)?.tax_rate ?? 15)
    setTaxRate(tr)
    setTaxRateInput(String(tr))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Years present in the data, plus the current year, newest first
  const years = useMemo(() => {
    const set = new Set<string>([String(new Date().getFullYear())])
    orders.forEach((o) => set.add(o.created_at.slice(0, 4)))
    expenses.forEach((e) => set.add(e.expense_date.slice(0, 4)))
    return [...set].sort((a, b) => Number(b) - Number(a))
  }, [orders, expenses])

  const stats = useMemo(() => {
    const yOrders = orders.filter((o) => o.created_at.slice(0, 4) === year)
    const yExpenses = expenses.filter((e) => e.expense_date.slice(0, 4) === year)

    const income = yOrders.reduce((s, o) => s + Number(o.amount), 0)
    const incomeByType = yOrders.reduce((acc, o) => {
      const key = o.order_type === 'video' ? 'Video packages' : o.order_type === 'live' ? 'Live subscriptions' : 'Mixed (live + video)'
      acc[key] = (acc[key] ?? 0) + Number(o.amount)
      return acc
    }, {} as Record<string, number>)

    const totalExpenses = yExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const chargeable = income - totalExpenses
    const tax = chargeable > 0 ? (chargeable * taxRate) / 100 : 0

    return { income, incomeByType, totalExpenses, chargeable, tax, yExpenses }
  }, [orders, expenses, year, taxRate])

  async function saveTaxRate() {
    const val = Number(taxRateInput)
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('Enter a tax rate between 0 and 100.')
      return
    }
    setSavingTax(true)
    const { error } = await (supabase as any).from('site_settings').update({ tax_rate: val }).eq('id', 1)
    setSavingTax(false)
    if (error) { toast.error(error.message); return }
    setTaxRate(val)
    toast.success('Tax rate updated.')
  }

  async function addExpense() {
    const category = form.category === 'Other' ? form.customCategory.trim() : form.category
    const amount = Number(form.amount)
    if (!category) { toast.error('Enter a category.'); return }
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount.'); return }
    if (!form.expense_date) { toast.error('Pick a date.'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await (supabase as any).from('company_expenses').insert({
      category,
      description: form.description.trim() || null,
      amount,
      expense_date: form.expense_date,
      created_by: user?.id ?? null,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Expense added.')
    setForm({ category: 'Advertising', customCategory: '', amount: '', expense_date: today(), description: '' })
    setDialogOpen(false)
    load()
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    const { error } = await (supabase as any).from('company_expenses').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Expense deleted.')
    load()
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" /> Finance &amp; Tax
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Sales, expenses and tax due on chargeable income.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-green-600" /> Total Income</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{money(stats.income)}</p>
        </div>
        <div className="rounded-xl border border-border/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-red-500" /> Total Expenses</p>
          <p className="text-2xl font-bold text-red-500">{money(stats.totalExpenses)}</p>
        </div>
        <div className="rounded-xl border border-border/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Chargeable Income</p>
          <p className={`text-2xl font-bold ${stats.chargeable < 0 ? 'text-red-500' : ''}`}>{money(stats.chargeable)}</p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-primary" /> Tax Due ({taxRate}%)</p>
          <p className="text-2xl font-bold text-primary">{money(stats.tax)}</p>
        </div>
      </div>

      {/* Income breakdown + tax rate config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border/60 p-5">
          <h2 className="text-sm font-semibold mb-3">Income breakdown — {year}</h2>
          {Object.keys(stats.incomeByType).length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid sales recorded for {year}.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.incomeByType).map(([type, amt]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{type}</span>
                  <span className="font-medium">{money(amt)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40 font-semibold">
                <span>Total</span>
                <span className="text-green-600 dark:text-green-400">{money(stats.income)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 p-5">
          <h2 className="text-sm font-semibold mb-3">Tax rate</h2>
          <p className="text-xs text-muted-foreground mb-3">Applied to chargeable income (income − expenses).</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="number" min="0" max="100" step="0.01"
                value={taxRateInput}
                onChange={(e) => setTaxRateInput(e.target.value)}
                className="pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            <Button onClick={saveTaxRate} disabled={savingTax || taxRateInput === String(taxRate)}>
              {savingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Expenses — {year}</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-accent">
                <Plus className="w-4 h-4 mr-2" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (Rs)</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                  </div>
                </div>
                {form.category === 'Other' && (
                  <div className="space-y-2">
                    <Label>Custom category</Label>
                    <Input placeholder="e.g. Travel" value={form.customCategory} onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea rows={2} placeholder="Notes…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={addExpense} disabled={saving} className="bg-primary text-primary-foreground hover:bg-accent">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          {stats.yExpenses.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No expenses recorded for {year}.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-muted/30 border-b border-border/60">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {stats.yExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(e.expense_date).toLocaleDateString('en-MU', { dateStyle: 'medium' })}</td>
                      <td className="px-4 py-3 font-medium">{e.category}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[280px] truncate">{e.description ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(Number(e.amount))}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteExpense(e.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border/40">
                {stats.yExpenses.map((e) => (
                  <div key={e.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{e.category}</span>
                      <span className="font-semibold shrink-0">{money(Number(e.amount))}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(e.expense_date).toLocaleDateString('en-MU', { dateStyle: 'medium' })}</span>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteExpense(e.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                    {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
