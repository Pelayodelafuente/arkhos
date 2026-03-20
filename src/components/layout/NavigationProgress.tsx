"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathname = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Pathname changed — complete the bar
    if (prevPathname.current !== pathname) {
      setProgress(100); // eslint-disable-line react-hooks/set-state-in-effect -- navigation progress animation
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      prevPathname.current = pathname;
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  // Listen for click on internal links to start progress
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href === pathname) return;

      setProgress(13);
      setVisible(true);

      // Simulate progress
      setTimeout(() => setProgress(40), 50);
      setTimeout(() => setProgress(65), 200);
      setTimeout(() => setProgress(80), 500);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[200] h-[2px]"
      style={{ opacity: visible || progress === 100 ? 1 : 0, transition: "opacity 300ms" }}
    >
      <div
        className="h-full bg-accent"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : progress === 100 ? "width 200ms ease-out" : "width 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    </div>
  );
}
