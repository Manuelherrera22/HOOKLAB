"use client";

import { useEffect, useState } from "react";
import { useStore as useStoreBase } from "@/store/useStore";

/**
 * Hydration-safe wrapper for Zustand store.
 * Prevents SSR/client mismatch by returning default values on the server
 * and only reading persisted state after mount.
 */
export function useHydrated() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    return hydrated;
}

export { useStoreBase as useStore };
