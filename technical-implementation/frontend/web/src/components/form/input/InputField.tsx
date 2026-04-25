import React, { FC } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  defaultValue,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
}) => {
  let inputClasses = `h-11 w-full appearance-none rounded-lg border px-3.5 py-2.5 text-sm shadow-none placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${className}`;

  if (disabled) {
    inputClasses += ` cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`;
  } else if (error) {
    inputClasses += ` border-error-300 bg-white text-error-800 focus:border-error-400 focus:ring-error-100 dark:border-error-500 dark:bg-gray-900 dark:text-error-300`;
  } else if (success) {
    inputClasses += ` border-success-300 bg-white text-success-700 focus:border-success-400 focus:ring-success-100 dark:border-success-500 dark:bg-gray-900 dark:text-success-300`;
  } else {
    inputClasses += ` border-gray-300 bg-white text-gray-900 focus:border-brand-300 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClasses}
      />

      {hint && (
        <p
          className={`mt-1.5 text-xs leading-5 ${
            error
              ? "text-error-600"
              : success
              ? "text-success-700"
              : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
