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
    },
  });

  useEffect(() => {
    form.reset({
      name: model?.name || '',
      type: model?.type || 'online',
    });
  }, [model, form]);


  async function onSubmit(data: ModelFormValues) {
    setIsSubmitting(true);
    
    const result = model
      ? await updateModel({ ...data, id: model.id })
      : await addModel(data as NewModel);

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
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {model ? 'Update Model' : 'Add Model'}
        </Button>
      </form>
    </Form>
  );
}
