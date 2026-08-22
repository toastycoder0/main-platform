'use client';

import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/shared/components/button';
import { Calendar } from '@/shared/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/popover';

export function DatePickerDemo() {
  const [date, setDate] = React.useState<Date>();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          data-empty={!date}
          className='justify-start text-left font-normal data-[empty=true]:text-muted-foreground'
        >
          <CalendarIcon />
          {date ? format(date, 'PPP') : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0'>
        <Calendar mode='single' selected={date} onSelect={setDate} />
      </PopoverContent>
    </Popover>
  );
}
