import { ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export default function BentoCard({ children, className = "", padding = true }: BentoCardProps) {
  return (
    <div 
      className={`bg-white rounded-[12px] transition-all duration-300 border border-gray-100 ${
        padding ? 'p-6' : ''
      } ${className}`}
      style={{ 
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02), 0 8px 24px rgba(0, 0, 0, 0.04)' 
      }}
    >
      {children}
    </div>
  );
}
