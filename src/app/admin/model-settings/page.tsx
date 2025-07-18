
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Globe, Pencil, Star, Server, CheckCircle, XCircle } from 'lucide-react';
import type { Model } from '@/lib/model-schema';
import { getModels, deleteModel, setDefaultModel } from '@/actions/models';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { checkDefaultModelStatus } from '@/actions/status';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function ConnectionStatus({ status, message }: { status: 'idle' | 'checking' | 'connected' | 'error', message?: string }) {
    if (status === 'checking') {
        return (
            <Badge variant="secondary" className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking...
            </Badge>
        );
    }
    if (status === 'connected') {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Badge className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="h-3 w-3" />
                            Connected
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{message}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    if (status === 'error') {
        return (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Badge variant="destructive" className="flex items-center gap-1.5">
                            <XCircle className="h-3 w-3" />
                            Connection Failed
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs">{message}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    return null; // idle
}

export default function ModelSettingsPage() {
    const [models, setModels] = useState<Model[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const { toast } = useToast();
    const [connectionStatus, setConnectionStatus] = useState<{
        status: 'idle' | 'checking' | 'connected' | 'error';
        message?: string;
    }>({ status: 'idle' });

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

    useEffect(() => {
        const defaultModel = models.find(m => m.isDefault);
        if (defaultModel) {
            setConnectionStatus({ status: 'checking' });
            checkDefaultModelStatus().then(result => {
                if (result.success) {
                    setConnectionStatus({ status: 'connected', message: result.message });
                } else {
                    setConnectionStatus({ status: 'error', message: result.message });
                }
            });
        } else {
            setConnectionStatus({ status: 'idle' });
        }
    }, [models]);


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
            toast({ variant: 'destructive', title: 'Error', description: result.message || 'Failed to delete the model.' });
        }
    }

    const handleSetDefault = async (modelId: string) => {
        const result = await setDefaultModel(modelId);
        if (result.success) {
            toast({ title: "Default Model Updated", description: "The default model has been changed." });
            fetchModels();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to set the default model.' });
        }
    };
    
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
                     if (!open) setSelectedModel(null);
                     setIsFormOpen(open);
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
                        <LoadingSpinner text="Loading models..." />
                    </div>
                ) : models.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {models.map(model => (
                            <Card key={model.id} className={cn(model.isDefault && "border-primary")}>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between gap-2 text-lg">
                                        <div className="flex items-center gap-2">
                                            {model.type === 'online' ? <Globe className="h-5 w-5" /> : <Server className="h-5 w-5" />}
                                            {model.name}
                                        </div>
                                        {model.isDefault && (
                                            <div className="flex items-center gap-2">
                                                <ConnectionStatus status={connectionStatus.status} message={connectionStatus.message} />
                                                <Badge>Default</Badge>
                                            </div>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm text-muted-foreground">
                                    <p><span className="font-semibold text-foreground">Type:</span> <span className="capitalize">{model.type}</span></p>
                                    <p><span className="font-semibold text-foreground">Provider:</span> {model.type === 'online' ? 'Google' : 'Ollama (Local)'}</p>
                                    {model.type === 'local' && model.url && (
                                        <p className="truncate" title={model.url}><span className="font-semibold text-foreground">Host:</span> {model.url}</p>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                     {!model.isDefault && (
                                        <Button variant="outline" size="sm" onClick={() => handleSetDefault(model.id)}>
                                            <Star className="mr-2 h-4 w-4" />
                                            Set as Default
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(model)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" disabled={model.isDefault}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the model configuration. The default model cannot be deleted.
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
