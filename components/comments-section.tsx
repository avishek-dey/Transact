"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  user_name: string
  user_avatar: string | null
}

interface CommentsSectionProps {
  expenseId: string
}

export function CommentsSection({ expenseId }: CommentsSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [expenseId])

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          users (
            name,
            avatar_url
          )
        `)
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: true })

      if (error) throw error

      const formattedComments = data.map((comment) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        user_name: (comment.users as any).name,
        user_avatar: (comment.users as any).avatar_url,
      }))

      setComments(formattedComments)
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("comments").insert([
        {
          expense_id: expenseId,
          user_id: user.id,
          content: newComment.trim(),
        },
      ])

      if (error) throw error

      setNewComment("")
      fetchComments()
    } catch (error) {
      toast({
        title: "Error adding comment",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading comments...</div>
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No comments yet</p>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={comment.user_avatar || undefined} />
                <AvatarFallback className="text-xs">{comment.user_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{comment.user_name}</span>
                  <span className="text-xs text-gray-500">{format(new Date(comment.created_at), "MMM d, h:mm a")}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 min-h-[60px] resize-none"
          rows={2}
        />
        <Button type="submit" size="sm" disabled={isSubmitting || !newComment.trim()} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
