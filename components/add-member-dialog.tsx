"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  onMemberAdded: () => void
}

export function AddMemberDialog({ open, onOpenChange, groupId, onMemberAdded }: AddMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const name = formData.get("name") as string

    try {
      // Check if user exists
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single()

      let userId: string

      if (userError && userError.code === "PGRST116") {
        // User doesn't exist, create them
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert([
            {
              email,
              name,
            },
          ])
          .select()
          .single()

        if (createError) throw createError
        userId = newUser.id
      } else if (userError) {
        throw userError
      } else {
        userId = existingUser.id
      }

      // Check if user is already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .single()

      if (existingMember) {
        toast({
          title: "User already in group",
          description: "This user is already a member of this group",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Add user to group
      const { error: addMemberError } = await supabase.from("group_members").insert([
        {
          group_id: groupId,
          user_id: userId,
        },
      ])

      if (addMemberError) throw addMemberError

      toast({ title: "Member added successfully!" })
      onMemberAdded()
    } catch (error) {
      toast({
        title: "Error adding member",
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
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Add a new member to this group. If they don't have an account, we'll create one for them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="Enter their full name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="Enter their email address" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
