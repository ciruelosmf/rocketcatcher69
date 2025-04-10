import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Define props interface
type FlameProps = {
    particleCount?: number;
    flameHeight?: number;
    emitterRadius?: number;
    particleSize?: number;
    colorStart?: THREE.Color;
    colorEnd?: THREE.Color;
    opacityRef?: React.RefObject<number>; // Add opacityRef prop
};

const Flame = React.forwardRef<THREE.Points, FlameProps>((
    {
        particleCount = 2500,
        flameHeight = 5,
        emitterRadius = 1.2,
        particleSize = 0.15,
        colorStart = new THREE.Color(0xffddaa),
        colorEnd = new THREE.Color(0xff4400),
        opacityRef,
    },
    ref
) => {
    const materialRef = useRef<THREE.PointsMaterial>(null!);
    const internalPointsRef = useRef<THREE.Points>(null!);

    // Particle initialization (unchanged)
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < particleCount; i++) {
            temp.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                color: new THREE.Color(),
                age: 0,
                lifetime: 0,
            });
        }
        return temp;
    }, [particleCount]);

    const positions = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);
    const colors = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);

    const resetParticle = (p) => {
        p.age = 0;
        p.lifetime = Math.random() * 1.0 + 0.5;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * emitterRadius;
        p.position.set(
            Math.cos(angle) * radius,
            -3,
            Math.sin(angle) * radius
        );
        p.velocity.set(
            (Math.random() - 0.5) * 1.0,
            -(Math.random() * 1.5 + flameHeight / (p.lifetime)),
            (Math.random() - 0.5) * 1.0
        );
        p.color.copy(colorStart);
    };

    useMemo(() => {
        particles.forEach(resetParticle);
        particles.forEach((p, i) => {
            positions[i * 3 + 0] = p.position.x;
            positions[i * 3 + 1] = p.position.y;
            positions[i * 3 + 2] = p.position.z;
            colors[i * 3 + 0] = p.color.r;
            colors[i * 3 + 1] = p.color.g;
            colors[i * 3 + 2] = p.color.b;
        });
    }, [particles, flameHeight, emitterRadius, colorStart]);

    useFrame((state, delta) => {
        const pointsObject = (ref && 'current' in ref ? ref.current : null) || internalPointsRef.current;
        if (!pointsObject || !pointsObject.geometry) return;

        // Update material opacity
        if (materialRef.current && opacityRef) {
            materialRef.current.opacity = opacityRef.current;
        }

        const posAttribute = pointsObject.geometry.getAttribute('position') as THREE.BufferAttribute;
        const colAttribute = pointsObject.geometry.getAttribute('color') as THREE.BufferAttribute;

        for (let i = 0; i < particleCount; i++) {
            const p = particles[i];
            p.age += delta;

            if (p.age > p.lifetime) {
                resetParticle(p);
            }

            p.position.addScaledVector(p.velocity, delta);
            p.position.x += Math.sin(p.age * 15 + i) * delta * 0.3;
            p.position.z += Math.cos(p.age * 15 + i) * delta * 0.3;

            posAttribute.setXYZ(i, p.position.x, p.position.y, p.position.z);

            const lifeRatio = p.age / p.lifetime;
            p.color.lerpColors(colorStart, colorEnd, lifeRatio);
            colAttribute.setXYZ(i, p.color.r, p.color.g, p.color.b);
        }

        posAttribute.needsUpdate = true;
        colAttribute.needsUpdate = true;
    });

    return (
        <points
            ref={(node) => {
                if (typeof ref === 'function') {
                    ref(node);
                } else if (ref) {
                    ref.current = node;
                }
                internalPointsRef.current = node;
            }}
        >
            <bufferGeometry attach="geometry">
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
                    array={positions}
                    itemSize={3}
                    needsUpdate={true}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={particleCount}
                    array={colors}
                    itemSize={3}
                    normalized={false}
                    needsUpdate={true}
                />
            </bufferGeometry>
            <pointsMaterial
                ref={materialRef}
                attach="material"
                size={particleSize}
                vertexColors={true}
                sizeAttenuation={true}
                transparent={true}
                opacity={1} // Initial value, overridden by opacityRef
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
});

Flame.displayName = 'Flame';
export default Flame;