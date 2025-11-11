
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BrainCircuit, BookCopy, Users, ArrowRight } from 'lucide-react';


export default function EducatorDashboard({ userProfile }: { userProfile: any}) {
  
  const features = [
    {
      title: "Generate Scenarios",
      description: "Use AI to create new coding challenges.",
      href: "/dashboard/scenarios",
      icon: BrainCircuit,
    },
    {
      title: "Manage Assignments",
      description: "Create, assign, and review student work.",
      href: "/dashboard/assignments",
      icon: BookCopy,
    },
    {
      title: "Oversee Students",
      description: "View student progress and manage profiles.",
      href: "/dashboard/students",
      icon: Users,
    }
  ];

  return (
    <div>
        <h2 className="text-2xl font-bold mb-6">Educator Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
                <Card key={feature.title} className="flex flex-col">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle>{feature.title}</CardTitle>
                            <CardDescription>{feature.description}</CardDescription>
                        </div>
                        <feature.icon className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                    <CardFooter className="mt-auto">
                        <Button variant="ghost" asChild className="text-primary hover:text-primary">
                           <Link href={feature.href}>
                                Go to {feature.title} <ArrowRight className="ml-2 h-4 w-4" />
                           </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    </div>
  );
}
