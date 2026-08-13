"use client";

import { useRouter } from "next/navigation";

type Props = {
  className?: string;
  label?: string;
};

function notifyUrlChange() {
  window.dispatchEvent(new Event("mb:urlchange"));
}

/** Vuelve al historial interno; si no hay página previa del sitio, va a home. */
export function BackLink({ className = "", label = "Volver" }: Props) {
  const router = useRouter();

  function goBack() {
    if (typeof window === "undefined") {
      router.push("/");
      return;
    }

    const url = new URL(window.location.href);
    const hasDeepLink =
      url.searchParams.has("ley") || url.searchParams.has("lista");

    // Selección hecha en esta sesión: el pushState dejó { mb: true }.
    if (window.history.state?.mb && window.history.length > 1) {
      router.back();
      return;
    }

    // Link compartido /?ley= o /?lista=: limpiar query sin salir del sitio.
    if (hasDeepLink) {
      url.search = "";
      window.history.pushState({ mb: true }, "", `${url.pathname}${url.hash}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
      notifyUrlChange();
      return;
    }

    try {
      const referrer = document.referrer;
      const sameOrigin =
        Boolean(referrer) &&
        new URL(referrer).origin === window.location.origin;
      if (sameOrigin && window.history.length > 1) {
        router.back();
        return;
      }
    } catch {
      // referrer inválido → home
    }

    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`text-sm font-medium text-ink transition hover:opacity-60 ${className}`}
    >
      ← {label}
    </button>
  );
}
