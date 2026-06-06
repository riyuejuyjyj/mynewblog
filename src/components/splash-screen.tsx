"use client";

import { useEffect } from "react";
import Image from "next/image";

import { profile } from "@/content/seed";

const SPLASH_KEY = "mynewblog:splash-seen";

export function SplashScreen() {
  useEffect(() => {
    const root = document.documentElement;

    if (window.sessionStorage.getItem(SPLASH_KEY)) {
      root.classList.add("splash-seen");
      return;
    }

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(SPLASH_KEY, "true");
      root.classList.add("splash-seen");
    }, 2350);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="splash-screen" aria-hidden="true">
      <div className="splash-card">
        <div className="splash-avatar">
          <Image src={profile.avatar} alt="" width={82} height={82} />
          <span />
        </div>
        <div className="splash-copy">
          <p>INITIALIZING SYSTEM</p>
          <h1>{profile.name}</h1>
        </div>
        <div className="splash-progress">
          <span />
        </div>
      </div>
    </div>
  );
}
