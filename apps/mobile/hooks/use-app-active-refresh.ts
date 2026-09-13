import { useEffect, useRef } from "react";
import { AppState } from "react-native";

export function useAppActiveRefresh(callback: () => void | Promise<void>) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void callbackRef.current();
    });
    return () => subscription.remove();
  }, []);
}
