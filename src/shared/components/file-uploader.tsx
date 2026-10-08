'use client';

import { FileTextIcon, UploadIcon, XIcon } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { isTempKey } from '@/infrastructure/storage/keys';
import {
  confirmUpload,
  deleteTempUpload,
  requestUploadUrl,
} from '@/modules/files/infrastructure/files.action';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/shared/components/attachment';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/field';
import { Spinner } from '@/shared/components/spinner';
import { type FileEntity, getScopeConfig } from '@/shared/constants/file-registry';
import { cn } from '@/shared/utils/cn';

interface FileItem {
  state: 'uploading' | 'processing' | 'done' | 'error';
  fileName: string;
  fileSize: number;
  tempKey: string;
}

export function FileUploader({
  items = [],
  accept,
  maxCount,
  maxSize,
  onSelect,
  onRemove,
  fileInputRef,
  existingUrl,
  existingFileName,
  inputId,
}: {
  items?: FileItem[];
  accept?: string;
  maxCount?: number;
  maxSize?: number;
  onSelect?: (files: FileList) => void;
  onRemove?: (item: FileItem) => void;
  fileInputRef?: { current: HTMLInputElement | null };
  existingUrl?: string;
  existingFileName?: string;
  inputId?: string;
}) {
  const allItems = existingUrl
    ? [
        ...items,
        {
          state: 'done' as const,
          fileName: existingFileName ?? 'Archivo adjunto',
          fileSize: 0,
          tempKey: existingUrl,
        },
      ]
    : items;

  const canAddMore = allItems.length < (maxCount ?? 1);

  return (
    <div className='flex flex-col gap-1'>
      {canAddMore && fileInputRef && onSelect && accept && (
        <section
          aria-label='Zona de subida de archivos'
          className={cn('flex flex-col items-center gap-2 rounded-lg border border-dashed p-4')}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer?.files) {
              onSelect(e.dataTransfer.files);
            }
          }}
        >
          <button
            type='button'
            className={cn('flex flex-col items-center gap-2')}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={cn('rounded-full bg-muted p-3')}>
              <UploadIcon className={cn('h-5 w-5 text-muted-foreground')} />
            </div>
            <p className='text-sm text-muted-foreground'>
              Arrastra archivos o{' '}
              <label
                className='cursor-pointer font-medium text-primary hover:text-primary/90'
                htmlFor={inputId ?? 'file-upload-input'}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
              >
                selecciona
              </label>
            </p>
          </button>
          {maxSize && (
            <p className='text-xs text-muted-foreground'>Máximo {maxSize / 1024 / 1024}MB</p>
          )}
        </section>
      )}

      {allItems.length > 0 && (
        <AttachmentGroup>
          {allItems.map((item) => (
            <Attachment key={item.tempKey} state={item.state} size='sm'>
              <AttachmentMedia>
                {item.state === 'uploading' || item.state === 'processing' ? (
                  <Spinner />
                ) : (
                  <FileTextIcon />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{item.fileName}</AttachmentTitle>
                <AttachmentDescription>
                  {item.state === 'uploading' && 'Subiendo…'}
                  {item.state === 'processing' && 'Procesando…'}
                  {item.state === 'done' &&
                    (item.fileSize > 0 ? `${(item.fileSize / 1024).toFixed(0)} KB` : 'Adjunto')}
                  {item.state === 'error' && 'Error al subir'}
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                {item.state === 'error' && (
                  <AttachmentAction aria-label='Reintentar'>
                    <UploadIcon />
                  </AttachmentAction>
                )}
                <AttachmentAction
                  aria-label={`Eliminar ${item.fileName}`}
                  onClick={() => onRemove?.(item)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}
    </div>
  );
}

function fileIsValid(file: File | null, allowedTypes: string[], maxSize: number): file is File {
  return (
    file !== null &&
    (allowedTypes.length === 0 || allowedTypes.includes(file.type)) &&
    file.size <= maxSize
  );
}

export function ControlledFileUploader<T extends FieldValues>({
  control,
  name,
  entity,
  scope,
  label,
  description,
}: {
  control: Control<T>;
  name: string;
  entity: FileEntity;
  scope: string;
  label?: string;
  description?: string;
}) {
  const config = getScopeConfig(entity, scope);

  if (!config) {
    throw new Error(`Unknown file scope: ${entity}.${scope}`);
  }

  const { allowedTypes, maxCount, maxSize } = config;

  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const onChangeRef = useRef<(value: string) => void>(() => undefined);
  const formValueRef = useRef('');

  async function upload(file: File): Promise<string | null> {
    const result = await requestUploadUrl({
      entity,
      scope,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });
    if (!result.success) {
      return null;
    }

    const res = await fetch(result.data.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!res.ok) {
      return null;
    }

    const confirm = await confirmUpload({ fileKey: result.data.tempKey });
    return confirm.success ? result.data.tempKey : null;
  }

  async function addFile(file: File): Promise<void> {
    const id = crypto.randomUUID();
    setItems((cur) => [
      ...cur,
      { state: 'uploading', fileName: file.name, fileSize: file.size, tempKey: id },
    ]);

    const tempKey = await upload(file);
    if (tempKey) {
      setItems((cur) =>
        cur.map((it) => (it.tempKey === id ? { ...it, state: 'done', tempKey } : it)),
      );
      onChangeRef.current(tempKey);
      return;
    }

    setItems((cur) => cur.map((it) => (it.tempKey === id ? { ...it, state: 'error' } : it)));
  }

  async function handleSelect(files: FileList): Promise<void> {
    if (formValueRef.current !== '' && !isTempKey(formValueRef.current)) {
      onChangeRef.current('');
    }

    for (let i = 0; i < files.length && items.length < maxCount; i++) {
      const file = files.item(i);
      if (fileIsValid(file, allowedTypes, maxSize)) {
        await addFile(file);
      }
    }
  }

  function handleRemove(item: FileItem): void {
    if (isTempKey(item.tempKey)) {
      deleteTempUpload({ fileKey: item.tempKey }).catch(() => undefined);
    }
    setItems((cur) => cur.filter((it) => it.tempKey !== item.tempKey));
    if (formValueRef.current === item.tempKey) {
      onChangeRef.current('');
    }
  }

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      render={({ field, fieldState }) => {
        onChangeRef.current = field.onChange;
        const formValue: string = field.value ?? '';
        formValueRef.current = formValue;
        const hasExisting = formValue !== '' && !isTempKey(formValue);

        const entries: FileItem[] = hasExisting
          ? [
              ...items,
              { state: 'done', fileName: 'Archivo adjunto', fileSize: 0, tempKey: formValue },
            ]
          : items;

        return (
          <Field orientation='vertical' data-invalid={fieldState.invalid}>
            {label && <FieldLabel>{label}</FieldLabel>}
            {description && <FieldDescription>{description}</FieldDescription>}

            <FileUploader
              accept={allowedTypes.join(',')}
              maxCount={maxCount}
              maxSize={maxSize}
              fileInputRef={fileInputRef}
              inputId={inputId}
              items={entries}
              onSelect={handleSelect}
              onRemove={handleRemove}
            />

            <input
              accept={allowedTypes.join(',')}
              className='hidden'
              id={inputId}
              multiple={maxCount > 1}
              ref={fileInputRef}
              type='file'
              onChange={(e) => {
                if (e.target.files) {
                  handleSelect(e.target.files);
                }
                e.target.value = '';
              }}
            />

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
