// You can put this in a new file, e.g., `src/components/AxesHelperComponent.tsx`
// or directly in your `RocketLandingScene.tsx` file if you prefer

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface AxesHelperProps {
    /** The size (length) of the axes lines. Default is 5. */
    size?: number;
    /** Optional position for the helper. Default is [0, 0, 0]. */
    position?: [number, number, number];
}

/**
 * A simple component to render THREE.AxesHelper in the scene.
 * Helps visualize the X (red), Y (green), and Z (blue) axes.
 */
const AxesHelperComponent: React.FC<AxesHelperProps> = ({ size = 1, position = [0, 0, 0] }) => {
    // useMemo ensures the AxesHelper instance is not recreated on every render,
    // unless the 'size' prop changes.
    const axesHelper = useMemo(() => new THREE.AxesHelper(size), [size]);

    // We use the 'primitive' component from R3F to render an existing Three.js object.
    // We apply the position prop directly to the primitive element.
    return <primitive object={axesHelper} position={position} />;
};

export default AxesHelperComponent; // Export if in a separate file