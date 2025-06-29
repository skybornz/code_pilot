import { z } from 'zod';

export const ModelSchema = z.object({
  id: z.string(),
  type: z.literal('online'),
  name: z.string().min(1, 'Name is required'),
  isDefault: z.boolean().optional(),
});

export type Model = z.infer<typeof ModelSchema>;
export type NewModel = Omit<Model, 'id' | 'isDefault'>;
