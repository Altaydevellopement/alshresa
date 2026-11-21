
import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-muted">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-destructive mb-4">Une erreur est survenue</h2>
        <div className="mb-4 p-4 bg-destructive-soft rounded border border-destructive/30">
          <p className="text-destructive font-mono text-sm whitespace-pre-wrap break-words">
            {error.message}
          </p>
        </div>
        <Button
          onClick={resetErrorBoundary}
          className="w-full"
        >
          Essayer à nouveau
        </Button>
      </div>
    </div>
  );
}
