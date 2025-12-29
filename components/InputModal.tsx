import React, { useEffect, useRef, useState } from 'react';

interface InputModalProps {
  title: string;
  prompt: string;
  defaultValue?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  validationError?: string;
}

export const InputModal: React.FC<InputModalProps> = ({
  title,
  prompt,
  defaultValue = '',
  isOpen,
  onClose,
  onSubmit,
  validationError
}) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setValue(defaultValue);
      inputRef.current.focus();
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit(value);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border-2 border-blue-500 p-6 w-[480px] shadow-2xl">
        <h2 className="text-blue-400 font-bold mb-4 text-xl uppercase tracking-wider border-b border-blue-900 pb-2">
          {title}
        </h2>
        
        <div className="mb-4">
          <p className="text-gray-400 mb-2">{prompt}</p>
          <div className="flex items-center">
            <span className="text-green-500 mr-2">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-b-2 border-gray-600 text-white w-full focus:outline-none focus:border-green-500 font-mono text-lg py-1 terminal-cursor"
              placeholder="Type here..."
            />
          </div>
        </div>

        {validationError && (
          <div className="text-red-500 mb-4 bg-red-900/20 p-2 border border-red-900 text-sm">
            ! {validationError}
          </div>
        )}

        <div className="flex justify-end text-sm text-gray-500 gap-4 mt-6">
          <span>[ENTER] Confirm</span>
          <span>[ESC] Cancel</span>
        </div>
      </div>
    </div>
  );
};