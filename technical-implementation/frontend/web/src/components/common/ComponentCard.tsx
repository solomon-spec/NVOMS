import React from "react";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
}) => {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/60">
        <h3 className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white/90">
          {title}
        </h3>
        {desc && (
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {desc}
          </p>
        )}
      </div>

      <div className="p-5 sm:p-5">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
