import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean(),
  lastActive: z.date(),
  bitbucketUsername: z.string().optional().nullable(),
  bitbucketAppPassword: z.string().optional().nullable(),
});

export const NewUserSchema = UserSchema.omit({ 
  id: true, 
  lastActive: true, 
  bitbucketUsername: true, 
  bitbucketAppPassword: true 
});

export type User = z.infer<typeof UserSchema>;
export type NewUser = z.infer<typeof NewUserSchema>;
