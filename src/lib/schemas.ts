import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean(),
});

export type User = z.infer<typeof UserSchema>;
