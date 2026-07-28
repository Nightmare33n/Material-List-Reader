import { useMemo, useState } from "react";
import type { MaterialItem } from "../types";
import { buildCandidateUrls, formatBlockName } from "../textureResolver";

interface SlotProps {
  item: MaterialItem;
  manifest: Map<string, string> | null;
}

export default function Slot({ item, manifest }: SlotProps) {
  const candidates = useMemo(() => buildCandidateUrls(item.id, manifest), [item.id, manifest]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const exhausted = candidateIndex >= candidates.length;

  const displayName = formatBlockName(item.id);

  return (
    <div className="slot" title={`${displayName}\n${item.count.toLocaleString()}`}>
      <div className="slot-icon-wrap">
        {!exhausted ? (
          <img
            key={candidates[candidateIndex]}
            src={candidates[candidateIndex]}
            alt={displayName}
            className="slot-icon"
            draggable={false}
            onError={() => setCandidateIndex((i) => i + 1)}
          />
        ) : (
          <div className="slot-icon slot-icon-missing" />
        )}
      </div>
      <span className="slot-count">{item.count.toLocaleString()}</span>
      <div className="slot-tooltip">
        <div className="slot-tooltip-name">{displayName}</div>
        <div className="slot-tooltip-count">{item.count.toLocaleString()} unidades</div>
      </div>
    </div>
  );
}
