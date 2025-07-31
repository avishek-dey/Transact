"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  members: Member[]
  onExpenseAdded: () => void
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

export function AddExpenseDialog({ open, onOpenChange, groupId, members, onExpenseAdded }: AddExpenseDialogProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [paidBy, setPaidBy] = useState(user?.id || "")
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal")
  const [selectedMembers, setSelectedMembers] = useState<string[]>(members.map((m) => m.id))
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const description = formData.get("description") as string
    const category = formData.get("category") as string
    const date = formData.get("date") as string
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
      // Calculate splits
      let splits: Array<{ user_id: string; amount: number }> = []

      if (splitType === "equal") {
        const splitAmount = expenseAmount / selectedMembers.length
        splits = selectedMembers.map((memberId) => ({
          user_id: memberId,
          amount: splitAmount,
        }))
      } else {
        // Custom splits
        const totalCustom = selectedMembers.reduce((sum, memberId) => {
          return sum + (Number.parseFloat(customSplits[memberId]) || 0)
        }, 0)

        if (Math.abs(totalCustom - expenseAmount) > 0.01) {
          toast({
            title: "Split amounts don't match",
            description: `Split amounts (₹${totalCustom.toFixed(2)}) must equal the total amount (₹${expenseAmount.toFixed(2)})`,
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        splits = selectedMembers.map((memberId) => ({
          user_id: memberId,
          amount: Number.parseFloat(customSplits[memberId]) || 0,
        }))
      }

      // Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert([
          {
            group_id: groupId,
            paid_by: paidBy,
            description,
            amount: expenseAmount,
            category,
            date: date || new Date().toISOString().split("T")[0],
          },
        ])
        .select()
        .single()

      if (expenseError) throw expenseError

      // Create the splits
      const { error: splitsError } = await supabase.from("expense_splits").insert(
        splits.map((split) => ({
          expense_id: expense.id,
          user_id: split.user_id,
          amount: split.amount,
        })),
      )

      if (splitsError) throw splitsError

      toast({ title: "Expense added successfully!" })
      onExpenseAdded()

      // Reset form
      setAmount("")
      setPaidBy(user.id)
      setSplitType("equal")
      setSelectedMembers(members.map((m) => m.id))
      setCustomSplits({})
    } catch (error) {
      toast({
        title: "Error adding expense",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMemberToggle = (memberId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers([...selectedMembers, memberId])
    } else {
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId))
    }
  }

  const handleCustomSplitChange = (memberId: string, value: string) => {
    setCustomSplits({ ...customSplits, [memberId]: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>Add an expense and split it among group members</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="What was this expense for?" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue="general">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>

            {/* Paid By */}
            <div className="space-y-2">
              <Label>Paid by</Label>
              <RadioGroup value={paidBy} onValueChange={setPaidBy}>
                {members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={member.id} id={`payer-${member.id}`} />
                    <Label htmlFor={`payer-${member.id}`} className="flex items-center space-x-2 cursor-pointer">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Split Type */}
            <div className="space-y-2">
              <Label>Split type</Label>
              <RadioGroup value={splitType} onValueChange={(value: "equal" | "custom") => setSplitType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="equal" id="split-equal" />
                  <Label htmlFor="split-equal">Split equally</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="split-custom" />
                  <Label htmlFor="split-custom">Custom amounts</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Member Selection & Splits */}
            <div className="space-y-2">
              <Label>Split between</Label>
              <div className="space-y-3 max-h-48 overflow-y-auto border rounded-md p-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={(checked) => handleMemberToggle(member.id, checked as boolean)}
                      />
                      <Label htmlFor={`member-${member.id}`} className="flex items-center space-x-2 cursor-pointer">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                      </Label>
                    </div>
                    {selectedMembers.includes(member.id) && (
                      <div className="flex items-center space-x-2">
                        {splitType === "equal" ? (
                          <span className="text-sm text-gray-500">
                            ₹{amount ? (Number.parseFloat(amount) / selectedMembers.length).toFixed(2) : "0.00"}
                          </span>
                        ) : (
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-20 h-8"
                            value={customSplits[member.id] || ""}
                            onChange={(e) => handleCustomSplitChange(member.id, e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || selectedMembers.length === 0}>
              {isLoading ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
