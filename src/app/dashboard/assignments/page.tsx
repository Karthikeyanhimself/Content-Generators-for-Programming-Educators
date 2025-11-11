
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
  writeBatch,
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
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

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

  const submissionsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, `educators/${user.uid}/submissions`),
            orderBy('submittedAt', 'desc')
          )
        : null,
    [user, firestore]
  );
  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection(submissionsQuery);

  const handlePublishScore = async (submission: any) => {
    if (!firestore || !submission || !user) return;
    setIsPublishing(submission.id);

    try {
      const batch = writeBatch(firestore);

      // 1. Update the student's original assignment document
      const studentAssignmentRef = doc(firestore, 'users', submission.studentId, 'assignments', submission.originalAssignmentId);
      const studentUpdate = {
        score: Number(editableScore),
        feedback: editableFeedback,
        status: 'completed' as const,
      };
      batch.update(studentAssignmentRef, studentUpdate);
      
      // 2. Update the educator's denormalized submission record
      const educatorSubmissionRef = doc(firestore, `educators/${user.uid}/submissions`, submission.id);
      const educatorUpdate = {
        isPublished: true,
        score: Number(editableScore),
        feedback: editableFeedback,
      };
      batch.update(educatorSubmissionRef, educatorUpdate);

      await batch.commit().catch(error => {
        const permissionError = new FirestorePermissionError({
            path: `educators/${user.uid}/submissions/${submission.id}`,
            operation: 'write',
            requestResourceData: { studentUpdate, educatorUpdate }
        });
        errorEmitter.emit('permission-error', permissionError);
        // Re-throw to be caught by the outer try-catch
        throw permissionError;
      });

      toast({
        title: 'Score Published!',
        description: `${submission.studentName} can now see their results.`,
      });
      
      setEditingSubmission(null);

    } catch (error) {
       if (!(error instanceof FirestorePermissionError)) {
          console.error('Error publishing score:', error);
          toast({
            variant: 'destructive',
            title: 'Publishing Failed',
            description: 'Could not publish the score. Please check your connection and try again.',
          });
       }
    } finally {
      setIsPublishing(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
          <div>
              <h1 className="text-3xl font-bold font-headline">Student Submissions</h1>
              <p className="text-muted-foreground">Review submitted work and track published grades.</p>
          </div>
          <SidebarTrigger className="md:hidden"/>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
          <CardDescription>A complete list of all assignments submitted by your students.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSubmissions ? (
            <div className="flex justify-center items-center h-48">
              <Loader className="animate-spin text-muted-foreground" />
            </div>
          ) : submissions && submissions.length > 0 ? (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-6">
                {submissions.map((sub: any) => (
                  <Alert key={sub.id} className={sub.isPublished ? 'border-green-500/30' : ''}>
                    <FileCheck2 className="h-4 w-4" />
                    <AlertTitle className="flex justify-between items-center">
                      <span>{sub.dsaConcept} - {sub.studentName}</span>
                      <Badge variant={sub.isPublished ? 'secondary' : 'default'}>{sub.isPublished ? 'Published' : 'Pending'}</Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-2 text-sm">
                      Submitted on {sub.submittedAt ? format(sub.submittedAt.toDate(), 'PPP') : 'N/A'} &bull; AI Score: {sub.score}%
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
                                <div className="space-y-4 py-4">
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
                                      className="col-span-3 h-32"
                                      disabled={editingSubmission.isPublished}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Submitted Code</Label>
                                     <ScrollArea className="h-48 w-full rounded-md border p-4 bg-muted">
                                          <pre className="text-xs text-foreground whitespace-pre-wrap">
                                            <code>{editingSubmission.solutionCode}</code>
                                          </pre>
                                    </ScrollArea>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="ghost">Cancel</Button>
                                    </DialogClose>
                                    {!editingSubmission.isPublished && (
                                        <Button onClick={() => handlePublishScore(editingSubmission)} disabled={isPublishing === editingSubmission.id}>
                                        {isPublishing === editingSubmission.id ? (
                                            <>
                                            <Loader className="mr-2 h-4 w-4 animate-spin"/> Publishing...
                                            </>
                                        ) : 'Save & Publish'}
                                        </Button>
                                    )}
                                  </DialogFooter>
                                </div>
                              )}
                          </DialogContent>
                      </Dialog>
                    </div>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileCheck2 className="mx-auto h-12 w-12 mb-4"/>
                <h3 className="text-xl font-semibold">No Submissions Yet</h3>
                <p>When students submit their work, it will appear here for you to review.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
