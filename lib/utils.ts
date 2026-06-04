/**
 * Nome: lib/utils.ts
 * Função: Concentra utilitários de Utils usados pela aplicação.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}