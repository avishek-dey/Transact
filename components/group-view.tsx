"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Plus, Users, Receipt } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { AddExpenseDialog } from "./add-expense-dialog"
import { ExpenseCard } from "./expense-card"
import { AddMemberDialog } from "./add-member-dialog"

interface GroupViewProps {
  groupId: string
  onBack: () => void
  onGroupUpdated: () => void
}

interface Group {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface Member {
  id: string
  name: string
  email: string
  avatar_url: string | null
  balance: number
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  created_at: string
  paid_by: string
  paid_by_name: string
  splits: Array<{
    user_id: string
    user_name: string
    amount: number
  }>
  comments_count: number
}

export function GroupView({ groupId, onBack, onGroupUpdated }: GroupViewProps) {
  const { user } = useAuth()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGroupData()
  }, [groupId])

  const fetchGroupData = async () => {
    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single()

      if (groupError) throw groupError
      setGroup(groupData)

      // Fetch members with balances
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select(`
          users (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq("group_id", groupId)

      if (membersError) throw membersError

      // Calculate balances for each member
      const membersWithBalances = await Promise.all(
        membersData.map(async (member) => {
          const userId = (member.users as any).id

          // Amount they paid
          const { data: paidExpenses } = await supabase
            .from("expenses")
            .select("amount")
            .eq("group_id", groupId)
            .eq("paid_by", userId)

          const totalPaid = paidExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0

          // Amount they owe
          const { data: splits } = await supabase
            .from("expense_splits")
            .select("amount")
            .eq("user_id", userId)
            .in(
              "expense_id",
              (await supabase.from("expenses").select("id").eq("group_id", groupId)).data?.map((e) => e.id) || [],
            )

          const totalOwed = splits?.reduce((sum, split) => sum + split.amount, 0) || 0
          const balance = totalPaid - totalOwed

          return {
            id: userId,
            name: (member.users as any).name,
            email: (member.users as any).email,
            avatar_url: (member.users as any).avatar_url,
            balance,
          }
        }),
      )

      setMembers(membersWithBalances)

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          users!expenses_paid_by_fkey (name),
          expense_splits (
            amount,
            users (id, name)
          ),
          comments (id)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })

      if (expensesError) throw expensesError

      const formattedExpenses = expensesData.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        created_at: expense.created_at,
        paid_by: expense.paid_by,
        paid_by_name: (expense.users as any).name,
        splits: (expense.expense_splits as any[]).map((split) => ({
          user_id: split.users.id,
          user_name: split.users.name,
          amount: split.amount,
        })),
        comments_count: (expense.comments as any[]).length,
      }))

      setExpenses(formattedExpenses)
    } catch (error) {
      console.error("Error fetching group data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Group not found</h2>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{group.name}</h1>
                {group.description && <p className="text-sm text-gray-500">{group.description}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)}>
                <Users className="h-4 w-4 mr-2" />
                Add Member
              </Button>
              <Button size="sm" onClick={() => setShowAddExpense(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Members & Balances */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Members ({members.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${member.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {member.balance >= 0 ? "+" : "-"}${Math.abs(member.balance).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">{member.balance >= 0 ? "gets back" : "owes"}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Expenses */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Expenses ({expenses.length})</h2>
            </div>

            {expenses.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
                  <p className="text-gray-500 mb-4">Add your first expense to get started</p>
                  <Button onClick={() => setShowAddExpense(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} onExpenseUpdated={fetchGroupData} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddExpenseDialog
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        groupId={groupId}
        members={members}
        onExpenseAdded={() => {
          setShowAddExpense(false)
          fetchGroupData()
          onGroupUpdated()
        }}
      />

      <AddMemberDialog
        open={showAddMember}
        onOpenChange={setShowAddMember}
        groupId={groupId}
        onMemberAdded={() => {
          setShowAddMember(false)
          fetchGroupData()
        }}
      />
    </div>
  )
}
