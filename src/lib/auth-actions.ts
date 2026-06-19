import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase.ts'

const googleProvider = new GoogleAuthProvider()

export const emailSignIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const emailSignUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)

export const googleSignIn = () => signInWithPopup(auth, googleProvider)

export const logOut = () => signOut(auth)

/** Maps Firebase auth error codes to friendly messages. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.'
    case 'auth/missing-password':
      return 'Please enter a password.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/email-already-in-use':
      return 'An account already exists with that email. Try signing in.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase yet.'
    default:
      return (err as { message?: string })?.message ?? 'Something went wrong. Try again.'
  }
}
