'use client';

import { FileTextIcon, UploadIcon, XIcon } from 'lucide-react';
import { useRef } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
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
import type { FileTypeSlug } from '@/shared/constants/file-registry';
import { FILE_REGISTRY } from '@/shared/constants/file-registry';
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
                htmlFor='file-upload-input'
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
  fileType,
  label,
  description,
  existingUrl,
  existingFileName,
}: {
  control: Control<T>;
  name: string;
  fileType: FileTypeSlug;
  label?: string;
  description?: string;
  existingUrl?: string;
  existingFileName?: string;
}) {
  const config = FILE_REGISTRY[fileType];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const items: FileItem[] = [];

  function handleSelect(files: FileList) {
    for (let i = 0; i < files.length && items.length < config.maxCount; i++) {
      const file = files.item(i);
      if (!fileIsValid(file, config.allowedTypes, config.maxSize)) {
        continue;
      }
      items.push({ state: 'done', fileName: file.name, fileSize: file.size, tempKey: file.name });
    }
  }

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      render={({ fieldState }) => (
        <Field orientation='vertical' data-invalid={fieldState.invalid}>
          {label && <FieldLabel>{label}</FieldLabel>}
          {description && <FieldDescription>{description}</FieldDescription>}

          <FileUploader
            accept={config.allowedTypes.join(',')}
            maxCount={config.maxCount}
            maxSize={config.maxSize}
            fileInputRef={fileInputRef}
            onSelect={handleSelect}
            onRemove={(item) => {
              const idx = items.indexOf(item);
              if (idx !== -1) {
                items.splice(idx, 1);
              }
            }}
            {...(existingUrl ? { existingUrl, existingFileName } : {})}
          />

          <input
            accept={config.allowedTypes.join(',')}
            className='hidden'
            id='file-upload-input'
            multiple={config.maxCount > 1}
            ref={fileInputRef}
            type='file'
            onChange={(e) => {
              if (e.target.files) {
                handleSelect(e.target.files);
              }
            }}
          />

          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
