"use client";

import type { StatusMessage } from "@/types/variable";

import { useCallback } from "react";
import { addToast, closeAll } from "@heroui/toast";

type ToastVariant = "success" | "error";

const TITLE_MAP: Record<ToastVariant, string> = {
  success: "All good",
  error: "Something went wrong",
};

const COLOR_MAP: Record<ToastVariant, "success" | "danger"> = {
  success: "success",
  error: "danger",
};

export const useToastMessage = () => {
  const setMessage = useCallback((message: StatusMessage) => {
    const variant = message.type as ToastVariant;

    addToast({
      title: TITLE_MAP[variant],
      description: message.text,
      color: COLOR_MAP[variant],
      variant: "bordered",
      classNames: {
        base: "z-1000",
      },
    });
  }, []);

  const clearMessage = useCallback(() => {
    closeAll();
  }, []);

  return {
    setMessage,
    clearMessage,
  };
};

export type UseToastMessageReturn = ReturnType<typeof useToastMessage>;
