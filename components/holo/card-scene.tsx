"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Card } from "@/lib/cards";
import { tilt } from "@/hooks/use-device-tilt";
import { CARD_H, CARD_W, createCardGeometry } from "./card-geometry";
import { createHoloMaterial, foilMode, type HoloMaterial } from "./holo-material";
import { CARD_FILL, type StageInput } from "./stage-input";

const TAU = Math.PI * 2;

const FOV = 30;

export type Framing = {
  /** Share of the stage's height the card fills at rest. */
  fill: number;
  /** Shift the card up by this share of the stage height (screen-space, no perspective change). */
  lift: number;
};

function FitCamera({ fill, lift }: Framing) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const span = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const aspect = size.width / size.height;
    // Fill `fill` of the height, unless that would overflow 86% of the width.
    const byHeight = CARD_H / (fill * span);
    const byWidth = CARD_W / (0.86 * span * aspect);
    cam.position.set(0, 0, Math.max(byHeight, byWidth));
    if (lift) cam.setViewOffset(size.width, size.height, 0, lift * size.height, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [camera, size, fill, lift]);
  return null;
}

function useShadowTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
}

type HoloCardProps = {
  cards: Card[];
  index: number;
  input: RefObject<StageInput>;
  onReady?: () => void;
};

function HoloCard({ cards, index, input: inputRef, onReady }: HoloCardProps) {
  // Only the first card's art blocks the first frame; the rest load when they're picked.
  const [firstIndex] = useState(index);
  const [first, back] = useTexture([cards[firstIndex].image, "/card-back.webp"]);
  const gl = useThree((s) => s.gl);
  const fronts = useRef(new Map<string, THREE.Texture>());

  const geometry = useMemo(() => createCardGeometry(), []);
  const materials = useMemo(
    () => [createHoloMaterial(), new THREE.MeshBasicMaterial({ color: "#d6d9e3" })],
    [],
  );
  const shadowMap = useShadowTexture();

  const group = useRef<THREE.Group>(null);
  const card = useRef<THREE.Mesh>(null);
  const holo = () => (card.current!.material as THREE.Material[])[0] as HoloMaterial;
  const shadow = useRef<THREE.Mesh>(null);
  const motion = useRef({
    rot: 0, // spin around Y, unbounded
    vel: 0,
    target: 0,
    tiltX: 0,
    tiltY: 0,
    shown: -1,
    wanted: index,
    lastIndex: index,
  });

  const prepare = useCallback(
    (t: THREE.Texture) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
      return t;
    },
    [gl],
  );

  useEffect(() => {
    fronts.current.set(cards[firstIndex].image, prepare(first));
    holo().uniforms.uBack.value = prepare(back);
    onReady?.();
  }, [first, back, cards, firstIndex, prepare, onReady]);

  // A new selection spins the card a full turn in the direction of travel once
  // its art has loaded; the art is swapped while the back faces the viewer.
  useEffect(() => {
    const m = motion.current;
    if (index === m.lastIndex) return;
    const forward = (index - m.lastIndex + cards.length) % cards.length <= cards.length / 2;
    m.lastIndex = index;
    const url = cards[index].image;
    const spin = () => {
      if (m.lastIndex !== index) return; // a newer pick came in while this one loaded
      m.target = forward
        ? (Math.floor(m.target / TAU + 1e-6) + 1) * TAU
        : (Math.ceil(m.target / TAU - 1e-6) - 1) * TAU;
      m.wanted = index;
    };
    if (fronts.current.has(url)) spin();
    else
      new THREE.TextureLoader().loadAsync(url).then((t) => {
        fronts.current.set(url, prepare(t));
        spin();
      });
  }, [index, cards, prepare]);

  useEffect(() => {
    const loaded = fronts.current;
    return () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      shadowMap.dispose();
      loaded.forEach((t) => t.dispose());
    };
  }, [geometry, materials, shadowMap]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const m = motion.current;
    const input = inputRef.current;
    const { uniforms } = holo();
    const t = state.clock.elapsedTime;

    // Spin: direct while dragging, then a spring that settles on the nearest face.
    if (input.dragging) {
      const delta = input.dragDx * 0.011;
      m.rot += delta;
      m.vel = delta / Math.max(dt, 1e-3);
      m.target = m.rot;
    } else {
      if (input.turn !== 0) {
        m.target = Math.round(m.target / Math.PI) * Math.PI + input.turn * Math.PI;
      } else if (Math.abs(m.target - Math.round(m.target / Math.PI) * Math.PI) > 1e-4) {
        // Just released: project the throw and snap to front or back.
        m.target = Math.round((m.rot + m.vel * 0.18) / Math.PI) * Math.PI;
      }
      const k = 60;
      const c = 2 * Math.sqrt(k) * 0.82;
      m.vel += ((m.target - m.rot) * k - m.vel * c) * dt;
      m.rot += m.vel * dt;
    }
    input.dragDx = 0;
    input.turn = 0;

    // Tilt from the phone, the mouse, or an idle sway, eased.
    let tx = 0;
    let ty = 0;
    if (tilt.live) {
      tx = tilt.x * 0.42;
      ty = tilt.y * 0.32;
    } else if (input.hover) {
      tx = input.hover.x * 0.38;
      ty = input.hover.y * 0.28;
    } else if (!input.reducedMotion) {
      tx = Math.sin(t * 0.55) * 0.16;
      ty = Math.sin(t * 0.8 + 1) * 0.07;
    }
    const ease = 1 - Math.exp(-dt * 7);
    m.tiltX += (tx - m.tiltX) * ease;
    m.tiltY += (ty - m.tiltY) * ease;

    // Swap the front art only once it has turned away from the camera.
    const yaw = m.rot + m.tiltX;
    const next = cards[m.wanted];
    const art = fronts.current.get(next.image);
    if (art && m.shown !== m.wanted && (m.shown === -1 || Math.cos(yaw) < 0)) {
      uniforms.uFront.value = art;
      uniforms.uFoil.value = foilMode(next.foil);
      m.shown = m.wanted;
    }

    const g = group.current!;
    g.rotation.set(m.tiltY, yaw, 0);
    g.position.y = input.reducedMotion ? 0 : Math.sin(t * 1.1) * 0.05;

    const wrapped = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    uniforms.uAngle.value.set(wrapped, m.tiltY);

    // Shadow narrows as the card turns edge-on.
    const s = shadow.current!;
    s.scale.set(CARD_W * (0.25 + 0.75 * Math.abs(Math.cos(yaw))) * 1.1, 0.5, 1);
    (s.material as THREE.MeshBasicMaterial).opacity = 0.55 - g.position.y * 2;
  });

  return (
    <>
      <group ref={group}>
        <mesh ref={card} geometry={geometry} material={materials} />
      </group>
      <mesh ref={shadow} position={[0, -CARD_H / 2 - 0.28, -0.6]} rotation={[-Math.PI / 2.4, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowMap} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

type CardSceneProps = HoloCardProps &
  Partial<Framing> & {
    active: boolean;
    /** Extra scene dressing rendered alongside the card. */
    children?: ReactNode;
  };

export default function CardScene({ active, fill = CARD_FILL, lift = 0, children, ...props }: CardSceneProps) {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: FOV, near: 0.1, far: 50, position: [0, 0, 10] }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
      aria-hidden
    >
      <FitCamera fill={fill} lift={lift} />
      <HoloCard {...props} />
      {children}
    </Canvas>
  );
}
