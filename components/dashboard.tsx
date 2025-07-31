"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Users, Receipt, TrendingUp, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { CreateGroupDialog } from "./create-group-dialog"
import { GroupView } from "./group-view"

interface Group {
  id: string
  name: string
  description: string | null
  created_at: string
  member_count: number
  total_expenses: number
  your_balance: number
}

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchGroups()
    }
  }, [user])

  const fetchGroups = async () => {
    if (!user) return

    try {
      // Fetch groups where user is a member
      const { data: groupsData, error } = await supabase
        .from("group_members")
        .select(`
          group_id,
          groups (
            id,
            name,
            description,
            created_at
          )
        `)
        .eq("user_id", user.id)

      if (error) throw error

      // For each group, get member count and expense totals
      const groupsWithStats = await Promise.all(
        groupsData.map(async (item) => {
          const group = item.groups as any

          // Get member count
          const { count: memberCount } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id)

          // Get total expenses
          const { data: expenses } = await supabase.from("expenses").select("amount").eq("group_id", group.id)

          const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0

          // Calculate user's balance (simplified - you owe vs you're owed)
          const { data: splits } = await supabase
            .from("expense_splits")
            .select("amount, expenses!inner(paid_by)")
            .eq("user_id", user.id)
            .eq("expenses.group_id", group.id)

          const { data: paidExpenses } = await supabase
            .from("expenses")
            .select("amount")
            .eq("group_id", group.id)
            .eq("paid_by", user.id)

          const youOwe = splits?.reduce((sum, split) => sum + split.amount, 0) || 0
          const youPaid = paidExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0
          const yourBalance = youPaid - youOwe

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            created_at: group.created_at,
            member_count: memberCount || 0,
            total_expenses: totalExpenses,
            your_balance: yourBalance,
          }
        }),
      )

      setGroups(groupsWithStats)
    } catch (error) {
      console.error("Error fetching groups:", error)
    } finally {
      setLoading(false)
    }
  }

  if (selectedGroup) {
    return <GroupView groupId={selectedGroup} onBack={() => setSelectedGroup(null)} onGroupUpdated={fetchGroups} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">SplitSmart</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>{user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groups.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${groups.reduce((sum, group) => sum + group.total_expenses, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  groups.reduce((sum, group) => sum + group.your_balance, 0) >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                ${Math.abs(groups.reduce((sum, group) => sum + group.your_balance, 0)).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {groups.reduce((sum, group) => sum + group.your_balance, 0) >= 0 ? "You are owed" : "You owe"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Groups Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Groups</h2>
          <Button onClick={() => setShowCreateGroup(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
              <p className="text-gray-500 mb-4">Create your first group to start splitting expenses</p>
              <Button onClick={() => setShowCreateGroup(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedGroup(group.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{group.name}</span>
                    <Badge variant="secondary">{group.member_count} members</Badge>
                  </CardTitle>
                  {group.description && <CardDescription className="line-clamp-2">{group.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total expenses:</span>
                      <span className="font-medium">${group.total_expenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Your balance:</span>
                      <span className={`font-medium ${group.your_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {group.your_balance >= 0 ? "+" : "-"}${Math.abs(group.your_balance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onGroupCreated={() => {
          setShowCreateGroup(false)
          fetchGroups()
        }}
      />
    </div>
  )
}
