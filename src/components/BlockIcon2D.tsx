import { useEffect, useMemo, useState } from "react";
import { getItemTextures, iconCandidates } from "../mc/itemTextures";

interface BlockIcon2DProps {
  id: string;
  alt: string;
  /** Particle texture of the block's model, when it has one, as a mid-priority candidate. */
  particle?: string | null;
}

/**
 * Flat-icon fallback for anything without usable model geometry: blocks the game draws
 * as entities (signs, chests, banners, statues) and plain items.
 */
export default function BlockIcon2D({ id, alt, particle }: BlockIcon2DProps) {
  const [map, setMap] = useState<Map<string, string> | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getItemTextures()
      .then((m) => !cancelled && setMap(m))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const candidates = useMemo(() => iconCandidates(id, map, particle), [id, map, particle]);

  // Restart the cascade when the mapping arrives and puts a better candidate first.
  useEffect(() => setIndex(0), [candidates]);

  if (index >= candidates.length) return <div className="block-missing" />;

  return (
    <img
      key={candidates[index]}
      src={candidates[index]}
      alt={alt}
      className="block-2d"
      draggable={false}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
