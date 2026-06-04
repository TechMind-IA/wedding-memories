/**
 * Nome: components/ui/skeleton.tsx
 * Função: Fornece o componente de interface Skeleton reutilizado nas telas.
 */

import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
