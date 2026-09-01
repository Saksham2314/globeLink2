import { z } from "zod";

/** Normalised email: trimmed + lowercased. */
const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .toLowerCase();

/** At least 8 characters, with a letter and a number. Deliberately not
 *  draconian — length matters more than symbol soup. */
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "That password is too long")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  email,
  password,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const resendVerificationSchema = z.object({ email });
