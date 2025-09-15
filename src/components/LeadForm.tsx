
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PhoneInput } from '@/components/PhoneInput';
import { useCRM } from '@/context/CRMContext';
import type { LeadSource, LeadStatus, Feedback } from '@/types/crm';
import { isValidIndianMobile } from '@/utils/phoneUtils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeadFormProps {
  onSuccess?: () => void;
  initialData?: {
    name: string;
    phone: string;
    source: LeadSource;
    sourceDetails?: string;
    status: LeadStatus;
    notes: string;
    feedback: Feedback;
    leadDate?: string;
  };
  isEditing?: boolean;
  leadId?: string;
}

export const LeadForm: React.FC<LeadFormProps> = ({ 
  onSuccess, 
  initialData, 
  isEditing = false, 
  leadId 
}) => {
  const { addLead, updateLead } = useCRM();
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    source: initialData?.source || 'Walk-in' as LeadSource,
    sourceDetails: initialData?.sourceDetails || '',
    
    notes: initialData?.notes || '',
    feedback: initialData?.feedback || '' as Feedback,
  });

  // Fix date handling to avoid timezone issues
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (initialData?.leadDate) {
      // Parse the date string and create a date in local timezone
      const dateStr = initialData.leadDate;
      if (dateStr.includes('T')) {
        // If it's an ISO string, parse it properly
        return new Date(dateStr);
      } else {
        // If it's just a date string, create a local date
        return new Date(dateStr + 'T00:00:00');
      }
    }
    return undefined;
  });

  const [phoneError, setPhoneError] = useState('');

  const handlePhoneChange = (phone: string) => {
    setFormData(prev => ({ ...prev, phone }));
    
    // Validate phone number
    if (phone && !isValidIndianMobile(phone)) {
      setPhoneError('Please enter a valid Indian mobile number');
    } else {
      setPhoneError('');
    }
  };

  // Fix date selection to avoid timezone issues
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Create a new date in local timezone to avoid timezone conversion issues
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(localDate);
    } else {
      setSelectedDate(undefined);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }
    
    if (!formData.phone.trim()) {
      return;
    }
    
    if (!isValidIndianMobile(formData.phone)) {
      setPhoneError('Please enter a valid Indian mobile number');
      return;
    }

    // Format date properly to avoid timezone issues
    let leadDateString: string | undefined;
    if (selectedDate) {
      // Format as YYYY-MM-DD to avoid timezone conversion
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      leadDateString = `${year}-${month}-${day}T00:00:00.000Z`;
    }

    const leadData = {
      ...formData,
      status: 'New Lead' as LeadStatus, // Default status since we removed the UI
      leadDate: leadDateString,
    };

    if (isEditing && leadId) {
      updateLead({
        id: leadId,
        ...leadData,
      });
    } else {
      const result = addLead(leadData);
      if (!result.ok) {
        return;
      }
    }

    // Reset form if adding new lead
    if (!isEditing) {
      setFormData({
        name: '',
        phone: '',
        source: 'Walk-in',
        sourceDetails: '',
        notes: '',
        feedback: '',
      });
      setSelectedDate(undefined);
    }
    
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter lead name"
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone Number *</Label>
        <PhoneInput
          value={formData.phone}
          onChange={handlePhoneChange}
          placeholder="Enter phone number"
        />
        {phoneError && (
          <p className="text-sm text-red-600 mt-1">{phoneError}</p>
        )}
      </div>

      <div>
        <Label>Lead Date (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="source">Source</Label>
        <Select
          value={formData.source}
          onValueChange={(value: LeadSource) => setFormData(prev => ({ ...prev, source: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Walk-in">Walk-in</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
            <SelectItem value="Social Media">Social Media</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="sourceDetails">Extra Notes (Source Details)</Label>
        <Input
          id="sourceDetails"
          value={formData.sourceDetails}
          onChange={(e) => setFormData(prev => ({ ...prev, sourceDetails: e.target.value }))}
          placeholder="Add additional information about the source"
        />
      </div>


      <div>
        <Label htmlFor="feedback">Feedback</Label>
        <Select
          value={formData.feedback}
          onValueChange={(value: Feedback) => setFormData(prev => ({ ...prev, feedback: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select feedback (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Prospect">Prospect</SelectItem>
            <SelectItem value="Follow-up">Follow-up</SelectItem>
            <SelectItem value="Visited">Visited</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add any notes about this lead"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full">
        {isEditing ? 'Update Lead' : 'Add Lead'}
      </Button>
    </form>
  );
};
