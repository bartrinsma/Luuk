"use client";

import { useEffect, useRef, useState } from "react";

/** Homepagevideo; verdwijnt als public/video/monte-amigo.mp4 (nog) ontbreekt. */
export function HomeVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Het fout-event kan al zijn afgegaan vóór hydratie.
    if (v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) setMissing(true);
    const onError = () => setMissing(true);
    v.addEventListener("error", onError, true);
    return () => v.removeEventListener("error", onError, true);
  }, []);

  if (missing) return null;
  return (
    <div className="video">
      <video ref={ref} controls preload="metadata" playsInline poster="/img/hero-cliff.jpg">
        <source src="/video/monte-amigo.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
