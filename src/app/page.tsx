import {
  BrainCircuit,
  Palette,
  BotMessageSquare,
  Scaling,
  Users,
  GraduationCap,
  CheckCircle,
  BookOpenCheck,
  BarChart,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-image');

  const features = [
    {
      icon: Palette,
      title: 'For Educators: Creative Control',
      description:
        'Generate limitless programming scenarios from diverse themes like Sci-Fi or Fantasy. Craft the perfect assignments for your students.',
    },
    {
      icon: Scaling,
      title: 'For Educators: Adaptive Assignments',
      description:
        'Fine-tune problem difficulty and integrate specific DSA concepts to build targeted quizzes and challenges.',
    },
    {
      icon: BookOpenCheck,
      title: 'For Students: Guided Learning',
      description:
        'Tackle assignments with adaptive hints and detailed test case explanations. Master concepts, don’t just guess answers.',
    },
    {
      icon: BarChart,
      title: 'For Students: Dynamic Study Plans',
      description:
        'Receive a personalized study plan that evolves with you. Turn your weaknesses into strengths with targeted practice.',
    },
    {
      icon: Users,
      title: 'Role-Based Ecosystem',
      description:
        'A complete platform with dedicated dashboards and tools for both individual learning and classroom management.',
    },
    {
      icon: BrainCircuit,
      title: 'Powered by Generative AI',
      description:
        'Our cutting-edge AI generates high-quality, unique content, ensuring you never run out of practice material.',
    },
  ];

  return (
    <>
      <section className="w-full pt-24 md:pt-32 lg:pt-40 border-b border-border/50 bg-gradient-to-b from-background to-background/80">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                 <Badge variant="outline" className="border-primary/50 text-primary">Now with Generative AI</Badge>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl/none font-headline">
                  The Ultimate DSA Learning Platform
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  AlgoGenius empowers educators to create limitless, themed assignments and provides students with an adaptive, personalized path to mastering data structures and algorithms.
                </p>
              </div>
              <div className="flex flex-col gap-4 min-[400px]:flex-row">
                <Button size="lg" asChild>
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">Explore Features</Link>
                </Button>
              </div>
            </div>
            <div className="flex justify-center items-center">
              {heroImage && (
                <div className="relative w-full max-w-xl mx-auto">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"></div>
                    <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    data-ai-hint={heroImage.imageHint}
                    width={1200}
                    height={800}
                    className="rounded-xl object-cover aspect-[4/3] overflow-hidden relative"
                    />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="container px-4 md:px-6 mt-16">
            <div className="h-16"></div>
        </div>
      </section>

      <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                A New Era of Programming Education
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                AlgoGenius provides a complete ecosystem for both teaching and learning complex technical concepts.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:max-w-none lg:grid-cols-3 mt-12">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col gap-4">
                <div className="bg-primary/10 p-3 rounded-full w-min">
                    <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground">
                        {feature.description}
                    </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 border-t">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
              Simple, Transparent Pricing
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              Choose the plan that's right for you. Get started for free.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-lg gap-8 lg:max-w-4xl lg:grid-cols-2">
            <Card className="flex flex-col border-2 border-transparent hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-xl">Student</CardTitle>
                <CardDescription>
                  For individuals ready to master algorithms.
                </CardDescription>
                <div className="text-5xl font-bold pt-4">Free</div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Access and complete assignments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Adaptive hints & test cases
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Personal progress dashboard & study plan
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/signup">Sign Up as Student</Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="flex flex-col border-2 border-primary/80 relative overflow-hidden">
                <Badge className="absolute top-4 right-4">Most Popular</Badge>
              <CardHeader>
                <CardTitle className="text-xl">Educator</CardTitle>
                <CardDescription>
                  For professionals shaping the next generation of engineers.
                </CardDescription>
                <div className="text-5xl font-bold pt-4">
                  $29<span className="text-xl font-normal text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    AI-powered scenario generator
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Create and manage assignments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Student progress tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Classroom management tools
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild>
                  <Link href="/signup">Start Educator Trial</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 border-t">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
              Ready to Level Up?
            </h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Create your free account and start your journey with AlgoGenius today.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-2">
            <Button size="lg" className="w-full" asChild>
              <Link href="/signup">Create Your Free Account</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
