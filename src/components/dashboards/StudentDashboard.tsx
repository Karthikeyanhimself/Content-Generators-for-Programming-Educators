'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookOpenCheck } from 'lucide-react';

export default function StudentDashboard() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Student Dashboard</CardTitle>
          <CardDescription>
            View assignments, track your progress, and access your study plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted bg-background/50 p-12 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <BookOpenCheck className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No Assignments Yet</h3>
            <p className="text-muted-foreground">
              Your assignments from educators will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
