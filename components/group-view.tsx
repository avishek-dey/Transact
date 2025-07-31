"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Plus, UserPlus, Receipt } from "lucide-react"
import { AddExpenseDialog } from "./add-expense-dialog"
import { AddMemberDialog } from "./add-member-dialog"
import { ExpenseCard } from "./expense-card"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

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

interface GroupViewProps {
  groupId: string
  onBack: () => void
}

export function GroupView({ groupId, onBack }: GroupViewProps) {
  const { user } = useAuth()
  const [groupName, setGroupName] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchGroupData = async () => {
    if (!user) return

    try {
      // Fetch group info
      const { data: group, error: groupError } = await supabase.from("groups").select("name").eq("id", groupId).single()

      if (groupError) throw groupError
      setGroupName(group.name)

      // Fetch members with balances
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select(`
          user_id,
          users!inner(id, name, email, avatar_url)
        `)
        .eq("group_id", groupId)

      if (membersError) throw membersError

      // Calculate balances for each member
      const membersWithBalances = await Promise.all(
        membersData.map(async (member: any) => {
          const { data: balanceData } = await supabase.rpc("calculate_user_balance", {
            p_user_id: member.user_id,
            p_group_id: groupId,
          })

          return {
            id: member.user_id,
            name: member.users.name,
            email: member.users.email,
            avatar_url: member.users.avatar_url,
            balance: balanceData || 0,
          }
        }),
      )

      setMembers(membersWithBalances)

      // Fetch expenses
      await fetchExpenses()
    } catch (error) {
      toast({
        title: "Error fetching group data",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id,
          description,
          amount,
          category,
          date,
          created_at,
          paid_by,
          users!expenses_paid_by_fkey(name),
          expense_splits(
            user_id,
            amount,
            users!expense_splits_user_id_fkey(name)
          ),
          comments(id)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const expensesWithDetails = data.map((expense: any) => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        created_at: expense.created_at,
        paid_by: expense.paid_by,
        paid_by_name: expense.users.name,
        splits: expense.expense_splits.map((split: any) => ({
          user_id: split.user_id,
          user_name: split.users.name,
          amount: split.amount,
        })),
        comments_count: expense.comments.length,
      }))

      setExpenses(expensesWithDetails)
    } catch (error) {
      toast({
        title: "Error fetching expenses",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchGroupData()
  }, [groupId, user])

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading group...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{groupName}</h1>
                <p className="text-sm text-gray-600">{members.length} members</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Members & Balances */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Receipt className="h-5 w-5" />
                  <span>Group Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">₹{totalExpenses.toFixed(2)}</p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Member Balances</h3>
                    <div className="space-y-3">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-sm">{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          <Badge
                            variant={member.balance > 0 ? "default" : member.balance < 0 ? "destructive" : "secondary"}
                          >
                            {member.balance > 0
                              ? `+₹${member.balance.toFixed(2)}`
                              : member.balance < 0
                                ? `-₹${Math.abs(member.balance).toFixed(2)}`
                                : "₹0.00"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expenses */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recent Expenses</h2>
              <Button onClick={() => setShowAddExpense(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>

            {expenses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
                  <p className="text-gray-600 mb-6">Add your first expense to get started</p>
                  <Button onClick={() => setShowAddExpense(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Expense
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} onExpenseUpdated={fetchExpenses} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <AddExpenseDialog
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        groupId={groupId}
        members={members}
        onExpenseAdded={() => {
          setShowAddExpense(false)
          fetchGroupData()
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
