'use client';

import { FileTextIcon, UploadIcon, XIcon } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { Control, FieldValues, Path, FieldError as RHFFieldError } from 'react-hook-form';

import { Controller } from 'react-hook-form';
import { confirmUpload, deleteTempUpload, requestUploadUrl } from '@/infrastructure/files/actions';
import { extractExtension, isTempKey } from '@/infrastructure/storage/keys';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
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
  fileType?: string | undefined;
  previewUrl?: string | undefined;
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
  onSelect?: ((files: FileList) => void) | undefined;
  onRemove?: ((item: FileItem) => void) | undefined;
  fileInputRef?: { current: HTMLInputElement | null } | undefined;
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
            <FileAttachment key={item.tempKey} item={item} onRemove={onRemove} />
          ))}
        </AttachmentGroup>
      )}
    </div>
  );
}

function isBusy(state: FileItem['state']): boolean {
  return state === 'uploading' || state === 'processing';
}

function attachmentStatus(item: FileItem): string {
  if (item.state === 'uploading') {
    return 'Subiendo…';
  }
  if (item.state === 'processing') {
    return 'Procesando…';
  }
  if (item.state === 'error') {
    return 'Error al subir';
  }
  return item.fileSize > 0 ? `${(item.fileSize / 1024).toFixed(0)} KB` : 'Adjunto';
}

// Only already-persisted files expose a public URL; freshly uploaded files are
// still under `_temp/` and become openable after the form is saved.
function openableHref(item: FileItem): string | undefined {
  return item.state === 'done' && !isTempKey(item.tempKey) ? item.tempKey : undefined;
}

function buildExistingFile(formValue: string, allowedTypes: string[]): FileItem {
  const isImageScope = allowedTypes.some((t) => t.startsWith('image/'));
  const ext = extractExtension(formValue);
  const name = ext ? `${isImageScope ? 'imagen' : 'documento'}.${ext}` : 'Archivo adjunto';

  return {
    state: 'done',
    fileName: name,
    fileSize: 0,
    tempKey: formValue,
    fileType: isImageScope ? 'image/unknown' : undefined,
  };
}

function RemoveAttachmentAction({
  item,
  onRemove,
}: {
  item: FileItem;
  onRemove?: ((item: FileItem) => void) | undefined;
}) {
  if (!onRemove) {
    return null;
  }

  return (
    <AttachmentAction aria-label={`Eliminar ${item.fileName}`} onClick={() => onRemove(item)}>
      <XIcon />
    </AttachmentAction>
  );
}

function FileAttachment({
  item,
  onRemove,
}: {
  item: FileItem;
  onRemove?: ((item: FileItem) => void) | undefined;
}) {
  const href = openableHref(item);
  const isImage = Boolean(item.fileType?.startsWith('image/'));
  const previewSrc = isImage ? (href ?? item.previewUrl) : undefined;

  return (
    <Attachment
      state={item.state}
      orientation={isImage ? 'vertical' : undefined}
      size={isImage ? undefined : 'sm'}
    >
      <AttachmentMedia variant={previewSrc ? 'image' : 'icon'}>
        {isBusy(item.state) ? (
          <Spinner />
        ) : previewSrc ? (
          <picture>
            <img src={previewSrc} alt={item.fileName} />
          </picture>
        ) : (
          <FileTextIcon />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{item.fileName}</AttachmentTitle>
        <AttachmentDescription>{attachmentStatus(item)}</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        {item.state === 'error' && (
          <AttachmentAction aria-label='Reintentar'>
            <UploadIcon />
          </AttachmentAction>
        )}
        <RemoveAttachmentAction item={item} onRemove={onRemove} />
      </AttachmentActions>
      {href && (
        <AttachmentTrigger asChild>
          <a href={href} target='_blank' rel='noreferrer' aria-label={`Abrir ${item.fileName}`}>
            <span className='sr-only'>Abrir {item.fileName}</span>
          </a>
        </AttachmentTrigger>
      )}
    </Attachment>
  );
}

export async function uploadTempFile(
  entity: FileEntity,
  scope: string,
  file: File,
): Promise<string | null> {
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

export function fileIsValid(
  file: File | null,
  allowedTypes: string[],
  maxSize: number,
): file is File {
  return (
    file !== null &&
    (allowedTypes.length === 0 || allowedTypes.includes(file.type)) &&
    file.size <= maxSize
  );
}

function buildMultiEntries(
  values: string[],
  items: FileItem[],
  allowedTypes: string[],
): FileItem[] {
  const persisted = values.filter((value) => !isTempKey(value));

  return [...persisted.map((url) => buildExistingFile(url, allowedTypes)), ...items];
}

interface MultiFileFieldProps {
  label?: string | undefined;
  description?: string | undefined;
  entries: FileItem[];
  accept: string;
  inputId: string;
  fileInputRef: { current: HTMLInputElement | null };
  maxCount: number;
  maxSize: number;
  onSelect: (files: FileList) => void;
  onRemove: (item: FileItem) => void;
  readOnly: boolean;
  invalid: boolean;
  error: RHFFieldError | undefined;
}

function MultiFileField({
  label,
  description,
  entries,
  accept,
  inputId,
  fileInputRef,
  maxCount,
  maxSize,
  onSelect,
  onRemove,
  readOnly,
  invalid,
  error,
}: MultiFileFieldProps) {
  return (
    <Field orientation='vertical' data-invalid={invalid}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}

      <FileUploader
        accept={accept}
        maxCount={maxCount}
        maxSize={maxSize}
        fileInputRef={readOnly ? undefined : fileInputRef}
        inputId={inputId}
        items={entries}
        onSelect={readOnly ? undefined : onSelect}
        onRemove={readOnly ? undefined : onRemove}
      />

      {readOnly ? null : (
        <input
          accept={accept}
          className='hidden'
          id={inputId}
          multiple
          ref={fileInputRef}
          type='file'
          onChange={(e) => {
            if (e.target.files) {
              onSelect(e.target.files);
            }
            e.target.value = '';
          }}
        />
      )}

      {invalid ? <FieldError errors={[error]} /> : null}
    </Field>
  );
}

/**
 * Array counterpart of `ControlledFileUploader`: the field value is the list of
 * refs (persisted URLs and pending temp keys), and the whole list is what the
 * owning action syncs.
 */
export function ControlledMultiFileUploader<T extends FieldValues, TTransformed = T>({
  control,
  name,
  entity,
  scope,
  label,
  description,
  readOnly = false,
}: {
  control: Control<T, unknown, TTransformed>;
  name: string;
  entity: FileEntity;
  scope: string;
  label?: string | undefined;
  description?: string | undefined;
  readOnly?: boolean;
}) {
  const config = getScopeConfig(entity, scope);

  if (!config) {
    throw new Error(`Unknown file scope: ${entity}.${scope}`);
  }

  const { allowedTypes, maxCount, maxSize } = config;

  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const onChangeRef = useRef<(value: string[]) => void>(() => undefined);
  const valuesRef = useRef<string[]>([]);

  async function addFile(file: File): Promise<void> {
    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    setItems((cur) => [
      ...cur,
      {
        state: 'uploading',
        fileName: file.name,
        fileSize: file.size,
        tempKey: id,
        fileType: file.type,
        previewUrl,
      },
    ]);

    const tempKey = await uploadTempFile(entity, scope, file);
    if (tempKey) {
      setItems((cur) =>
        cur.map((it) => (it.tempKey === id ? { ...it, state: 'done', tempKey } : it)),
      );
      onChangeRef.current([...valuesRef.current, tempKey]);
      return;
    }

    setItems((cur) => cur.map((it) => (it.tempKey === id ? { ...it, state: 'error' } : it)));
  }

  async function handleSelect(files: FileList): Promise<void> {
    const busy = items.filter((item) => isBusy(item.state)).length;
    const room = Math.max(maxCount - valuesRef.current.length - busy, 0);
    const selected = Array.from(files)
      .filter((file) => fileIsValid(file, allowedTypes, maxSize))
      .slice(0, room);

    for (const file of selected) {
      await addFile(file);
    }
  }

  function handleRemove(item: FileItem): void {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    if (isTempKey(item.tempKey)) {
      deleteTempUpload({ fileKey: item.tempKey }).catch(() => undefined);
    }
    setItems((cur) => cur.filter((it) => it.tempKey !== item.tempKey));
    onChangeRef.current(valuesRef.current.filter((value) => value !== item.tempKey));
  }

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      render={({ field, fieldState }) => {
        onChangeRef.current = field.onChange;
        const values: string[] = field.value ?? [];
        valuesRef.current = values;

        return (
          <MultiFileField
            label={label}
            description={description}
            entries={buildMultiEntries(values, items, allowedTypes)}
            accept={allowedTypes.join(',')}
            inputId={inputId}
            fileInputRef={fileInputRef}
            maxCount={maxCount}
            maxSize={maxSize}
            onSelect={handleSelect}
            onRemove={handleRemove}
            readOnly={readOnly}
            invalid={fieldState.invalid}
            error={fieldState.error}
          />
        );
      }}
    />
  );
}

export function ControlledFileUploader<T extends FieldValues, TTransformed = T>({
  control,
  name,
  entity,
  scope,
  label,
  description,
}: {
  control: Control<T, unknown, TTransformed>;
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

  async function addFile(file: File): Promise<void> {
    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    setItems((cur) => [
      ...cur,
      {
        state: 'uploading',
        fileName: file.name,
        fileSize: file.size,
        tempKey: id,
        fileType: file.type,
        previewUrl,
      },
    ]);

    const tempKey = await uploadTempFile(entity, scope, file);
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
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
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
          ? [...items, buildExistingFile(formValue, allowedTypes)]
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
