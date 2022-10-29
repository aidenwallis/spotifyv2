import { useEffect, useState } from "react";

export function useImageLoaded(src?: string) {
  const [loaded, setLoaded] = useState("");

  useEffect(() => {
    if (!src) {
      return;
    }

    const image = new Image();
    image.onload = () => setLoaded(src);
    image.src = src;

    return () => {
      setLoaded("");
    };
  }, [setLoaded, src]);

  return loaded;
}
