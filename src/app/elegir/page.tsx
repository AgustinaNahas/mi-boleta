"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** El flujo vive en la home (#elegir); conservamos la ruta por links viejos. */
export default function ElegirPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/#elegir");
  }, [router]);

  return (
    <p className="py-16 text-sm text-ink-muted">
      Redirigiendo a{" "}
      <a href="#elegir" className="underline underline-offset-2">
        Elegí tu lista
      </a>
      …
    </p>
  );
}
