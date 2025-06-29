'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import type { Model } from '@/lib/model-database';

const formSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('online'),
    name: z.string().min(1, 'Model name is required.'),
    apiKey: z.string().min(1, 'API Key is required.'),
  }),
  z.object({
    type: z.literal('local'),
    name: z.string().min(1, 'Connection name is required'),
    apiUrl: z.string().url('Please enter a valid URL.').min(1, 'API URL is required.'),
    modelName: z.string().min(1, 'Model name (e.g., llama3) is required.'),
  }),
]);

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
    defaultValues: model ? {
      type: model.type,
      ...(model.type === 'local' ? { name: model.name, apiUrl: model.apiUrl, modelName: model.modelName } : { name: model.name, apiKey: model.apiKey })
    } : {
      type: 'local',
      name: '',
      apiUrl: 'http://localhost:11434',
      modelName: '',
    },
  });

  useEffect(() => {
    form.reset(model ? {
      type: model.type,
      ...(model.type === 'local' ? { name: model.name, apiUrl: model.apiUrl, modelName: model.modelName } : { name: model.name, apiKey: model.apiKey })
    } : {
      type: 'local',
      name: '',
      apiUrl: 'http://localhost:11434',
      modelName: '',
    });
  }, [model, form]);

  const modelType = form.watch('type');

  async function onSubmit(data: ModelFormValues) {
    setIsSubmitting(true);
    const result = model
      ? await updateModel({ ...data, id: model.id })
      : await addModel(data);
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
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Model Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                  disabled={!!model}
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="local" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Local (Ollama)
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="online" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Online (Cloud API)
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {modelType === 'local' && (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Llama3 Model" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ollama API URL</FormLabel>
                  <FormControl>
                    <Input placeholder="http://localhost:11434" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modelName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Name</FormLabel>
                  <FormControl>
                    <Input placeholder="llama3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {modelType === 'online' && (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Gemini Pro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••••••••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {model ? 'Update Model' : 'Add Model'}
        </Button>
      </form>
    </Form>
  );
}
