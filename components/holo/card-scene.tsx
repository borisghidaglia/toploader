"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Card } from "@/lib/cards";
import { CARD_H, CARD_W, createCardGeometry } from "./card-geometry";
import { createHoloMaterial, foilMode, type HoloMaterial } from "./holo-material";
import { CARD_FILL, CARD_MAX_WIDTH, type StageInput } from "./stage-input";

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
    // Fill `fill` of the height, unless that would overflow the most of the width it may take.
    const byHeight = CARD_H / (fill * span);
    const byWidth = CARD_W / (CARD_MAX_WIDTH * span * aspect);
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
    pitch: 0, // tip around X, upright again on release
    pitchVel: 0,
    pitchTarget: 0,
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

    // Dragging turns the card both ways directly. Once let go, springs settle the
    // spin on the nearest face and bring the tip back upright; a flick carries
    // either one on around before it lands.
    if (input.dragging) {
      const spin = input.dragDx * 0.011;
      const tip = input.dragDy * 0.011;
      m.rot += spin;
      m.vel = spin / Math.max(dt, 1e-3);
      m.target = m.rot;
      m.pitch += tip;
      m.pitchVel = tip / Math.max(dt, 1e-3);
      m.pitchTarget = m.pitch;
    } else {
      if (input.turn !== 0) {
        m.target = Math.round(m.target / Math.PI) * Math.PI + input.turn * Math.PI;
      } else if (Math.abs(m.target - Math.round(m.target / Math.PI) * Math.PI) > 1e-4) {
        // Just released: project the throw and snap to front or back.
        m.target = Math.round((m.rot + m.vel * 0.18) / Math.PI) * Math.PI;
      }
      if (Math.abs(m.pitchTarget - Math.round(m.pitchTarget / TAU) * TAU) > 1e-4) {
        m.pitchTarget = Math.round((m.pitch + m.pitchVel * 0.18) / TAU) * TAU;
      }
      const k = 60;
      const c = 2 * Math.sqrt(k) * 0.82;
      m.vel += ((m.target - m.rot) * k - m.vel * c) * dt;
      m.rot += m.vel * dt;
      m.pitchVel += ((m.pitchTarget - m.pitch) * k - m.pitchVel * c) * dt;
      m.pitch += m.pitchVel * dt;
    }
    input.dragDx = 0;
    input.dragDy = 0;
    input.turn = 0;

    // Swap the front art only once it has turned away from the camera.
    const yaw = m.rot;
    const next = cards[m.wanted];
    const art = fronts.current.get(next.image);
    if (art && m.shown !== m.wanted && (m.shown === -1 || Math.cos(yaw) * Math.cos(m.pitch) < 0)) {
      uniforms.uFront.value = art;
      uniforms.uFoil.value = foilMode(next.foil);
      m.shown = m.wanted;
    }

    const g = group.current!;
    g.rotation.set(m.pitch, yaw, 0);
    g.position.y = input.reducedMotion ? 0 : Math.sin(t * 1.1) * 0.05;

    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    uniforms.uAngle.value.set(wrap(yaw), wrap(m.pitch));

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
      style={{ touchAction: "none" }}
      aria-hidden
    >
      <FitCamera fill={fill} lift={lift} />
      <HoloCard {...props} />
      {children}
    </Canvas>
  );
}
