'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from 'react-zoom-pan-pinch';
import { buildMapIndex, findMatchingCellIds } from '../application/warehouse.map';
import type { MapStockRowDTO, NodeDTO } from '../application/warehouse.types';
import { WarehouseCellPanel } from './warehouse-cell-panel';
import { WarehouseMapBody } from './warehouse-map-body';
import { WarehouseMapControls } from './warehouse-map-controls';

interface WarehouseMapCanvasProps {
  nodes: NodeDTO[];
  stock: MapStockRowDTO[];
  q: string;
  highlight: string;
  canEdit: boolean;
  movementHref: string;
}

export function WarehouseMapCanvas({
  nodes,
  stock,
  q,
  highlight,
  canEdit,
  movementHref,
}: WarehouseMapCanvasProps) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hasCentered, setHasCentered] = useState(false);
  const prevQueryRef = useRef(q);

  const index = useMemo(() => buildMapIndex(nodes, stock), [nodes, stock]);
  const matchedCellIds = useMemo(() => findMatchingCellIds(index, q), [index, q]);
  const hasSearch = q.length > 0;
  const selectedEntry = selectedCellId ? index.get(selectedCellId) : undefined;

  const handleCellClick = useCallback((cellId: string) => {
    setSelectedCellId(cellId);
    setPanelOpen(true);

    const element = document.getElementById(`map-cell-${cellId}`);

    if (element) {
      transformRef.current?.zoomToElement(element, 1.5, 400);
    }
  }, []);

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
    setSelectedCellId(null);
  }, []);

  useEffect(() => {
    if (!highlight || hasCentered || !transformRef.current) {
      return;
    }

    const element = document.getElementById(`map-cell-${highlight}`);

    if (!element) {
      return;
    }

    transformRef.current.zoomToElement(element, 1.5, 400);
    setSelectedCellId(highlight);
    setPanelOpen(true);
    setHasCentered(true);
  }, [highlight, hasCentered]);

  useEffect(() => {
    if (!highlight) {
      setHasCentered(false);
    }
  }, [highlight]);

  useEffect(() => {
    const queryChanged = prevQueryRef.current !== q;
    prevQueryRef.current = q;

    if (queryChanged && q.length > 0) {
      setPanelOpen(false);
      setSelectedCellId(null);
    }
  }, [q]);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handlePanelClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelOpen, handlePanelClose]);

  return (
    <div
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
          wheel={{ step: 0.001 }}
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
                    selectedCellId={panelOpen ? selectedCellId : null}
                  />
                </div>
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {panelOpen && selectedEntry ? (
        <div className='absolute inset-y-0 right-0 z-10 flex w-80 flex-col pointer-events-none'>
          <div className='pointer-events-auto flex h-full flex-col rounded-r-lg ring-1 ring-black/5 backdrop-blur-sm bg-white/95'>
            <WarehouseCellPanel
              canEdit={canEdit}
              cellCode={selectedEntry.cell.code}
              cellId={selectedEntry.cell.id}
              details={selectedEntry.stock}
              movementHref={movementHref}
              occupancy={selectedEntry.occupancy}
              onClose={handlePanelClose}
              stockCount={selectedEntry.stock.length}
            />
          </div>
        </div>
      ) : null}

      <WarehouseMapControls panelOpen={panelOpen} transformRef={transformRef} />
    </div>
  );
}
