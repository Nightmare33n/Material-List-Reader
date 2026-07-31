import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { resolveBlockModel, particlePath } from "../mc/modelResolver";
import { buildBlockMesh, disposeGroup } from "../mc/buildMesh";
import { registerBlock, isWebglAvailable } from "../mc/renderPool";
import { tintForBlock } from "../mc/tints";
import BlockIcon2D from "./BlockIcon2D";

interface Block3DProps {
  id: string;
  alt: string;
}

/**
 * Reserves the slot's drawing area for a block. The pixels themselves come from the
 * shared WebGL overlay, which draws into this element's rectangle each frame.
 *
 * Anything without drawable geometry falls back to a flat icon: plain items, and blocks
 * the game draws as entities (signs, chests, statues).
 */
export default function Block3D({ id, alt }: Block3DProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [hasModel, setHasModel] = useState<boolean | null>(null);
  const [particle, setParticle] = useState<string | null>(null);

  useEffect(() => {
    if (!isWebglAvailable()) {
      setHasModel(false);
      return;
    }

    let cancelled = false;
    let group: THREE.Group | null = null;
    let unregister: (() => void) | null = null;

    setHasModel(null);
    setParticle(null);

    resolveBlockModel(id)
      .then((model) => {
        if (cancelled) return;
        if (!model) {
          setHasModel(false);
          return;
        }

        // A model can also reference a texture slot its parent never fills (pointed
        // dripstone's `#cross`), which builds an empty mesh rather than failing.
        const built = model.elements.length ? buildBlockMesh(model, tintForBlock(id)) : null;
        if (!built || built.children.length === 0) {
          if (built) disposeGroup(built);
          setParticle(particlePath(model));
          setHasModel(false);
          return;
        }

        setHasModel(true);
        group = built;

        // The anchor only exists once hasModel flips to true, so wait a frame for it.
        requestAnimationFrame(() => {
          if (cancelled || !group || !anchorRef.current) return;
          unregister = registerBlock(group, anchorRef.current);
        });
      })
      .catch(() => {
        if (!cancelled) setHasModel(false);
      });

    return () => {
      cancelled = true;
      unregister?.();
      if (group) disposeGroup(group);
    };
  }, [id]);

  if (hasModel === false) return <BlockIcon2D id={id} alt={alt} particle={particle} />;

  return <div ref={anchorRef} className="block-3d" role="img" aria-label={alt} />;
}
