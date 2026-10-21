'use client';

import { type LucideIcon, Trash2Icon } from 'lucide-react';
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
} from '@/shared/components/alert-dialog';
import { Button } from '@/shared/components/button';

interface DestructiveConfirmProps {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  icon?: LucideIcon;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  className?: string;
  onConfirm: () => void;
}

export function DestructiveConfirm({
  label,
  title,
  description,
  confirmLabel,
  busy = false,
  icon: Icon = Trash2Icon,
  variant = 'destructive',
  size = 'default',
  className,
  onConfirm,
}: DestructiveConfirmProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type='button' variant={variant} size={size} className={className} disabled={busy}>
          <Icon />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
