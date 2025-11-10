'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-solution-approach-tips.ts';
import '@/ai/flows/generate-themed-scenario.ts';
import '@/ai/flows/generate-quiz-questions.ts';
import '@/ai/flows/generate-study-plan.ts';
import '@/ai/flows/assess-code-submission.ts';
import '@/ai/flows/update-learning-goals.ts';

    