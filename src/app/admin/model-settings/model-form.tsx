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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { addModel, updateModel } from '@/actions/models';
import { Loader2 } from 'lucide-react';
import React, { useEffect } from 'react';
import type { Model, NewModel } from '@/lib/model-schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'Model name is required.'),
  type: z.enum(['online', 'local']),
  url: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'local') {
        if (!data.url || data.url.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Ollama host URL is required for local models.',
                path: ['url'],
            });
            return;
        }
        try {
            // Use zod's URL validation for a more robust check.
            z.string().url('Invalid URL format.').parse(data.url);
        } catch (error) {
             if (error instanceof z.ZodError) {
                 ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: error.errors[0].message,
                    path: ['url'],
                });
             }
        }
    }
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
      type: model?.type || 'online',
      url: model?.url || '',
    },
  });

  useEffect(() => {
    form.reset({
      name: model?.name || '',
      type: model?.type || 'online',
      url: model?.url || '',
    });
  }, [model, form]);


  async function onSubmit(data: ModelFormValues) {
    setIsSubmitting(true);
    
    const modelPayload: any = { ...data };
    if (data.type === 'online') {
        modelPayload.url = null; // Ensure URL is null for online models
    }

    const result = model
      ? await updateModel({ ...modelPayload, id: model.id, isDefault: model.isDefault })
      : await addModel(modelPayload as NewModel);


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

  const selectedType = form.watch('type');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Model Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex gap-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="online" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Online
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="local" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Local
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model Name</FormLabel>
              {selectedType === 'online' ? (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Google AI model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</SelectItem>
                    <SelectItem value="gemini-1.5-pro-latest">gemini-1.5-pro-latest</SelectItem>
                    <SelectItem value="gemini-pro">gemini-pro</SelectItem>
                    <SelectItem value="gemini-pro-vision">gemini-pro-vision</SelectItem>
                    <SelectItem value="gemini-2.0-flash-preview">gemini-2.0-flash-preview</SelectItem>
                    <SelectItem value="gemini-2.5-flash-preview">gemini-2.5-flash-preview</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <FormControl>
                  <Input placeholder="llama3" {...field} />
                </FormControl>
              )}
              <FormDescription>
                {selectedType === 'online'
                  ? "Select a supported Google AI model."
                  : "This must be the exact model name from your local Ollama instance."
                }
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedType === 'local' && (
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ollama Host URL</FormLabel>
                <FormControl>
                  <Input placeholder="http://127.0.0.1:11434" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormDescription>
                  The base URL for your local Ollama server.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {model ? 'Update Model' : 'Add Model'}
        </Button>
      </form>
    </Form>
  );
}
