
import React from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  label?: string;
  className?: string;
}

export default function DatePicker({ selectedDate, onSelectDate, label, className }: DatePickerProps) {
  const quickDateOptions = [
    { label: "Today", date: new Date() },
    { label: "Yesterday", date: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { label: "Last Week", date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  ];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <div className="text-sm font-medium">{label}</div>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(selectedDate, "PPP")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Clock className="h-4 w-4" />
              Quick Jump
            </div>
            <div className="flex flex-wrap gap-1">
              {quickDateOptions.map((option) => (
                <Button
                  key={option.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectDate(option.date)}
                  className="h-7 px-2 text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onSelectDate(date)}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
