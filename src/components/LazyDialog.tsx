import { lazy, Suspense, ComponentType } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

interface LazyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: ComponentType<any>;
  [key: string]: any;
}

/**
 * Wrapper component for lazy loading dialogs
 * Only loads the dialog content when it's first opened
 */
export function LazyDialog({ open, onOpenChange, component: Component, ...props }: LazyDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Suspense
        fallback={
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <VisuallyHidden>
                <DialogTitle>Carregando...</DialogTitle>
              </VisuallyHidden>
            </DialogHeader>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </DialogContent>
        }
      >
        <Component {...props} onClose={() => onOpenChange(false)} />
      </Suspense>
    </Dialog>
  );
}
