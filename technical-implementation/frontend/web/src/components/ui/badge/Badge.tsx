import React from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant; // Light or solid variant
  size?: BadgeSize; // Badge size
  color?: BadgeColor; // Badge color
  startIcon?: React.ReactNode; // Icon at the start
  endIcon?: React.ReactNode; // Icon at the end
  children: React.ReactNode; // Badge content
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-1 rounded px-2 py-1 font-semibold border";

  // Define size styles
  const sizeStyles = {
    sm: "text-theme-xs",
    md: "text-theme-xs",
  };

  // Define color styles for variants
  const variants = {
    light: {
      primary:
        "border-brand-100 bg-brand-50 text-brand-700",
      success:
        "border-success-100 bg-success-50 text-success-700",
      error:
        "border-error-200 bg-error-50 text-error-700",
      warning:
        "border-warning-100 bg-warning-50 text-warning-700",
      info:
        "border-brand-100 bg-brand-50 text-brand-700",
      light: "border-gray-200 bg-gray-50 text-gray-700",
      dark: "border-gray-300 bg-gray-100 text-gray-800",
    },
    solid: {
      primary: "border-brand-700 bg-brand-700 text-white",
      success: "border-success-600 bg-success-600 text-white",
      error: "border-error-600 bg-error-600 text-white",
      warning: "border-warning-500 bg-warning-500 text-white",
      info: "border-brand-600 bg-brand-600 text-white",
      light: "border-gray-400 bg-gray-400 text-white",
      dark: "border-gray-700 bg-gray-700 text-white",
    },
  };

  // Get styles based on size and color variant
  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
