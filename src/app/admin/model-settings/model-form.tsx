'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addModel, updateModel } from '@/actions/models';
import { Loader2 } from 'lucide-react';
import React, { useEffect } from 'react';
import type { Model } from '@/lib/model-schema';

const formSchema = z.object({
    name: z.string().min(1, 'Model name is required.'),
});

type ModelFormValues = z.infer<typeof formSchema>;

interface ModelFormProps {
  model: Model | null;
  onSubmitSuccess: () => void;
}

export function ModelForm({ model, onSubmitSuccess }: ModelFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: model?.name || '',
    },
  });

  useEffect(() => {
    form.reset({
      name: model?.name || '',
    });
  }, [model, form]);


  async function onSubmit(data: ModelFormValues) {
    setIsSubmitting(true);
    
    const modelPayload = { ...data, type: 'online' as const };

    const result = model
      ? await updateModel({ ...modelPayload, id: model.id })
      : await addModel(modelPayload);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: model ? 'Model Updated' : 'Model Added',
        description: `Model "${data.name}" has been successfully ${model ? 'updated' : 'added'}.`,
      });
      onSubmitSuccess();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (result as { message?: string }).message || 'An unknown error occurred.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model Name</FormLabel>
              <FormControl>
                <Input placeholder="gemini-1.5-flash" {...field} />
              </FormControl>
              <FormDescription>
                This must be the exact model ID from the provider (e.g., gemini-1.5-flash).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {model ? 'Update Model' : 'Add Model'}
        </Button>
      </form>
    </Form>
  );
}
