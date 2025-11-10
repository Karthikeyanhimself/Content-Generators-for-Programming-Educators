'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
  
  export default function StudentDashboard() {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Student Dashboard</CardTitle>
            <CardDescription>
              View assignments, track your progress, and access your study plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Welcome, Student! Your assignments and progress tracking will be available here soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  