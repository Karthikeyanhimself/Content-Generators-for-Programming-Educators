'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';


/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
        createUserWithEmailAndPassword(authInstance, email, password)
            .then(userCredential => {
                // Success is handled by the onAuthStateChanged listener, so we just resolve.
                resolve();
            })
            .catch(error => {
                if (error.code === 'auth/email-already-in-use') {
                    toast({
                        variant: 'destructive',
                        title: 'Account Creation Failed',
                        description: 'An account with this email address already exists.',
                    });
                } else {
                     toast({
                        variant: 'destructive',
                        title: 'An Error Occurred',
                        description: error.message || 'There was a problem creating your account.',
                    });
                }
                reject(error);
            });
    });
}


/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
        signInWithEmailAndPassword(authInstance, email, password)
        .then(userCredential => {
            resolve();
        })
        .catch(error => {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast({
                    variant: 'destructive',
                    title: 'Login Failed',
                    description: 'Invalid email or password. Please try again.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'An Error Occurred',
                    description: error.message || 'There was a problem logging in.',
                });
            }
            reject(error);
        });
    });
}
