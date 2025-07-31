"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { CommentsSection } from "./comments-section"
import { EditExpenseDialog } from "./edit-expense-dialog"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

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

interface ExpenseCardProps {
  expense: Expense
  onExpenseUpdated: () => void
}

export function ExpenseCard({ expense, onExpenseUpdated }: ExpenseCardProps) {
  const { user } = useAuth()
  const [showDetails, setShowDetails] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!user || !confirm("Are you sure you want to delete this expense?")) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", expense.id)

      if (error) throw error

      toast({ title: "Expense deleted successfully!" })
      onExpenseUpdated()
    } catch (error) {
      toast({
        title: "Error deleting expense",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const canEdit = user?.id === expense.paid_by

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-semibold text-lg">{expense.description}</h3>
                <Badge variant="secondary" className="text-xs">
                  {expense.category}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Paid by {expense.paid_by_name}</span>
                <span>•</span>
                <span>{format(new Date(expense.date), "MMM d, yyyy")}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">₹{expense.amount.toFixed(2)}</div>
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {expense.comments_count}
                </Button>
                {canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditDialog(true)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {expense.splits.slice(0, 3).map((split) => (
                <Avatar key={split.user_id} className="h-6 w-6 border-2 border-white">
                  <AvatarFallback className="text-xs">{split.user_name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
              {expense.splits.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-gray-600">+{expense.splits.length - 3}</span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="text-gray-500">
              {showDetails ? (
                <>
                  Hide details <ChevronUp className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Show details <ChevronDown className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {showDetails && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Split details:</h4>
                {expense.splits.map((split) => (
                  <div key={split.user_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">{split.user_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{split.user_name}</span>
                    </div>
                    <span className="font-medium">₹{split.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {showComments && (
            <>
              <Separator className="my-4" />
              <CommentsSection expenseId={expense.id} />
            </>
          )}
        </CardContent>
      </Card>

      <EditExpenseDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        expense={expense}
        onExpenseUpdated={() => {
          setShowEditDialog(false)
          onExpenseUpdated()
        }}
      />
    </>
  )
}
