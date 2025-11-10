'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
  
  export default function EducatorDashboard() {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Educator Dashboard</CardTitle>
            <CardDescription>
              Manage assignments, track student progress, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Welcome, Educator! This dashboard is under construction. Features for assignment creation and student tracking will be available here soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  