import type React from "react";
import Link from "next/link";

interface DropdownItemProps {
  tag?: "a" | "button";
  href?: string;
  onClick?: () => void;
  onItemClick?: () => void;
  baseClassName?: string;
  className?: string;
  children: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  tag = "button",
  href,
  onClick,
  onItemClick,
  baseClassName = "block w-full rounded-lg px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900",
  className = "",
  children,
}) => {
  const combinedClasses = `${baseClassName} ${className}`.trim();

  const handleClick = (event: React.MouseEvent) => {
    if (tag === "button") {
      event.preventDefault();
    }
    if (onClick) onClick();
    if (onItemClick) onItemClick();
  };

  if (tag === "a" && href) {
    return (
      <Link href={href} className={combinedClasses} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className={combinedClasses}>
      {children}
    </button>
  );
};
