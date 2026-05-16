import { useListQuizQuestions, getListQuizQuestionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, HelpCircle } from "lucide-react";

export default function Quiz() {
  const { data: questions, isLoading } = useListQuizQuestions(
    { query: { queryKey: getListQuizQuestionsQueryKey() } }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Loyalty Quiz</h1>
          <p className="text-muted-foreground mt-1">Manage questions for customer rewards.</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Question</Button>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8">
        <h2 className="font-bold text-lg mb-2 text-primary flex items-center">
          <HelpCircle className="h-5 w-5 mr-2" />
          How the Quiz Works
        </h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
          <li>First-time visitors get an automatic 40% discount (no quiz required).</li>
          <li>Repeat visitors take the quiz to earn their discount.</li>
          <li>The discount percentage is calculated based on their score.</li>
        </ul>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {questions?.map((q, idx) => (
            <Card key={q.id} className={!q.active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex justify-between">
                  <CardTitle className="text-lg flex items-start gap-2">
                    <span className="text-muted-foreground">Q{idx + 1}.</span> {q.question}
                  </CardTitle>
                  <Badge variant={q.active ? "default" : "secondary"}>
                    {q.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {q.options.map((opt, optIdx) => (
                    <div 
                      key={optIdx} 
                      className={`p-3 rounded-md text-sm border ${
                        q.correctAnswer === optIdx 
                          ? 'bg-green-50 border-green-200 font-medium text-green-900' 
                          : 'bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}. {opt}
                      {q.correctAnswer === optIdx && <span className="ml-2 text-green-600 text-xs">(Correct)</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {questions?.length === 0 && (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              No quiz questions found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
