'use client';

import { XIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { deleteTempUpload } from '@/infrastructure/files/actions';
import { isTempKey } from '@/infrastructure/storage/keys';
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
import { FileUploader, fileIsValid, uploadTempFile } from '@/shared/components/file-uploader';
import { Spinner } from '@/shared/components/spinner';
import { FILE_REGISTRY } from '@/shared/constants/file-registry';
import { createGalleryImage, getImageScopeItems } from '../application/products.gallery';
import type { ProductFormSchema } from '../application/products.validation';
import { ProductGalleryImageCard } from './product-gallery-image-card';

const { allowedTypes, maxSize } = FILE_REGISTRY.product_images.image;
const ACCEPT = allowedTypes.join(',');

interface PendingUpload {
  id: string;
  fileName: string;
  previewUrl: string;
  state: 'uploading' | 'error';
}

export function ProductGallerySection() {
  const { control } = useFormContext<ProductFormSchema>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'images',
    keyName: 'fieldKey',
  });
  const variants = useWatch({ control, name: 'variants' });
  const scopeItems = getImageScopeItems(variants ?? []);

  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [skippedCount, setSkippedCount] = useState(0);

  const previewsRef = useRef(previews);
  previewsRef.current = previews;
  useEffect(
    () => () => {
      for (const url of Object.values(previewsRef.current)) {
        URL.revokeObjectURL(url);
      }
    },
    [],
  );

  const totalCount = fields.length + pending.length;

  async function uploadOne(file: File): Promise<void> {
    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    setPending((current) => [
      ...current,
      { id, fileName: file.name, previewUrl, state: 'uploading' },
    ]);

    const tempKey = await uploadTempFile('product_images', 'image', file);
    if (!tempKey) {
      setPending((current) =>
        current.map((item) => (item.id === id ? { ...item, state: 'error' } : item)),
      );
      return;
    }

    setPreviews((current) => ({ ...current, [tempKey]: previewUrl }));
    setPending((current) => current.filter((item) => item.id !== id));
    append(createGalleryImage(tempKey));
  }

  async function handleSelect(files: FileList): Promise<void> {
    const candidates = Array.from(files);
    const valid = candidates.filter((file) => fileIsValid(file, allowedTypes, maxSize));
    setSkippedCount(candidates.length - valid.length);

    for (const file of valid) {
      await uploadOne(file);
    }
  }

  function removePending(item: PendingUpload) {
    URL.revokeObjectURL(item.previewUrl);
    setPending((current) => current.filter((it) => it.id !== item.id));
  }

  function removeImage(index: number) {
    const field = fields[index];
    if (!field) {
      return;
    }
    const previewUrl = previews[field.fileUrl];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviews(({ [field.fileUrl]: _removed, ...rest }) => rest);
    }
    if (isTempKey(field.fileUrl)) {
      deleteTempUpload({ fileKey: field.fileUrl }).catch(() => undefined);
    }
    remove(index);
  }

  return (
    <div className='flex flex-col gap-4 pt-4 border-t'>
      <div>
        <h3 className='font-medium'>Galería</h3>
        <p className='text-sm text-muted-foreground'>
          Imágenes del producto. Asócialas a una variante específica o déjalas como generales. La
          primera es la imagen principal; usa las flechas para cambiar el orden.
        </p>
      </div>

      <FileUploader
        accept={ACCEPT}
        maxSize={maxSize}
        fileInputRef={fileInputRef}
        inputId={inputId}
        onSelect={handleSelect}
      />
      <input
        accept={ACCEPT}
        className='hidden'
        id={inputId}
        multiple
        ref={fileInputRef}
        type='file'
        onChange={(e) => {
          if (e.target.files) {
            handleSelect(e.target.files);
          }
          e.target.value = '';
        }}
      />

      <p className='text-xs text-muted-foreground'>
        {totalCount} {totalCount === 1 ? 'imagen' : 'imágenes'} · JPG, PNG o WebP
      </p>
      {skippedCount > 0 && (
        <p role='alert' className='text-sm text-destructive'>
          {skippedCount === 1 ? 'Se omitió 1 archivo' : `Se omitieron ${skippedCount} archivos`} por
          tipo o tamaño no permitido, o por superar el límite de imágenes.
        </p>
      )}

      {pending.length > 0 && (
        <AttachmentGroup>
          {pending.map((item) => (
            <Attachment key={item.id} state={item.state} orientation='vertical'>
              <AttachmentMedia variant='image'>
                {item.state === 'uploading' ? (
                  <Spinner />
                ) : (
                  <picture>
                    <img src={item.previewUrl} alt={item.fileName} />
                  </picture>
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{item.fileName}</AttachmentTitle>
                <AttachmentDescription>
                  {item.state === 'uploading' ? 'Subiendo…' : 'Error al subir'}
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  aria-label={`Descartar ${item.fileName}`}
                  onClick={() => removePending(item)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}

      {fields.length === 0 && pending.length === 0 && (
        <p className='text-sm text-muted-foreground'>Sin imágenes registradas.</p>
      )}

      {fields.length > 0 && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {fields.map((item, index) => (
            <ProductGalleryImageCard
              key={item.fieldKey}
              index={index}
              previewSrc={isTempKey(item.fileUrl) ? previews[item.fileUrl] : item.fileUrl}
              scopeItems={scopeItems}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              onMove={(direction) => move(index, direction === 'previous' ? index - 1 : index + 1)}
              onRemove={() => removeImage(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
