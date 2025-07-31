"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

interface EditExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense
  onExpenseUpdated: () => void
}

const categories = [
  "general",
  "food",
  "transportation",
  "accommodation",
  "entertainment",
  "utilities",
  "shopping",
  "other",
]

export function EditExpenseDialog({ open, onOpenChange, expense, onExpenseUpdated }: EditExpenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [description, setDescription] = useState(expense.description)
  const [amount, setAmount] = useState(expense.amount.toString())
  const [category, setCategory] = useState(expense.category)
  const [date, setDate] = useState(expense.date)

  useEffect(() => {
    setDescription(expense.description)
    setAmount(expense.amount.toString())
    setCategory(expense.category)
    setDate(expense.date)
  }, [expense])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const expenseAmount = Number.parseFloat(amount)

    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      // Update the expense
      const { error: expenseError } = await supabase
        .from("expenses")
        .update({
          description,
          amount: expenseAmount,
          category,
          date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", expense.id)

      if (expenseError) throw expenseError

      // If amount changed, update splits proportionally
      if (expenseAmount !== expense.amount) {
        const ratio = expenseAmount / expense.amount

        const updatedSplits = expense.splits.map((split) => ({
          expense_id: expense.id,
          user_id: split.user_id,
          amount: split.amount * ratio,
        }))

        // Delete existing splits
        const { error: deleteError } = await supabase.from("expense_splits").delete().eq("expense_id", expense.id)

        if (deleteError) throw deleteError

        // Insert updated splits
        const { error: splitsError } = await supabase.from("expense_splits").insert(updatedSplits)

        if (splitsError) throw splitsError
      }

      toast({ title: "Expense updated successfully!" })
      onExpenseUpdated()
    } catch (error) {
      toast({
        title: "Error updating expense",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>Make changes to this expense</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount ($)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
