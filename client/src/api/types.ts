export interface Group {
  id: string
  name: string
  created_at: string
}

export interface Person {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface ExpenseShare {
  person_id: string
  person_name: string
  amount: number
}

export interface Expense {
  id: string
  description: string
  amount: number
  paid_by: { id: string; name: string }
  category: { id: string; name: string } | null
  shares: ExpenseShare[]
  created_at: string
}

export interface BalanceEntry {
  person_id: string
  person_name: string
  balance: number
}

export interface BalancesResult {
  total_outstanding: number
  balances: BalanceEntry[]
}

export interface SettlementPersonRef {
  id: string
  name: string
}

export interface SettlementSuggestion {
  from_person: SettlementPersonRef
  to_person: SettlementPersonRef
  amount: number
}

export interface Settlement {
  id: string
  from_person: SettlementPersonRef
  to_person: SettlementPersonRef
  amount: number
  created_at: string
}

export type ExpenseSort = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc'

export interface ExpenseListFilters {
  categoryId?: string
  personId?: string
  from?: string
  to?: string
  sort?: ExpenseSort
}

export interface CreateExpenseInput {
  description: string
  amount: number
  paid_by: string
  category_id: string | null
  shares: { person_id: string; amount: number }[]
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>

export interface CreateSettlementInput {
  from_person: string
  to_person: string
  amount: number
}
