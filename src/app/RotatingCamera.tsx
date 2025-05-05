"use client";
import { useThree, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type Props = {
  active: boolean;              // start/stop rotation
  target?: THREE.Vector3;       // point the camera looks at
  radius?: number;              // orbit radius
  speed?: number;               // rad / sec
};

const RotatingCamera: React.FC<Props> = ({
  active,
  target = new THREE.Vector3(-2, -2, 0), // tower / rocket centre
  radius = 38,
  speed = 0.35,
}) => {
  const { camera } = useThree();
  const angle = useRef(0);

  useFrame((_, dt) => {
    if (!active) return;
    angle.current += speed * dt;
    const y = camera.position.y;           // keep current height
    camera.position.set(
      Math.cos(angle.current) * radius + target.x,
      y,
      Math.sin(angle.current) * radius + target.z
    );
    camera.lookAt(target);
  });

  return null; // no JSX
};

export default RotatingCamera;