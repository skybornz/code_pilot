import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean(),
  lastActive: z.date(),
});

export const NewUserSchema = UserSchema.omit({ id: true, lastActive: true });

export type User = z.infer<typeof UserSchema>;
export type NewUser = z.infer<typeof NewUserSchema>;
