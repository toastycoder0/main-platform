import { Skeleton } from '@/shared/components/skeleton';

export default function OrderManagementLoading() {
  return (
    <div className='flex w-full flex-col gap-6'>
      <Skeleton className='h-8 w-28' />
      <Skeleton className='h-9 w-64' />

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'>
        <div className='flex flex-col gap-6'>
          <Skeleton className='h-36 w-full' />
          <Skeleton className='h-64 w-full' />
          <Skeleton className='h-48 w-full' />
        </div>
        <div className='flex flex-col gap-6'>
          <Skeleton className='h-48 w-full' />
          <Skeleton className='h-48 w-full' />
          <Skeleton className='h-40 w-full' />
        </div>
      </div>
    </div>
  );
}
