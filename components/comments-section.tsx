"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  user_name: string
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

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          users!comments_user_id_fkey(name)
        `)
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: true })

      if (error) throw error

      const commentsWithUserNames = data.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        user_name: comment.users.name,
      }))

      setComments(commentsWithUserNames)
    } catch (error) {
      toast({
        title: "Error fetching comments",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [expenseId])

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
    return <div className="text-center py-4 text-gray-500">Loading comments...</div>
  }

  return (
    <div className="space-y-4">
      {comments.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{comment.user_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium">{comment.user_name}</span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
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
          className="flex-1 min-h-[80px]"
          disabled={isSubmitting}
        />
        <Button type="submit" size="sm" disabled={isSubmitting || !newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
