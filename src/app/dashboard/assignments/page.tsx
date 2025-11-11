
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader, Edit, FileCheck2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function AssignmentsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<any | null>(null);
  const [editableScore, setEditableScore] = useState<number | string>('');
  const [editableFeedback, setEditableFeedback] = useState<string>('');

  useEffect(() => {
    if (editingSubmission) {
      setEditableScore(editingSubmission.score);
      setEditableFeedback(editingSubmission.feedback);
    }
  }, [editingSubmission]);

  const pendingQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, `educators/${user.uid}/submissions`),
            where('isPublished', '==', false),
            orderBy('submittedAt', 'desc')
          )
        : null,
    [user, firestore]
  );
  const { data: pendingSubmissions, isLoading: isLoadingPending } = useCollection(pendingQuery);

  const gradedQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, `educators/${user.uid}/submissions`),
            where('isPublished', '==', true),
            orderBy('submittedAt', 'desc')
          )
        : null,
    [user, firestore]
  );
  const { data: gradedSubmissions, isLoading: isLoadingGraded } = useCollection(gradedQuery);

  const handlePublishScore = async (submission: any) => {
    if (!firestore || !submission || !user) return;
    setIsPublishing(submission.id);

    try {
      const studentAssignmentRef = doc(firestore, 'users', submission.studentId, 'assignments', submission.originalAssignmentId);
      await updateDoc(studentAssignmentRef, {
        score: Number(editableScore),
        feedback: editableFeedback,
        status: 'completed',
      });

      const educatorSubmissionRef = doc(firestore, `educators/${user.uid}/submissions/${submission.id}`);
      await updateDoc(educatorSubmissionRef, {
        isPublished: true,
        score: Number(editableScore),
        feedback: editableFeedback,
      });

      toast({
        title: 'Score Published!',
        description: `${submission.studentName} can now see their results.`,
      });
      
      setEditingSubmission(null);

    } catch (error) {
      console.error('Error publishing score:', error);
      toast({
        variant: 'destructive',
        title: 'Publishing Failed',
        description: 'Could not publish the score. Please check permissions and try again.',
      });
    } finally {
      setIsPublishing(null);
    }
  };

  const SubmissionList = ({ submissions, isLoading, title, emptyMessage }: any) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader className="animate-spin text-muted-foreground" />
          </div>
        ) : submissions && submissions.length > 0 ? (
          <ScrollArea className="h-96">
            <div className="space-y-4 pr-6">
              {submissions.map((sub: any) => (
                <Alert key={sub.id} className={sub.isPublished ? 'border-green-500/30' : ''}>
                  <FileCheck2 className="h-4 w-4" />
                  <AlertTitle className="flex justify-between items-center">
                    <span>{sub.dsaConcept} - {sub.studentName}</span>
                    <Badge variant={sub.isPublished ? 'secondary' : 'default'}>{sub.isPublished ? 'Published' : 'Pending'}</Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2 text-sm">
                    Submitted on {format(sub.submittedAt.toDate(), 'PPP')} &bull; Score: {sub.score}%
                  </AlertDescription>
                  <div className="mt-4">
                    <Dialog onOpenChange={(isOpen) => !isOpen && setEditingSubmission(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setEditingSubmission(sub)}>
                          <Edit className="mr-2 h-3 w-3" />
                          {sub.isPublished ? 'View Submission' : 'Review & Publish'}
                        </Button>
                      </DialogTrigger>
                       <DialogContent className="sm:max-w-[625px]">
                          <DialogHeader>
                            <DialogTitle>Review Submission</DialogTitle>
                            <DialogDescription>
                              Review the student's code, adjust the AI-generated feedback and score if needed, and publish the results.
                            </DialogDescription>
                          </DialogHeader>
                          {editingSubmission && (
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Student</Label>
                                <Input value={editingSubmission.studentName} disabled className="col-span-3" />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="score" className="text-right">Score</Label>
                                <Input
                                  id="score"
                                  type="number"
                                  value={editableScore}
                                  onChange={(e) => setEditableScore(e.target.value)}
                                  className="col-span-1"
                                  disabled={editingSubmission.isPublished}
                                />
                              </div>
                              <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="feedback" className="text-right pt-2">Feedback</Label>
                                <Textarea
                                  id="feedback"
                                  value={editableFeedback}
                                  onChange={(e) => setEditableFeedback(e.target.value)}
                                  className="col-span-3 h-48"
                                  disabled={editingSubmission.isPublished}
                                />
                              </div>
                              <div>
                                <Label>Submitted Code</Label>
                                <pre className="bg-muted p-4 rounded-md text-xs text-foreground overflow-x-auto mt-2">
                                  <code>{editingSubmission.solutionCode}</code>
                                </pre>
                              </div>
                            </div>
                          )}
                          <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="ghost">Cancel</Button>
                            </DialogClose>
                            {!editingSubmission?.isPublished && (
                                <Button onClick={() => handlePublishScore(editingSubmission)} disabled={isPublishing === editingSubmission?.id}>
                                {isPublishing === editingSubmission?.id ? (
                                    <>
                                    <Loader className="mr-2 h-4 w-4 animate-spin"/> Publishing...
                                    </>
                                ) : 'Save & Publish'}
                                </Button>
                            )}
                          </DialogFooter>
                        </DialogContent>
                    </Dialog>
                  </div>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-8">
          <div>
              <h1 className="text-3xl font-bold font-headline">Manage Assignments</h1>
              <p className="text-muted-foreground">Review submitted work and track published grades.</p>
          </div>
          <SidebarTrigger className="md:hidden"/>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <SubmissionList
          submissions={pendingSubmissions}
          isLoading={isLoadingPending}
          title="Pending Review"
          emptyMessage="No submissions are currently awaiting review."
        />
        <SubmissionList
          submissions={gradedSubmissions}
          isLoading={isLoadingGraded}
          title="Graded Submissions"
          emptyMessage="No assignments have been graded yet."
        />
      </div>
    </>
  );
}
