
'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { format, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, BookCopy, Clock, Bot } from 'lucide-react';
import Link from 'next/link';


export default function StudentAssignments() {
    const { user } = useUser();
    const firestore = useFirestore();

    const assignmentsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, `users/${user.uid}/assignments`),
            where('status', 'in', ['assigned', 'submitted', 'completed']),
            orderBy('dueDate', 'asc')
          )
        : null,
    [firestore, user]
    );
    const { data: assignments, isLoading: assignmentsLoading } = useCollection(assignmentsQuery);

    const getStatusVariant = (status: string, dueDate: any) => {
        if (isPast(dueDate?.toDate()) && status === 'assigned') return 'destructive';
        switch (status) {
            case 'assigned':
                return 'default';
            case 'submitted':
                return 'outline';
            case 'completed':
                return 'secondary';
            default:
                return 'default';
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                 {assignmentsLoading ? (
                     <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-center">
                        <Loader className="h-8 w-8 text-muted-foreground animate-spin"/>
                        <p className="text-muted-foreground text-sm">Loading assignments...</p>
                    </div>
                 ) : assignments && assignments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assignments.map((assignment: any) => {
                            const pastDue = isPast(assignment.dueDate.toDate()) && assignment.status === 'assigned';
                            return (
                            <Card key={assignment.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-xl">{assignment.dsaConcept}</CardTitle>
                                        {assignment.isAutonomouslyGenerated && (
                                            <Badge variant="outline" className="border-primary/50 text-primary"><Bot className="h-3 w-3 mr-1.5"/> AI</Badge>
                                        )}
                                    </div>
                                    <CardDescription>from {assignment.educatorId === 'SYSTEM' ? 'AI Agent' : 'Educator'}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 flex-1">
                                     <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Due Date</span>
                                        <span className={pastDue ? 'text-destructive font-medium' : ''}>{assignment.dueDate ? format(assignment.dueDate.toDate(), 'PPP p') : 'N/A'}</span>
                                    </div>
                                     <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge variant={getStatusVariant(assignment.status, assignment.dueDate)} className="capitalize">
                                            {pastDue ? 'Past Due' : assignment.status}
                                        </Badge>
                                    </div>
                                    {assignment.status === 'completed' && (
                                         <div className="flex items-center justify-between text-sm font-medium pt-2">
                                            <span className="text-muted-foreground">Score</span>
                                            {assignment.score !== undefined ? (
                                                 <span className={assignment.score > 75 ? "text-green-500" : "text-amber-500"}>{assignment.score}%</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Awaiting publication</span>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full" disabled={pastDue && assignment.status !== 'completed'}>
                                        <Link href={`/dashboard/assignment/${assignment.id}`}>
                                          {pastDue && assignment.status !== 'completed' ? <><Clock className="mr-2 h-4 w-4"/>Past Due</> : (assignment.status === 'assigned' ? 'Start Assignment' : 'View Submission')}
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        )})}
                    </div>
                 ) : (
                    <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-center border-2 border-dashed rounded-lg">
                        <BookCopy className="h-8 w-8 text-muted-foreground"/>
                        <h3 className="text-lg font-semibold text-foreground">
                            No Assignments Yet
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            Your assignments from educators will appear here.
                        </p>
                    </div>
                 )}
            </CardContent>
        </Card>
    )
}
