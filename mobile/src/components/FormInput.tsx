import React, { useState, useEffect, useRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface FormInputProps extends TextInputProps {
  debounceMs?: number;
}

export const FormInput = React.memo(({ value, onChangeText, debounceMs = 300, ...props }: FormInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <TextInput
      {...props}
      value={localValue}
      onChangeText={(t) => {
        setLocalValue(t);
        if (onChangeText) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            onChangeText(t);
          }, debounceMs);
        }
      }}
    />
  );
});
