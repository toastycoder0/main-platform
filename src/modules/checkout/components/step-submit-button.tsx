import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Spinner } from '@/shared/components/spinner';

interface StepSubmitButtonProps {
  label: string;
  pending: boolean;
  disabled?: boolean;
  final?: boolean;
  form?: string;
}

export function StepSubmitButton({
  label,
  pending,
  disabled = false,
  final = false,
  form,
}: StepSubmitButtonProps) {
  return (
    <Button type='submit' form={form} disabled={pending || disabled} aria-busy={pending}>
      {final && !pending ? <CheckIcon /> : null}
      {label}
      {pending ? <Spinner /> : null}
      {!final && !pending ? <ArrowRightIcon /> : null}
    </Button>
  );
}
