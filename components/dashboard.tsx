"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Receipt, LogOut } from "lucide-react"
import { CreateGroupDialog } from "./create-group-dialog"
import { GroupView } from "./group-view"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

interface Group {
  id: string
  name: string
  description: string | null
  created_at: string
  member_count: number
  total_expenses: number
  user_balance: number
}

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchGroups = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          description,
          created_at,
          group_members!inner(user_id),
          expenses(amount)
        `)
        .eq("group_members.user_id", user.id)

      if (error) throw error

      // Calculate stats for each group
      const groupsWithStats = await Promise.all(
        data.map(async (group: any) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id)

          // Calculate user balance for this group
          const { data: balanceData } = await supabase.rpc("calculate_user_balance", {
            p_user_id: user.id,
            p_group_id: group.id,
          })

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            created_at: group.created_at,
            member_count: memberCount || 0,
            total_expenses: group.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0),
            user_balance: balanceData || 0,
          }
        }),
      )

      setGroups(groupsWithStats)
    } catch (error) {
      toast({
        title: "Error fetching groups",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      toast({
        title: "Error signing out",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    }
  }

  if (selectedGroup) {
    return <GroupView groupId={selectedGroup} onBack={() => setSelectedGroup(null)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">SplitSmart</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700">{user?.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Your Groups</h2>
            <p className="text-gray-600 mt-1">Manage your expense groups and track spending</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>

        {isLoading ? (
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
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-600 mb-6">Create your first group to start splitting expenses</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedGroup(group.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{group.name}</span>
                    <Badge
                      variant={
                        group.user_balance > 0 ? "default" : group.user_balance < 0 ? "destructive" : "secondary"
                      }
                    >
                      {group.user_balance > 0
                        ? `+₹${group.user_balance.toFixed(2)}`
                        : group.user_balance < 0
                          ? `-₹${Math.abs(group.user_balance).toFixed(2)}`
                          : "₹0.00"}
                    </Badge>
                  </CardTitle>
                  {group.description && <CardDescription>{group.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{group.member_count} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Receipt className="h-4 w-4" />
                      <span>₹{group.total_expenses.toFixed(2)} total</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onGroupCreated={() => {
          setShowCreateDialog(false)
          fetchGroups()
        }}
      />
    </div>
  )
}
