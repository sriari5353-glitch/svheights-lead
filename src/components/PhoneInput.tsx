
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { formatPhoneForDisplay, addIndiaCode, normalizePhoneNumber } from '@/utils/phoneUtils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = "Enter phone number",
  className
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatPhoneForDisplay(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw value when focused for easy editing
    setDisplayValue(value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Process and format the phone number when user finishes editing
    const processed = addIndiaCode(displayValue);
    onChange(processed);
    setDisplayValue(formatPhoneForDisplay(processed));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    if (isFocused) {
      // Update the actual value immediately while typing
      onChange(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Extract only digits from pasted content
    const digitsOnly = pastedText.replace(/\D/g, '');
    
    if (digitsOnly) {
      // Process and add India code if needed
      const processed = addIndiaCode(digitsOnly);
      setDisplayValue(processed);
      onChange(processed);
    }
  };

  return (
    <Input
      type="tel"
      value={displayValue}
      onChange={handleChange}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
};
