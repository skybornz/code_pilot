'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Globe, Server, Pencil } from 'lucide-react';
import type { Model } from '@/lib/model-database';
import { getModels, deleteModel } from '@/actions/models';
import { ModelForm } from './model-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function ModelSettingsPage() {
    const [models, setModels] = useState<Model[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const { toast } = useToast();

    const fetchModels = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedModels = await getModels();
            setModels(fetchedModels);
        } catch (error) {
            console.error('Failed to fetch models:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch model data. Please try again later.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const onFormSubmit = () => {
        setIsFormOpen(false);
        setSelectedModel(null);
        fetchModels();
    };

    const handleDelete = async (modelId: string) => {
        const result = await deleteModel(modelId);
        if (result.success) {
            toast({ title: "Model Deleted", description: "The model has been removed." });
            fetchModels();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the model.' });
        }
    }
    
    const handleEdit = (model: Model) => {
        setSelectedModel(model);
        setIsFormOpen(true);
    }
    
    const handleAdd = () => {
        setSelectedModel(null);
        setIsFormOpen(true);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-semibold text-primary">Model Configuration</CardTitle>
                    <CardDescription>Add, remove, and manage your AI models.</CardDescription>
                </div>
                 <Dialog open={isFormOpen} onOpenChange={(open) => {
                     setIsFormOpen(open);
                     if (!open) setSelectedModel(null);
                 }}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAdd}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Model
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{selectedModel ? 'Edit AI Model' : 'Add New AI Model'}</DialogTitle>
                        </DialogHeader>
                        <ModelForm model={selectedModel} onSubmitSuccess={onFormSubmit} />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : models.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {models.map(model => (
                            <Card key={model.id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        {model.type === 'local' ? <Server className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                                        {model.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm text-muted-foreground">
                                    {model.type === 'local' ? (
                                        <>
                                            <p><span className="font-semibold text-foreground">API URL:</span> {model.apiUrl}</p>
                                            <p><span className="font-semibold text-foreground">Model:</span> {model.modelName}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p><span className="font-semibold text-foreground">API Key:</span> ••••••••{model.apiKey.slice(-4)}</p>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(model)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the model configuration.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(model.id)}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <p>No models configured.</p>
                        <p>Click "Add Model" to get started.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
