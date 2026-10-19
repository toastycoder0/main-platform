'use client';

import { Loader2Icon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from 'react-zoom-pan-pinch';
import { buildListHref } from '@/shared/list/list-params';
import { buildMapIndex, findMatchingCellIds } from '../application/warehouse.map';
import type { MapStockRowDTO, NodeDTO } from '../application/warehouse.types';
import { centeredTransform } from '../application/warehouse.zoom';
import { warehouseParams } from '../infrastructure/warehouse.params';
import { WarehouseCellPanel } from './warehouse-cell-panel';
import { WarehouseMapBody } from './warehouse-map-body';
import { WarehouseMapControls } from './warehouse-map-controls';

const ZOOM_SCALE = 1.5;
const ZOOM_ANIMATION_MS = 400;

interface WarehouseMapCanvasProps {
  nodes: NodeDTO[];
  stock: MapStockRowDTO[];
  q: string;
  highlight: string;
  canEdit: boolean;
}

/*
 * The selected cell lives in the `highlight` URL param (server-first): opening
 * or closing the panel writes the param inside a transition, and the panel is
 * derived from the server-provided value so deep links, back button and the UI
 * never diverge. Zoom/pan stays local view state.
 */
export function WarehouseMapCanvas({
  nodes,
  stock,
  q,
  highlight,
  canEdit,
}: WarehouseMapCanvasProps) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [, setParams] = useQueryStates(warehouseParams);
  const prevQueryRef = useRef(q);

  const index = useMemo(() => buildMapIndex(nodes, stock), [nodes, stock]);
  const matchedCellIds = useMemo(() => findMatchingCellIds(index, q), [index, q]);
  const hasSearch = q.length > 0;
  const selectedCellId = highlight !== '' ? highlight : null;
  const selectedEntry = selectedCellId ? index.get(selectedCellId) : undefined;

  const centerCell = useCallback((cellId: string) => {
    const transform = transformRef.current;
    const element = document.getElementById(`map-cell-${cellId}`);
    const wrapper = transform?.instance.wrapperComponent;

    if (!transform || !element || !wrapper) {
      return false;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const center = transform.clientToContent(
      elementRect.left + elementRect.width / 2,
      elementRect.top + elementRect.height / 2,
    );
    const target = centeredTransform(center, wrapperRect, ZOOM_SCALE);

    transform.setTransform(target.positionX, target.positionY, target.scale, ZOOM_ANIMATION_MS);

    return true;
  }, []);

  const handleCellClick = useCallback(
    (cellId: string) => {
      if (isPending) {
        return;
      }

      centerCell(cellId);
      startTransition(() => {
        setParams({ highlight: cellId });
      });
    },
    [centerCell, isPending, setParams],
  );

  const handlePanelClose = useCallback(() => {
    if (isPending) {
      return;
    }

    startTransition(() => {
      setParams({ highlight: null });
    });
  }, [isPending, setParams]);

  // Center a deep-linked highlight once per selection session.
  useEffect(() => {
    if (!highlight || hasCentered) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (centerCell(highlight)) {
        setHasCentered(true);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [highlight, hasCentered, centerCell]);

  useEffect(() => {
    if (!highlight) {
      setHasCentered(false);
    }
  }, [highlight]);

  // A new search invalidates the previously selected cell.
  useEffect(() => {
    const queryChanged = prevQueryRef.current !== q;
    prevQueryRef.current = q;

    if (queryChanged && q.length > 0 && highlight) {
      startTransition(() => {
        setParams({ highlight: null });
      });
    }
  }, [q, highlight, setParams]);

  useEffect(() => {
    if (!selectedCellId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handlePanelClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCellId, handlePanelClose]);

  return (
    <div
      aria-busy={isPending}
      className='relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100'
      data-slot='warehouse-map'
    >
      <div className='absolute inset-0'>
        <TransformWrapper
          centerOnInit={false}
          initialScale={0.75}
          limitToBounds={false}
          maxScale={4}
          minScale={0.2}
          panning={{ velocityDisabled: true }}
          pinch={{ step: 3 }}
          ref={transformRef}
          trackPadPanning={{ disabled: false }}
          wheel={{ step: 0.01, wheelDisabled: true }}
        >
          <TransformComponent
            contentClass='!w-auto !h-auto'
            wrapperClass='!w-full !h-full'
            wrapperStyle={{ userSelect: 'none' }}
          >
            <div className='inline-flex flex-col gap-4 p-8'>
              {nodes.map((node) => (
                <div className='flex flex-col gap-10' key={node.id}>
                  <span className='text-xs font-semibold uppercase tracking-wide text-neutral-500 whitespace-nowrap'>
                    {node.name}
                  </span>
                  <WarehouseMapBody
                    depth={0}
                    hasSearch={hasSearch}
                    index={index}
                    matchedCellIds={matchedCellIds}
                    node={node}
                    onSelect={handleCellClick}
                    selectedCellId={selectedCellId}
                  />
                </div>
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {isPending ? (
        <div className='absolute inset-0 z-30 flex items-center justify-center bg-neutral-100/40'>
          <span className='sr-only'>Actualizando mapa…</span>
          <Loader2Icon aria-hidden className='size-6 animate-spin text-neutral-500' />
        </div>
      ) : null}

      {selectedEntry ? (
        <div className='absolute inset-y-0 right-0 z-10 flex w-80 flex-col pointer-events-none'>
          <div className='pointer-events-auto flex h-full flex-col rounded-r-lg ring-1 ring-black/5 backdrop-blur-sm bg-white/95'>
            <WarehouseCellPanel
              canEdit={canEdit}
              cellCode={selectedEntry.cell.code}
              cellId={selectedEntry.cell.id}
              details={selectedEntry.stock}
              movementHref={buildListHref('/warehouse', {
                view: 'map',
                q,
                movement: 'transfer',
                cell: selectedEntry.cell.id,
              })}
              occupancy={selectedEntry.occupancy}
              onClose={handlePanelClose}
              stockCount={selectedEntry.stock.length}
            />
          </div>
        </div>
      ) : null}

      <WarehouseMapControls panelOpen={selectedEntry !== undefined} transformRef={transformRef} />
    </div>
  );
}
