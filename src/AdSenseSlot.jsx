import { useEffect, useRef } from "react";

const publisherId = import.meta.env.VITE_ADSENSE_CLIENT || "";
const publisherIdIsValid = /^ca-pub-\d+$/.test(publisherId);

function loadAdSenseScript() {
  const existingScript = document.querySelector("script[data-adsense-client]");
  if (existingScript) return;

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.dataset.adsenseClient = publisherId;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
  document.head.appendChild(script);
}

export default function AdSenseSlot({ slotId, className = "" }) {
  const adRef = useRef(null);
  const slotIsValid = /^\d+$/.test(slotId || "");

  useEffect(() => {
    if (!publisherIdIsValid || !slotIsValid || !adRef.current) return;

    loadAdSenseScript();
    if (adRef.current.dataset.adsenseRequested) return;

    adRef.current.dataset.adsenseRequested = "true";
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  }, [slotIsValid]);

  if (!publisherIdIsValid || !slotIsValid) return null;

  return (
    <aside className={`mx-auto max-w-[1100px] px-5 sm:px-8 ${className}`} aria-label="Advertisement">
      <p className="mb-2 text-center text-[9px] uppercase tracking-[0.14em] text-muted">Advertisement</p>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: "100px" }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
