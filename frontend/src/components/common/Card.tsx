import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  ...props
}: CardSectionProps) {
  return (
    <div className={`card-header ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
  ...props
}: CardSectionProps) {
  return (
    <div className={`card-body ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = "",
  ...props
}: CardSectionProps) {
  return (
    <div className={`card-footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}