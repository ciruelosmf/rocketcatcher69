// InstructionsUI.tsx (or define within RocketLandingScene.tsx)
import React from 'react';

const InstructionsUI = () => {
  // Basic CSS-in-JS for styling and positioning
  const uiStyle: React.CSSProperties = {
    position: 'fixed',    // Position relative to the viewport
    bottom: '735px',       // Distance from the bottom edge
    left: '20px',         // Distance from the left edge
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent black background
    color: 'white',       // White text
    padding: '10px 15px', // Padding inside the box
    borderRadius: '8px',  // Rounded corners
    
    fontSize: '14px',
    zIndex: 100,          // Ensure it's above the canvas (which usually has lower/no z-index)
    pointerEvents: 'none', // Allow clicks/touches to pass through to the canvas if needed
    fontFamily: 'monospace, Menlo, Monaco, Consolas, "Courier New" ',
  };

  return (
    <div style={uiStyle}>
      <h1 style={{ marginTop: '1px' }}>RocketCatcher69</h1>
      <p style={{ marginTop: '18px', marginBottom: '2px' }}><em>Place the rocket in the yellow zone!</em></p>

      <p><strong>Controls:</strong></p>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        <li><strong>[Spacebar]</strong>: Thrust Up</li>
        <li><strong>[w,a,s,d Keys]</strong>: Move Horizontally</li>
        <li><strong>[R]</strong>: Reset Game</li>
      </ul>
    </div>
  );
};

// If defining within RocketLandingScene.tsx, you don't need the export default.
// If in a separate file, add:
 export default InstructionsUI;