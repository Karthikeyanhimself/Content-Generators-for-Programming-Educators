'use server';
/**
 * @fileOverview Defines a Genkit flow for finding a student by their email address.
 * This flow is designed to be called by an educator to securely look up a student's
 * profile information before adding them to a roster.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already done
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const FindStudentInputSchema = z.object({
  email: z.string().email().describe('The email address of the student to find.'),
});
export type FindStudentInput = z.infer<typeof FindStudentInputSchema>;

const FindStudentOutputSchema = z.object({
  uid: z.string().optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  error: z.string().optional(),
});
export type FindStudentOutput = z.infer<typeof FindStudentOutputSchema>;


const findStudentByEmailFlow = ai.defineFlow(
  {
    name: 'findStudentByEmailFlow',
    inputSchema: FindStudentInputSchema,
    outputSchema: FindStudentOutputSchema,
  },
  async ({ email }) => {
    try {
      // 1. Look up the UID from the users-by-email collection
      const emailLookupRef = db.collection('users-by-email').doc(email);
      const emailLookupSnap = await emailLookupRef.get();

      if (!emailLookupSnap.exists) {
        return { error: 'No user found with this email address.' };
      }
      
      const { uid } = emailLookupSnap.data() as { uid: string };

      // 2. Look up the user profile from the users collection
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        // This case indicates data inconsistency, which should be rare
        return { error: 'User profile not found for the given email.' };
      }
      
      const userData = userSnap.data();
      
      if (userData?.role !== 'student') {
        return { error: 'This user is not registered as a student.' };
      }

      // 3. Return the student's public information
      return {
        uid: uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      };

    } catch (err: any) {
      console.error("Error in findStudentByEmailFlow: ", err);
      return { error: 'An unexpected server error occurred.' };
    }
  }
);


export async function findStudentByEmail(input: FindStudentInput): Promise<FindStudentOutput> {
  return findStudentByEmailFlow(input);
}
