"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { BrandMark } from "@/components/brand-mark";

function readShowBack(pathname: string) {
  if (typeof window === "undefined") return pathname !== "/";
  const params = new URLSearchParams(window.location.search);
  const hasDeep = params.has("ley") || params.has("lista");
  return pathname !== "/" || hasDeep;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [showBack, setShowBack] = useState(() => readShowBack(pathname));

  useEffect(() => {
    function sync() {
      setShowBack(readShowBack(pathname));
    }
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("mb:urlchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("mb:urlchange", sync);
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-paper/90 backdrop-blur-md">
      <div className="shell cols items-center py-4">
        <div className="col-span-2 flex items-center gap-3 sm:col-span-3 sm:gap-4 lg:col-span-4">
          <Link href="/" className="inline-flex items-center" aria-label="Inicio">
            <BrandMark className="h-7 w-10" />
          </Link>
          {showBack ? <BackLink /> : null}
        </div>
        <div className="col-span-2 flex items-center justify-end gap-4 sm:col-span-5 sm:gap-6 lg:col-span-12">
          <Link
            href="/metodologia/"
            className="text-sm font-medium text-ink transition hover:opacity-60"
          >
            Metodología
          </Link>
        </div>
      </div>
    </header>
  );
}
