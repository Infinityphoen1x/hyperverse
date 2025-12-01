// src/hooks/useToast.ts
import * as React from "react";
import { useToastStore } from '@/stores/useToastStore';
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type Toast = Omit<ToasterToast, "id">;

export function useToast() {
  const { toasts, toast: addToast, dismiss } = useToastStore();

  return {
    toasts,
    toast: (props: Toast) => addToast(props),
    dismiss,
  };
}

export { toast } from '@/stores/useToastStore'; // Re-export toast function for direct use