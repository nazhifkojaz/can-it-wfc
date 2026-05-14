import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { listApi } from '../api/client';
import { queryKeys } from '../config/queryKeys';

interface UseSaveListOptions {
  initialSaved: boolean;
  initialSaveCount: number;
}

export function useSaveList(listId: number, opts: UseSaveListOptions) {
  const [optimisticSaved, setOptimisticSaved] = useState(opts.initialSaved);
  const [optimisticCount, setOptimisticCount] = useState(opts.initialSaveCount);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => listApi.save(listId),
    onMutate: () => {
      setOptimisticSaved(true);
      setOptimisticCount((c) => c + 1);
      setInlineError(null);
    },
    onError: (error: unknown) => {
      setOptimisticSaved(opts.initialSaved);
      setOptimisticCount(opts.initialSaveCount);
      const message =
        error instanceof Error ? error.message : 'Failed to save list.';
      setInlineError(message);
    },
    onSuccess: (data) => {
      setOptimisticCount(data.save_count);
      setOptimisticSaved(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists });
      queryClient.invalidateQueries({ queryKey: queryKeys.listDetail(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.savedLists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.discover });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: () => listApi.unsave(listId),
    onMutate: () => {
      setOptimisticSaved(false);
      setOptimisticCount((c) => Math.max(0, c - 1));
      setInlineError(null);
    },
    onError: (error: unknown) => {
      setOptimisticSaved(opts.initialSaved);
      setOptimisticCount(opts.initialSaveCount);
      const message =
        error instanceof Error ? error.message : 'Failed to unsave list.';
      setInlineError(message);
    },
    onSuccess: () => {
      setOptimisticSaved(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists });
      queryClient.invalidateQueries({ queryKey: queryKeys.listDetail(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.savedLists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.discover });
    },
  });

  const toggle = useCallback(() => {
    if (saveMutation.isPending || unsaveMutation.isPending) return;
    if (optimisticSaved) {
      unsaveMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  }, [optimisticSaved, saveMutation, unsaveMutation]);

  const isPending = saveMutation.isPending || unsaveMutation.isPending;

  return {
    isSaved: optimisticSaved,
    saveCount: optimisticCount,
    toggle,
    isPending,
    error: inlineError,
  };
}
