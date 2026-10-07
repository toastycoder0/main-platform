'use client';

import { BanIcon, KeyIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react';
import { useState, useTransition } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/dialog';
import { Input } from '@/shared/components/input';
import { Label } from '@/shared/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { executeAction } from '@/shared/execute-action';
import { adminResetPassword, banUser, deleteUser, unbanUser } from '../infrastructure/users.action';

const DURATION_OPTIONS = [
  { value: 'permanent', label: 'Permanente' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
  { value: '365', label: '365 días' },
];

interface AccessUser {
  id: string;
  firstName: string;
  lastName: string;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
}

function formatBanExpiry(value: Date | null): string {
  if (!value) {
    return 'sin fecha de expiración';
  }

  return `expira el ${new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })}`;
}

function BanSection({ user }: { user: AccessUser }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('permanent');

  function submitBan() {
    startTransition(async () => {
      const succeeded = await executeAction(() =>
        banUser({
          id: user.id,
          reason,
          expiresInDays: duration === 'permanent' ? null : Number(duration),
        }),
      );

      if (succeeded) {
        setOpen(false);
        setReason('');
        setDuration('permanent');
      }
    });
  }

  function submitUnban() {
    startTransition(async () => {
      await executeAction(() => unbanUser({ id: user.id }));
    });
  }

  if (user.banned) {
    return (
      <div className='flex flex-col gap-3 rounded-md bg-destructive/10 p-3 text-sm'>
        <p className='font-medium text-destructive'>Cuenta baneada</p>
        <p className='text-muted-foreground'>
          Motivo: {user.banReason ?? 'sin motivo registrado'} · {formatBanExpiry(user.banExpires)}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-fit'
          disabled={isPending}
          onClick={submitUnban}
        >
          <ShieldCheckIcon />
          Levantar ban
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type='button' variant='outline' disabled={isPending}>
          <BanIcon />
          Banear usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Banear a {user.firstName}</DialogTitle>
          <DialogDescription>
            El usuario será desconectado y no podrá iniciar sesión hasta levantar el ban.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='ban-reason'>Motivo</Label>
            <Input
              id='ban-reason'
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder='Motivo del baneo'
              required
            />
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='ban-duration'>Duración</Label>
            <Select value={duration} onValueChange={(value) => setDuration(value)}>
              <SelectTrigger id='ban-duration' className='w-full'>
                <SelectValue placeholder='Selecciona una duración' />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            disabled={isPending || reason.trim().length === 0}
            onClick={submitBan}
          >
            Confirmar baneo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetSection({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  function submitReset() {
    startTransition(async () => {
      const succeeded = await executeAction(() => adminResetPassword({ id: userId, newPassword }));

      if (succeeded) {
        setOpen(false);
        setNewPassword('');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type='button' variant='outline' disabled={isPending}>
          <KeyIcon />
          Restablecer contraseña
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            Se definirá una contraseña nueva y se cerrarán las sesiones activas del usuario.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-2'>
          <Label htmlFor='reset-password'>Nueva contraseña</Label>
          <Input
            id='reset-password'
            type='password'
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder='Mínimo 8 caracteres'
            minLength={8}
            required
          />
        </div>

        <DialogFooter>
          <Button
            type='button'
            disabled={isPending || newPassword.length < 8}
            onClick={submitReset}
          >
            Restablecer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSection({ user }: { user: AccessUser }) {
  const [isPending, startTransition] = useTransition();

  function submitDelete() {
    startTransition(async () => {
      await executeAction(() => deleteUser({ id: user.id }));
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type='button' variant='destructive' disabled={isPending}>
          <Trash2Icon />
          Eliminar usuario
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar a {user.firstName} {user.lastName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción elimina la cuenta de forma permanente junto con sus sesiones, direcciones y
            perfiles de facturación. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={submitDelete}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface UserAccessPanelProps {
  user: AccessUser;
  canBan: boolean;
  canResetPassword: boolean;
  canDelete: boolean;
}

export function UserAccessPanel({
  user,
  canBan,
  canResetPassword,
  canDelete,
}: UserAccessPanelProps) {
  if (!canBan && !canResetPassword && !canDelete) {
    return null;
  }

  return (
    <section className='flex flex-col gap-4 rounded-md border border-destructive/30 p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-semibold'>Acceso</h2>
        <p className='text-xs text-muted-foreground'>
          Baneo, restablecimiento de contraseña y eliminación de la cuenta.
        </p>
      </div>

      {canBan ? <BanSection user={user} /> : null}

      <div className='flex flex-wrap gap-2'>
        {canResetPassword ? <ResetSection userId={user.id} /> : null}
        {canDelete ? <DeleteSection user={user} /> : null}
      </div>
    </section>
  );
}
