import {
  BrainCircuit,
  Palette,
  BotMessageSquare,
  Scaling,
  Users,
  GraduationCap,
  CheckCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const featureImage = PlaceHolderImages.find(
    (img) => img.id === 'feature-smart-test-cases'
  );
  const avatar1 = PlaceHolderImages.find(
    (img) => img.id === 'testimonial-avatar-1'
  );
  const avatar2 = PlaceHolderImages.find(
    (img) => img.id === 'testimonial-avatar-2'
  );
  const avatar3 = PlaceHolderImages.find(
    (img) => img.id === 'testimonial-avatar-3'
  );

  const features = [
    {
      icon: Palette,
      title: 'Themed Scenario Generation',
      description:
        'Engage with AI-generated problems from themes like Sci-Fi, Fantasy, and more to make learning fun.',
    },
    {
      icon: Scaling,
      title: 'Adaptive Difficulty & Hints',
      description:
        'Adjust problem difficulty with a simple slider and get smart hints when you are stuck.',
    },
    {
      icon: BotMessageSquare,
      title: 'Smart Test Case Generation',
      description:
        'Visualize test cases, understand edge cases, and even create your own with our smart generator.',
    },
    {
      icon: BrainCircuit,
      title: 'Integrated Learning',
      description:
        'See time/space complexity, recognize patterns, and find similar problems on LeetCode.',
    },
    {
      icon: Users,
      title: 'Role-Based Dashboards',
      description:
        'Dedicated dashboards for students to track progress and for educators to manage assignments.',
    },
    {
      icon: GraduationCap,
      title: 'Educator & Student Roles',
      description:
        'A complete platform for both individual learning and classroom environments.',
    },
  ];

  const testimonials = [
    {
      name: 'Alex Johnson',
      role: 'Student',
      text: 'AlgoGenius made learning data structures feel like a game. The themed problems are so much more engaging than standard textbook questions!',
      avatar: avatar1,
    },
    {
      name: 'Dr. Sarah Lee',
      role: 'Educator',
      text: 'The educator dashboard is a lifesaver. I can easily create assignments and track my students\' progress in real-time. Highly recommended.',
      avatar: avatar2,
    },
    {
      name: 'Maria Garcia',
      role: 'Student',
      text: 'The smart hints and test case explanations helped me finally understand recursion. I feel so much more confident in my coding interviews.',
      avatar: avatar3,
    },
  ];

  return (
    <>
      <section className="w-full pt-16 md:pt-24 lg:pt-32 bg-card border-b">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none font-headline">
                  Unlock Your Coding Potential with AlgoGenius
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Master data structures and algorithms with AI-powered, themed
                  scenarios that make learning effective and fun.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
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
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  data-ai-hint={heroImage.imageHint}
                  width={1200}
                  height={800}
                  className="rounded-xl object-cover aspect-[3/2] overflow-hidden"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <Badge>Core Features</Badge>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                A Smarter Way to Learn
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                AlgoGenius is packed with features designed to accelerate your
                learning, from AI-generated content to detailed performance
                analytics.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:max-w-none lg:grid-cols-3 mt-12">
            {features.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        id="testimonials"
        className="w-full py-12 md:py-24 lg:py-32 bg-card"
      >
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
              Loved by Students and Educators
            </h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Hear what our users have to say about their experience with
              AlgoGenius.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-6 pt-8 lg:grid-cols-3 lg:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <p className="mb-4 text-muted-foreground">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    {testimonial.avatar && (
                      <Avatar>
                        <AvatarImage
                          src={testimonial.avatar.imageUrl}
                          alt={testimonial.avatar.description}
                          data-ai-hint={testimonial.avatar.imageHint}
                        />
                        <AvatarFallback>
                          {testimonial.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
              Simple, Transparent Pricing
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              Choose the plan that's right for you. Get started for free.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-lg gap-8 lg:max-w-4xl lg:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Student</CardTitle>
                <CardDescription>
                  For individuals ready to master algorithms.
                </CardDescription>
                <div className="text-4xl font-bold pt-2">Free</div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Access to all themed scenarios
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Adaptive hints
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Personal progress dashboard
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild>
                  <Link href="/signup">Sign Up as Student</Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="flex flex-col border-primary">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Educator</CardTitle>
                  <Badge>Pro</Badge>
                </div>
                <CardDescription>
                  For professionals shaping the next generation of engineers.
                </CardDescription>
                <div className="text-4xl font-bold pt-2">
                  $29<span className="text-xl font-normal">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    All Student features, plus:
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

      <section className="w-full py-12 md:py-24 lg:py-32 bg-card">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
              Ready to Level Up Your Skills?
            </h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Create an account and start your journey with AlgoGenius today.
              It's free to get started.
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
