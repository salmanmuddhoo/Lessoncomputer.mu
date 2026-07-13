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
  Loader2, Plus, Trash2, Wallet, TrendingUp, TrendingDown, Landmark, Receipt, Save, CalendarRange,
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

interface FinancialYear {
  id: string
  label: string
  start_date: string
  end_date: string
}

function money(n: number) {
  return `Rs ${n.toLocaleString('en-MU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function oneYearFrom(dateStr: string) {
  const d = new Date(dateStr)
  const end = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate() - 1)
  return end.toISOString().slice(0, 10)
}

function prettyDate(d: string) {
  return new Date(d).toLocaleDateString('en-MU', { dateStyle: 'medium' })
}

export default function AdminFinancePage() {
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [fys, setFys] = useState<FinancialYear[]>([])
  const [selectedFyId, setSelectedFyId] = useState<string>('')
  const [taxRate, setTaxRate] = useState(15)
  const [taxRateInput, setTaxRateInput] = useState('15')
  const [savingTax, setSavingTax] = useState(false)
  const [loading, setLoading] = useState(true)

  // Add-expense dialog
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [form, setForm] = useState({ category: 'Advertising', customCategory: '', amount: '', expense_date: today(), description: '' })
  const [saving, setSaving] = useState(false)

  // Add financial-year dialog
  const [fyOpen, setFyOpen] = useState(false)
  const [fyForm, setFyForm] = useState({ label: '', start_date: today(), end_date: oneYearFrom(today()) })
  const [savingFy, setSavingFy] = useState(false)

  const load = useCallback(async () => {
    const [{ data: ord }, { data: exp }, { data: fyRows }, { data: settings }] = await Promise.all([
      (supabase as any).from('mips_orders').select('id, amount, order_type, status, created_at').eq('status', 'paid'),
      (supabase as any).from('company_expenses').select('id, category, description, amount, expense_date').order('expense_date', { ascending: false }),
      (supabase as any).from('financial_years').select('id, label, start_date, end_date').order('start_date', { ascending: false }),
      (supabase as any).from('site_settings').select('tax_rate').eq('id', 1).single(),
    ])
    setOrders((ord ?? []) as Order[])
    setExpenses((exp ?? []) as Expense[])
    const years = (fyRows ?? []) as FinancialYear[]
    setFys(years)

    // Default to the FY containing today, else the most recent one
    setSelectedFyId((prev) => {
      if (prev && years.some((y) => y.id === prev)) return prev
      const t = today()
      const current = years.find((y) => y.start_date <= t && t <= y.end_date)
      return current?.id ?? years[0]?.id ?? ''
    })

    const tr = Number((settings as any)?.tax_rate ?? 15)
    setTaxRate(tr)
    setTaxRateInput(String(tr))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const selectedFy = useMemo(() => fys.find((y) => y.id === selectedFyId) ?? null, [fys, selectedFyId])

  const stats = useMemo(() => {
    if (!selectedFy) {
      return { income: 0, incomeByType: {} as Record<string, number>, totalExpenses: 0, chargeable: 0, tax: 0, fyExpenses: [] as Expense[] }
    }
    const { start_date, end_date } = selectedFy

    const inRangeOrders = orders.filter((o) => {
      const d = o.created_at.slice(0, 10)
      return d >= start_date && d <= end_date
    })
    const fyExpenses = expenses.filter((e) => e.expense_date >= start_date && e.expense_date <= end_date)

    const income = inRangeOrders.reduce((s, o) => s + Number(o.amount), 0)
    const incomeByType = inRangeOrders.reduce((acc, o) => {
      const key = o.order_type === 'video' ? 'Video packages' : o.order_type === 'live' ? 'Live subscriptions' : 'Mixed (live + video)'
      acc[key] = (acc[key] ?? 0) + Number(o.amount)
      return acc
    }, {} as Record<string, number>)

    const totalExpenses = fyExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const chargeable = income - totalExpenses
    const tax = chargeable > 0 ? (chargeable * taxRate) / 100 : 0

    return { income, incomeByType, totalExpenses, chargeable, tax, fyExpenses }
  }, [orders, expenses, selectedFy, taxRate])

  async function saveTaxRate() {
    const val = Number(taxRateInput)
    if (isNaN(val) || val < 0 || val > 100) { toast.error('Enter a tax rate between 0 and 100.'); return }
    setSavingTax(true)
    const { error } = await (supabase as any).from('site_settings').update({ tax_rate: val }).eq('id', 1)
    setSavingTax(false)
    if (error) { toast.error(error.message); return }
    setTaxRate(val)
    toast.success('Tax rate updated.')
  }

  async function addFinancialYear() {
    const start = fyForm.start_date
    const end = fyForm.end_date
    if (!start || !end) { toast.error('Pick a start and end date.'); return }
    if (end < start) { toast.error('End date must be after the start date.'); return }
    const label = fyForm.label.trim() || (start.slice(0, 4) === end.slice(0, 4) ? `FY ${start.slice(0, 4)}` : `FY ${start.slice(0, 4)}/${end.slice(0, 4)}`)

    setSavingFy(true)
    const { data, error } = await (supabase as any)
      .from('financial_years')
      .insert({ label, start_date: start, end_date: end })
      .select('id')
      .single()
    setSavingFy(false)
    if (error) { toast.error(error.message); return }
    toast.success('Financial year created.')
    if (data?.id) setSelectedFyId(data.id)
    setFyOpen(false)
    load()
  }

  async function deleteFinancialYear() {
    if (!selectedFy) return
    if (!confirm(`Delete "${selectedFy.label}"? This only removes the reporting period — your expenses and sales are not deleted.`)) return
    const { error } = await (supabase as any).from('financial_years').delete().eq('id', selectedFy.id)
    if (error) { toast.error(error.message); return }
    toast.success('Financial year deleted.')
    setSelectedFyId('')
    load()
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
    setExpenseOpen(false)
    load()
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    const { error } = await (supabase as any).from('company_expenses').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Expense deleted.')
    load()
  }

  function openNewFyDialog() {
    // Default a new year to start the day after the latest one ends, running for a year
    const latestEnd = fys[0]?.end_date
    const start = latestEnd
      ? new Date(new Date(latestEnd).getTime() + 86400000).toISOString().slice(0, 10)
      : today()
    setFyForm({ label: '', start_date: start, end_date: oneYearFrom(start) })
    setFyOpen(true)
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  const newFyDialog = (
    <Dialog open={fyOpen} onOpenChange={setFyOpen}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader><DialogTitle>New Financial Year</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label (optional)</Label>
            <Input placeholder="e.g. FY 2026/2027" value={fyForm.label} onChange={(e) => setFyForm((f) => ({ ...f, label: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={fyForm.start_date} onChange={(e) => setFyForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={fyForm.end_date} onChange={(e) => setFyForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Only sales and expenses dated within this range are counted for this year.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setFyOpen(false)} disabled={savingFy}>Cancel</Button>
          <Button onClick={addFinancialYear} disabled={savingFy} className="bg-primary text-primary-foreground hover:bg-accent">
            {savingFy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" /> Finance &amp; Tax
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Sales, expenses and tax due per financial year.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {fys.length > 0 && (
            <Select value={selectedFyId} onValueChange={setSelectedFyId}>
              <SelectTrigger className="w-[210px]"><SelectValue placeholder="Select financial year" /></SelectTrigger>
              <SelectContent>
                {fys.map((y) => (
                  <SelectItem key={y.id} value={y.id}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={openNewFyDialog}>
            <Plus className="w-4 h-4 mr-2" /> New Year
          </Button>
        </div>
      </div>

      {!selectedFy ? (
        <div className="py-16 text-center rounded-xl border border-border/60">
          <CalendarRange className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-semibold mb-2">No financial year defined</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Create a financial year with a start and end date. Only sales and expenses within that period are counted for tax.
          </p>
          <Button onClick={openNewFyDialog} className="bg-primary text-primary-foreground hover:bg-accent">
            <Plus className="w-4 h-4 mr-2" /> Create Financial Year
          </Button>
        </div>
      ) : (
        <>
          {/* Selected period bar */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <CalendarRange className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">{selectedFy.label}</span>
              <span className="text-muted-foreground">· {prettyDate(selectedFy.start_date)} — {prettyDate(selectedFy.end_date)}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={deleteFinancialYear}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete year
            </Button>
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
              <h2 className="text-sm font-semibold mb-3">Income breakdown</h2>
              {Object.keys(stats.incomeByType).length === 0 ? (
                <p className="text-sm text-muted-foreground">No paid sales recorded in this period.</p>
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
              <h2 className="text-lg font-semibold">Expenses</h2>
              <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
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
                    <Button variant="outline" onClick={() => setExpenseOpen(false)} disabled={saving}>Cancel</Button>
                    <Button onClick={addExpense} disabled={saving} className="bg-primary text-primary-foreground hover:bg-accent">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              {stats.fyExpenses.length === 0 ? (
                <div className="py-12 text-center">
                  <Wallet className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No expenses recorded in this period.</p>
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
                      {stats.fyExpenses.map((e) => (
                        <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{prettyDate(e.expense_date)}</td>
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
                    {stats.fyExpenses.map((e) => (
                      <div key={e.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{e.category}</span>
                          <span className="font-semibold shrink-0">{money(Number(e.amount))}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{prettyDate(e.expense_date)}</span>
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
        </>
      )}

      {newFyDialog}
    </div>
  )
}
