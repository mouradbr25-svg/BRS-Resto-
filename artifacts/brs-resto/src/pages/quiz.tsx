import { useState } from "react";
import {
  useListQuizQuestions, getListQuizQuestionsQueryKey,
  useCreateQuizQuestion, useUpdateQuizQuestion, useDeleteQuizQuestion,
  useListReviews, getListReviewsQueryKey,
  useUpdateReview, useDeleteReview,
} from "@workspace/api-client-react";
import type { QuizQuestion, Review } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, HelpCircle, Info } from "lucide-react";

// ─── Question Dialog ──────────────────────────────────────────────────────────
function QuestionDialog({ question, open, onClose }: { question?: QuizQuestion; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createQ = useCreateQuizQuestion();
  const updateQ = useUpdateQuizQuestion();
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      question: question?.question ?? "",
      opt0: question?.options?.[0] ?? "",
      opt1: question?.options?.[1] ?? "",
      opt2: question?.options?.[2] ?? "",
      opt3: question?.options?.[3] ?? "",
      correctAnswer: question?.correctAnswer ?? 0,
      active: question?.active ?? true,
    },
  });

  const correctAnswer = watch("correctAnswer");

  const onSubmit = (values: any) => {
    const options = [values.opt0, values.opt1, values.opt2, values.opt3].filter(Boolean);
    const payload = {
      question: values.question,
      options,
      correctAnswer: parseInt(String(values.correctAnswer), 10),
      active: values.active,
    };

    if (question) {
      updateQ.mutate(
        { id: question.id, data: payload },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListQuizQuestionsQueryKey() });
            toast({ title: "Question updated" });
            onClose();
          },
        }
      );
    } else {
      createQ.mutate(
        { data: payload },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListQuizQuestionsQueryKey() });
            toast({ title: "Question added" });
            reset();
            onClose();
          },
        }
      );
    }
  };

  const options = [watch("opt0"), watch("opt1"), watch("opt2"), watch("opt3")];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{question ? "Edit Question" : "Add Question"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Question text</Label>
            <Input {...register("question", { required: true })} placeholder="What is the capital of Algeria?" data-testid="input-question" />
          </div>
          <div className="space-y-2">
            <Label>Answer Options <span className="text-muted-foreground text-xs">(click to mark correct)</span></Label>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setValue("correctAnswer", i)}
                  className={`h-7 w-7 rounded-full border-2 text-xs font-bold flex-shrink-0 transition-colors ${
                    correctAnswer === i
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground/30 text-muted-foreground hover:border-green-400"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <Input
                  {...register(`opt${i}` as any)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className={correctAnswer === i ? "border-green-300 bg-green-50/30" : ""}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Green circle = correct answer</p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={watch("active")}
              onCheckedChange={v => setValue("active", v)}
            />
            <Label>Active (shown in quiz)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createQ.isPending || updateQ.isPending} data-testid="button-save-question">
              {question ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

// ─── Reviews Tab ──────────────────────────────────────────────────────────────
function ReviewsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: reviews, isLoading } = useListReviews({ query: { queryKey: getListReviewsQueryKey() } });
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const togglePublic = (review: Review) => {
    updateReview.mutate(
      { id: review.id, data: { isPublic: !review.isPublic } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListReviewsQueryKey() }) }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteReview.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListReviewsQueryKey() });
          toast({ title: "Review removed" });
          setDeleteTarget(null);
        },
      }
    );
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Average Rating</p>
          <p className="text-3xl font-bold">{avgRating}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Reviews</p>
          <p className="text-3xl font-bold">{reviews?.length ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Public</p>
          <p className="text-3xl font-bold">{reviews?.filter(r => r.isPublic).length ?? 0}</p>
        </div>
      </div>

      {reviews?.length === 0 && (
        <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          No reviews yet. They appear here after customers complete the post-quiz review.
        </div>
      )}

      <div className="space-y-3">
        {reviews?.map(review => (
          <Card key={review.id} className={!review.isPublic ? "opacity-70 border-dashed" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={review.rating} />
                    <Badge variant={review.isPublic ? "default" : "secondary"} className="text-xs">
                      {review.isPublic ? "Public" : "Private"}
                    </Badge>
                    {review.customerName && (
                      <span className="text-xs text-muted-foreground">{review.customerName}</span>
                    )}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {new Date(review.createdAt).toLocaleDateString("en-DZ", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => togglePublic(review)}
                    title={review.isPublic ? "Set to Private" : "Set to Public"}
                  >
                    {review.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:text-destructive"
                    onClick={() => setDeleteTarget(review)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the review. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Quiz Page ───────────────────────────────────────────────────────────
export default function Quiz() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [qDialog, setQDialog] = useState<{ open: boolean; item?: QuizQuestion }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<QuizQuestion | null>(null);

  const { data: questions, isLoading } = useListQuizQuestions({
    query: { queryKey: getListQuizQuestionsQueryKey() },
  });
  const deleteQ = useDeleteQuizQuestion();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteQ.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListQuizQuestionsQueryKey() });
          toast({ title: "Question removed" });
          setDeleteTarget(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Quiz & Reviews</h1>
        <p className="text-muted-foreground mt-1">Manage gamified loyalty quiz and customer feedback.</p>
      </div>

      <Tabs defaultValue="questions">
        <TabsList className="mb-4">
          <TabsTrigger value="questions">
            <HelpCircle className="h-4 w-4 mr-2" /> Questions
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Star className="h-4 w-4 mr-2" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Info className="h-4 w-4 mr-2" /> Reward Rules
          </TabsTrigger>
        </TabsList>

        {/* ── Questions Tab ── */}
        <TabsContent value="questions" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{questions?.length ?? 0} questions</p>
            <Button onClick={() => setQDialog({ open: true })} data-testid="button-add-question">
              <Plus className="h-4 w-4 mr-1.5" /> Add Question
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}</div>
          ) : (
            <div className="space-y-4">
              {questions?.map((q, idx) => (
                <Card key={q.id} className={!q.active ? "opacity-60" : ""} data-testid={`card-question-${q.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base font-semibold leading-snug flex items-start gap-2">
                        <span className="text-muted-foreground font-normal text-sm mt-0.5">Q{idx + 1}.</span>
                        {q.question}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant={q.active ? "default" : "secondary"} className="text-xs">
                          {q.active ? "Active" : "Inactive"}
                        </Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQDialog({ open: true, item: q })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteTarget(q)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`px-3 py-2 rounded-md text-sm border ${
                            q.correctAnswer === oi
                              ? "bg-green-50 border-green-300 font-medium text-green-900"
                              : "bg-muted/40 border-border text-muted-foreground"
                          }`}
                        >
                          <span className="font-semibold mr-1.5">{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                          {q.correctAnswer === oi && <span className="ml-2 text-green-600 text-xs">(correct)</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {questions?.length === 0 && (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                  No questions yet. Add some to enable the loyalty quiz.
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Reviews Tab ── */}
        <TabsContent value="reviews">
          <ReviewsTab />
        </TabsContent>

        {/* ── Rules Tab ── */}
        <TabsContent value="rules">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg">Gamified Reward System Rules</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="font-semibold text-primary">Perfect Score (5/5) Required for Discount</p>
                  <p className="text-muted-foreground mt-0.5">Only a perfect quiz score earns a monetary discount.</p>
                </div>
                <div className="divide-y border rounded-lg overflow-hidden">
                  {[
                    { condition: "5/5 — First-time visitor", reward: "40% Discount", cls: "text-green-700 font-bold" },
                    { condition: "5/5 — Order ≥ 2,000 DZD", reward: "40% Discount", cls: "text-green-700 font-bold" },
                    { condition: "5/5 — Order 1,000–2,000 DZD", reward: "30% Discount", cls: "text-blue-700 font-semibold" },
                    { condition: "5/5 — Order 500–1,000 DZD", reward: "25% Discount", cls: "text-blue-600 font-semibold" },
                    { condition: "5/5 — Order < 500 DZD", reward: "15% Discount", cls: "text-muted-foreground" },
                    { condition: "3/5 or 4/5", reward: "Free Small Juice", cls: "text-amber-700" },
                    { condition: "Under 3/5", reward: "No reward", cls: "text-muted-foreground" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">{row.condition}</span>
                      <span className={row.cls}>{row.reward}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  Ingredient stock is automatically deducted when an order moves to "Preparing" status.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <QuestionDialog open={qDialog.open} question={qDialog.item} onClose={() => setQDialog({ open: false })} />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Question</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this question from the quiz? Active orders using it will be unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
