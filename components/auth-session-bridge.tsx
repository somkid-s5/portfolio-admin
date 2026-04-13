"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabaseClient";
import { syncAdminSessionCookie } from "@/lib/adminSessionCookie";

export function AuthSessionBridge() {
  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      await syncAdminSessionCookie(
        session?.access_token ?? null,
        session?.expires_at
      );
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncAdminSessionCookie(
        session?.access_token ?? null,
        session?.expires_at
      );
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
