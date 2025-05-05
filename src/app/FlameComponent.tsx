// \src\app\FlameComponent.tsx


import React, { useRef, useMemo, useEffect } from 'react'; // Added useEffect
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
    opacityRef: React.RefObject<number>; // Keep opacityRef (required now)
    // --- REMOVE isActive prop ---
    // isActive?: boolean; // REMOVE THIS LINE
    // Add position prop if you intend to set it via props (optional)
    position?: [number, number, number];
};

const Flame = React.forwardRef<THREE.Points, FlameProps>((
    {
        particleCount = 200,
        flameHeight = 5,
        emitterRadius = 1.2,
        particleSize = 0.05,
        colorStart = new THREE.Color(0xffddaa),
        colorEnd = new THREE.Color(0xff4400),
        opacityRef, // Destructure required opacityRef
        position = [0, 0, 0], // Default position if needed
        // --- REMOVE isActive from destructuring ---
    },
    ref // This ref is now forwarded to the <points> element
) => {
    const materialRef = useRef<THREE.PointsMaterial>(null!);
    // Removed internalPointsRef, rely solely on the forwarded ref

    // Particle initialization (unchanged)
    // ... (particles, positions, colors, resetParticle logic remains the same) ...
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

     const resetParticle = useMemo(() => (p: any) => { // Wrap in useMemo if deps don't change often
        p.age = 0;
        p.lifetime = Math.random() * 1.0 + 0.5;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * emitterRadius;
        p.position.set(
            Math.cos(angle) * radius,
            0   , // Start particles at the emitter origin (Y=0 relative to <Flame>)
            Math.sin(angle) * radius
        );
        p.velocity.set(
            (Math.random() - 0.5) * 1.0,
             // Adjust velocity based on desired flame direction/speed
            -(Math.random() * 1.5 + flameHeight / (p.lifetime || 1)), // Avoid division by zero
            (Math.random() - 0.5) * 1.0
        );
        p.color.copy(colorStart);
    }, [emitterRadius, flameHeight, colorStart]); // Dependencies for reset logic

    // Initial setup effect
    useEffect(() => {
        particles.forEach(resetParticle);
        // Initialize buffer attributes
        particles.forEach((p, i) => {
            positions[i * 3 + 0] = p.position.x;
            positions[i * 3 + 1] = p.position.y;
            positions[i * 3 + 2] = p.position.z;
            colors[i * 3 + 0] = p.color.r;
            colors[i * 3 + 1] = p.color.g;
            colors[i * 3 + 2] = p.color.b;
        });
        // Mark attributes for initial upload (important!)
        // Access geometry via ref if available
        if (ref && 'current' in ref && ref.current?.geometry) {
             const geom = ref.current.geometry;
             const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
             const colAttr = geom.getAttribute('color') as THREE.BufferAttribute;
             if (posAttr) posAttr.needsUpdate = true;
             if (colAttr) colAttr.needsUpdate = true;
        }


    }, [particles, positions, colors, resetParticle, ref]); // Add ref to dependency array


    useFrame((state, delta) => {
        // Use the forwarded ref to get the points object
        const pointsObject = (ref && 'current' in ref) ? ref.current : null;
        if (!pointsObject || !pointsObject.geometry || !materialRef.current) return; // Add materialRef check

        // --- Update material opacity using the passed ref ---
        materialRef.current.opacity = opacityRef.current;

        // --- Visibility is now controlled by the parent ---

        const posAttribute = pointsObject.geometry.getAttribute('position') as THREE.BufferAttribute;
        const colAttribute = pointsObject.geometry.getAttribute('color') as THREE.BufferAttribute;

        if (!posAttribute || !colAttribute) return; // Guard against missing attributes

        for (let i = 0; i < particleCount; i++) {
            const p = particles[i];
            p.age += delta;

            if (p.age > p.lifetime) {
                resetParticle(p);
            }

            p.position.addScaledVector(p.velocity, delta);
            // Add turbulence/swirl if desired
            p.position.x += Math.sin(p.age * 15 + i) * delta * 0.3;
            p.position.z += Math.cos(p.age * 15 + i) * delta * 0.3;

            posAttribute.setXYZ(i, p.position.x, p.position.y, p.position.z);

            const lifeRatio = Math.min(p.age / (p.lifetime || 1), 1.0); // Clamp ratio
            p.color.lerpColors(colorStart, colorEnd, lifeRatio);
            colAttribute.setXYZ(i, p.color.r, p.color.g, p.color.b);
        }

        posAttribute.needsUpdate = true;
        colAttribute.needsUpdate = true;
    });

    // Ensure the points object is created even if the ref isn't immediately available
    // Use the forwarded ref here directly.
    return (
        <points ref={ref} position={position} frustumCulled={false}>
            <bufferGeometry attach="geometry">
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]} 
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[positions, 3]} 
                />
            </bufferGeometry>
            <pointsMaterial
                ref={materialRef}
                attach="material"
                size={particleSize}
                vertexColors={true}
                sizeAttenuation={true}
                transparent={true}
                opacity={1} // Initial opacity, will be controlled by opacityRef via useFrame
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
});

Flame.displayName = 'Flame';
export default Flame;