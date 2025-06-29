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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/schemas';
import { addUser, updateUser } from '@/actions/users';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }).optional().or(z.literal('')),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof formSchema>;

interface UserFormProps {
  user: Omit<User, 'password'> | null;
  onSubmitSuccess: () => void;
}

export function UserForm({ user, onSubmitSuccess }: UserFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user?.email || '',
      password: '',
      role: user?.role || 'user',
      isActive: user ? user.isActive : true,
    },
  });

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    let result;
    if (user) {
      // Update user
      const userData: any = { id: user.id, email: data.email, role: data.role, isActive: data.isActive };
      if (data.password) {
        userData.password = data.password;
      }
      result = await updateUser(userData);
    } else {
      // Add user
      if (!data.password) {
        form.setError('password', { message: 'Password is required for new users.' });
        setIsSubmitting(false);
        return;
      }
      result = await addUser({ email: data.email, password: data.password, role: data.role, isActive: data.isActive });
    }

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: user ? 'User Updated' : 'User Added',
        description: `User ${data.email} has been successfully ${user ? 'updated' : 'added'}.`,
      });
      onSubmitSuccess();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder={user ? 'Leave blank to keep current password' : '••••••••'} {...field} />
              </FormControl>
              <FormDescription>
                {user ? 'Leave this field blank to keep the current password.' : 'Password must be at least 8 characters.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Inactive users will not be able to log in.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {user ? 'Update User' : 'Add User'}
        </Button>
      </form>
    </Form>
  );
}
