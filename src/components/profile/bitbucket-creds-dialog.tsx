
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateUserBitbucketCreds } from '@/actions/users';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useAuth } from '@/context/auth-context';

interface BitbucketCredsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const credsFormSchema = z.object({
  username: z.string().min(1, 'Bitbucket username is required.'),
  token: z.string().min(1, 'Bitbucket HTTP Access Token is required.'),
});

type CredsFormValues = z.infer<typeof credsFormSchema>;

export function BitbucketCredsDialog({ open, onOpenChange }: BitbucketCredsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<CredsFormValues>({
    resolver: zodResolver(credsFormSchema),
    defaultValues: {
      username: '',
      token: '',
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        username: user.bitbucketUsername || '',
        token: user.bitbucketAppPassword || '',
      });
    }
  }, [user, open, form]);

  const onSubmit = async (data: CredsFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    const result = await updateUserBitbucketCreds({
      userId: user.id,
      username: data.username,
      token: data.token,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Success',
        description: result.message,
      });
      // This is a bit of a hack to refresh the user context
      // In a real app, you might have a more elegant state management solution
      setTimeout(() => window.location.reload(), 1000);
      onOpenChange(false);
      form.reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bitbucket Credentials</DialogTitle>
          <DialogDescription>
            Provide your Bitbucket username and an HTTP Access Token (App Password) to access private repositories.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bitbucket Username</FormLabel>
                  <FormControl>
                    <Input placeholder="your-username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bitbucket HTTP Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Credentials
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
