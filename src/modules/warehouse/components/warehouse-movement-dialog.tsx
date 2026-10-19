'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useMemo, useState, useTransition } from 'react';
import { type Control, Controller, useFieldArray, useForm } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/alert-dialog';
import { Button } from '@/shared/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/dialog';
import { Field, FieldError, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/table';
import {
  createMovementRow,
  MOVEMENT_FORM_COLUMNS,
  type MovementFormColumn,
  type MovementFormKind,
} from '../application/warehouse.movement';
import type {
  MovementCellOptionDTO,
  MovementFormOptionsDTO,
  MovementLotOptionDTO,
} from '../application/warehouse.types';
import {
  MAX_MOVEMENT_ENTRIES,
  type MovementFormSchema,
  type MovementReturnContextSchema,
  movementFormKindSchema,
  movementFormSchema,
} from '../application/warehouse.validation';
import { registerMovement } from '../infrastructure/warehouse.action';
import { movementParams } from '../infrastructure/warehouse.params';
import { MOVEMENT_COLUMN_LABELS, MOVEMENT_FORM_KIND_CONFIG } from './warehouse-movement-config';
import { type WarehouseOption, WarehouseOptionCombobox } from './warehouse-option-combobox';

interface WarehouseMovementDialogProps {
  allowedKinds: readonly MovementFormKind[];
  initialKind: MovementFormKind;
  returnContext: MovementReturnContextSchema;
  initialLotId: string | null;
  initialCellId: string | null;
  options: MovementFormOptionsDTO;
}

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function rowFieldId(index: number, column: MovementFormColumn): string {
  return `movement-row-${index}-${column}`;
}

function lotLabel(lot: MovementLotOptionDTO): string {
  return `${lot.code} — ${lot.productTitle} / ${lot.itemTitle}`;
}

function cellLabel(cell: MovementCellOptionDTO): string {
  return cell.code;
}

export function WarehouseMovementDialog({
  allowedKinds,
  initialKind,
  returnContext,
  initialLotId,
  initialCellId,
  options,
}: WarehouseMovementDialogProps) {
  const [open, setOpen] = useState(true);
  const [pendingKind, setPendingKind] = useState<MovementFormKind | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, setParams] = useQueryStates(movementParams);

  const lotOptions = useMemo<WarehouseOption[]>(
    () => options.lots.map((lot) => ({ value: lot.id, label: lotLabel(lot) })),
    [options.lots],
  );
  const cellOptions = useMemo<WarehouseOption[]>(
    () => options.cells.map((cell) => ({ value: cell.id, label: cellLabel(cell) })),
    [options.cells],
  );

  const selectedLotId = options.lots.some((lot) => lot.id === initialLotId) ? initialLotId : null;
  const selectedCellId = options.cells.some((cell) => cell.id === initialCellId)
    ? initialCellId
    : null;

  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<MovementFormSchema>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      kind: initialKind,
      title: '',
      rows: [
        createMovementRow(initialKind, {
          lotId: selectedLotId,
          cellId: selectedCellId,
        }),
      ],
    },
  });

  const { append, fields, remove, replace } = useFieldArray({ control, name: 'rows' });
  const kind = watch('kind');
  const columns = MOVEMENT_FORM_COLUMNS[kind];

  function close() {
    if (isPending) {
      return;
    }

    startTransition(() => {
      setOpen(false);
      setParams({ movement: null, lot: null, cell: null });
    });
  }

  function applyKind(nextKind: MovementFormKind) {
    setValue('kind', nextKind, { shouldValidate: false });
    replace([createMovementRow(nextKind)]);
    clearErrors();
    setPendingKind(null);
  }

  function requestKindChange(nextKind: string) {
    const parsed = movementFormKindSchema.safeParse(nextKind);

    if (!parsed.success) {
      return;
    }

    const next = parsed.data;

    if (next === kind) {
      return;
    }

    const hasData = getValues('rows').some(
      (row) => row.lotId || row.originCellId || row.destinationCellId || row.quantity,
    );

    if (hasData) {
      setPendingKind(next);
      return;
    }

    applyKind(next);
  }

  function addRow() {
    const index = fields.length;

    if (index >= MAX_MOVEMENT_ENTRIES) {
      return;
    }

    append(createMovementRow(kind));
    requestAnimationFrame(() => {
      document.getElementById(rowFieldId(index, 'lot'))?.focus();
    });
  }

  async function onSubmit(values: MovementFormSchema) {
    await submitAction(
      () =>
        registerMovement({
          kind: values.kind,
          title: values.title,
          rows: values.rows,
          returnContext,
        }),
      'Movimiento registrado',
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            close();
          }
        }}
      >
        <DialogContent className='flex max-h-[85vh] flex-col overflow-hidden sm:max-h-[90vh] sm:max-w-5xl'>
          <DialogHeader className='shrink-0'>
            <DialogTitle>Registrar movimientos</DialogTitle>
            <DialogDescription>
              Registra una o más entradas del mismo tipo de movimiento.
            </DialogDescription>
          </DialogHeader>

          <form
            className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1'
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <Controller
                control={control}
                name='kind'
                render={({ field }) => (
                  <Field orientation='vertical'>
                    <FieldLabel htmlFor='movement-kind'>Tipo de movimiento</FieldLabel>
                    <Select onValueChange={requestKindChange} value={field.value}>
                      <SelectTrigger className='w-full' id='movement-kind'>
                        <SelectValue placeholder='Seleccionar tipo' />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedKinds.map((item) => (
                          <SelectItem key={item} value={item}>
                            {MOVEMENT_FORM_KIND_CONFIG[item].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <Field orientation='vertical'>
                <FieldLabel htmlFor='movement-date'>Fecha</FieldLabel>
                <Input disabled id='movement-date' type='date' value={todayISO()} />
              </Field>

              <Field data-invalid={Boolean(errors.title)} orientation='vertical'>
                <FieldLabel htmlFor='movement-title'>
                  Título{' '}
                  <span aria-hidden className='text-destructive'>
                    *
                  </span>
                </FieldLabel>
                <Input
                  {...register('title')}
                  aria-invalid={Boolean(errors.title)}
                  id='movement-title'
                  placeholder='Ej: Asignación de lote 14/08'
                />
                {errors.title ? <FieldError errors={[errors.title]} /> : null}
              </Field>
            </div>

            <div className='min-h-0 overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-10 px-1.5 text-xs sm:px-2'>#</TableHead>
                    {columns.map((column) => (
                      <TableHead className='px-1.5 text-xs sm:px-2' key={column}>
                        {MOVEMENT_COLUMN_LABELS[column]}
                      </TableHead>
                    ))}
                    <TableHead className='w-12 px-1.5 sm:px-2' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const rowErrors = errors.rows?.[index];
                    const rowHasError = Boolean(
                      rowErrors?.lotId ||
                        rowErrors?.originCellId ||
                        rowErrors?.destinationCellId ||
                        rowErrors?.quantity,
                    );

                    return (
                      <TableRow
                        className={rowHasError ? 'bg-destructive/5' : undefined}
                        key={field.id}
                      >
                        <TableCell className='px-1.5 pt-3 align-top text-xs text-muted-foreground tabular-nums sm:px-2'>
                          {index + 1}
                        </TableCell>

                        {columns.map((column) => (
                          <TableCell className='px-1.5 py-1.5 align-top sm:px-2' key={column}>
                            {renderCell({
                              column,
                              index,
                              lotOptions,
                              cellOptions,
                              control,
                            })}
                          </TableCell>
                        ))}

                        <TableCell className='px-1.5 pt-1.5 align-top sm:px-2'>
                          <Button
                            aria-label='Eliminar fila'
                            disabled={fields.length <= 1}
                            onClick={() => remove(index)}
                            size='icon-sm'
                            type='button'
                            variant='ghost'
                          >
                            <Trash2Icon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Button
              className='shrink-0 self-start'
              disabled={fields.length >= MAX_MOVEMENT_ENTRIES}
              onClick={addRow}
              size='sm'
              type='button'
              variant='outline'
            >
              <PlusIcon />
              Agregar movimiento
            </Button>

            <div className='mb-1.5 flex shrink-0 flex-col-reverse justify-end gap-3 border-t pt-4 sm:flex-row'>
              <Button disabled={isPending} onClick={close} type='button' variant='outline'>
                Cancelar
              </Button>
              <Button disabled={isSubmitting || isPending} type='submit'>
                {isPending ? 'Cerrando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingKind !== null}
        onOpenChange={(next) => {
          if (!next) {
            setPendingKind(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar tipo de movimiento</AlertDialogTitle>
            <AlertDialogDescription>
              Al cambiar el tipo se limpiarán las filas actuales. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingKind && applyKind(pendingKind)}>
              Cambiar tipo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function renderCell({
  column,
  index,
  lotOptions,
  cellOptions,
  control,
}: {
  column: MovementFormColumn;
  index: number;
  lotOptions: WarehouseOption[];
  cellOptions: WarehouseOption[];
  control: Control<MovementFormSchema>;
}) {
  const fieldId = rowFieldId(index, column);

  switch (column) {
    case 'lot':
      return (
        <Controller
          control={control}
          name={`rows.${index}.lotId`}
          render={({ field, fieldState }) => (
            <div className='flex flex-col gap-1'>
              <WarehouseOptionCombobox
                id={fieldId}
                invalid={fieldState.invalid}
                items={lotOptions}
                label='Lote'
                onValueChange={field.onChange}
                placeholder='Buscar lote...'
                value={field.value}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </div>
          )}
        />
      );

    case 'originCell':
      return (
        <Controller
          control={control}
          name={`rows.${index}.originCellId`}
          render={({ field, fieldState }) => (
            <div className='flex flex-col gap-1'>
              <WarehouseOptionCombobox
                id={fieldId}
                invalid={fieldState.invalid}
                items={cellOptions}
                label='Celda origen'
                onValueChange={field.onChange}
                placeholder='Celda origen...'
                value={field.value}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </div>
          )}
        />
      );

    case 'destinationCell':
      return (
        <Controller
          control={control}
          name={`rows.${index}.destinationCellId`}
          render={({ field, fieldState }) => (
            <div className='flex flex-col gap-1'>
              <WarehouseOptionCombobox
                id={fieldId}
                invalid={fieldState.invalid}
                items={cellOptions}
                label='Celda destino'
                onValueChange={field.onChange}
                placeholder='Celda destino...'
                value={field.value}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </div>
          )}
        />
      );

    case 'quantity':
      return (
        <Controller
          control={control}
          name={`rows.${index}.quantity`}
          render={({ field, fieldState }) => (
            <div className='flex flex-col gap-1'>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                className='w-28 tabular-nums'
                id={fieldId}
                min={0.0001}
                placeholder='0'
                step='any'
                type='number'
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </div>
          )}
        />
      );

    default:
      return null;
  }
}
