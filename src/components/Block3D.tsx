import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const [fallbackParticle, setFallbackParticle] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    setGroup(null);
    setFallbackParticle(undefined);

    if (!isWebglAvailable()) {
      setFallbackParticle(null);
      return;
    }

    resolveBlockModel(id)
      .then((model) => {
        if (cancelled) return;
        if (!model) {
          setFallbackParticle(null);
          return;
        }

        // A model can also reference a texture slot its parent never fills (pointed
        // dripstone's `#cross`), which builds an empty mesh rather than failing.
        const mesh = model.elements.length ? buildBlockMesh(model, tintForBlock(id)) : null;
        if (!mesh || mesh.children.length === 0) {
          if (mesh) disposeGroup(mesh);
          setFallbackParticle(particlePath(model));
          return;
        }

        setGroup(mesh);
      })
      .catch(() => {
        if (!cancelled) setFallbackParticle(null);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  /*
    Registering in a layout effect guarantees the anchor is already in the DOM: doing it
    from a requestAnimationFrame callback could fire before React committed the element,
    and that block would then never be drawn.

    This effect also owns the mesh, so it is always unregistered before being disposed.
  */
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!group || !anchor) return;

    const unregister = registerBlock(group, anchor);
    return () => {
      unregister();
      disposeGroup(group);
    };
  }, [group]);

  if (fallbackParticle !== undefined) {
    return <BlockIcon2D id={id} alt={alt} particle={fallbackParticle} />;
  }

  return <div ref={anchorRef} className="block-3d" role="img" aria-label={alt} />;
}
