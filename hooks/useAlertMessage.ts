import { useCallback, useState } from "react";

import { StatusMessage } from "@/types/variable";

export const useAlertMessage = (
  initialMessage: StatusMessage | null = null
) => {
  const [message, setMessage] = useState<StatusMessage | null>(initialMessage);

  const setAlert = useCallback((data: StatusMessage | null) => {
    setMessage(data);
  }, []);

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  return {
    message,
    setMessage: setAlert,
    clearMessage,
  };
};

export type UseAlertMessageReturn = ReturnType<typeof useAlertMessage>;
