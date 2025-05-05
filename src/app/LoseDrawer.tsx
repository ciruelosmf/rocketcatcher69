// \src\app\WinDrawer.tsx component
"use client";
import React from "react";

type LoseDrawerProps = {
  open: boolean;          // true ⇒ show, false ⇒ hide
  onRestart?: () => void; // called when user presses “Try again”
};

const LoseDrawer: React.FC<LoseDrawerProps> = ({ open, onRestart }) => {
  const drawerStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    bottom: open ? 0 : "-100%", // slide in from bottom
    width: "100%",
    height: 220, // Adjust height if needed
    background: "rgba(50, 0, 0, 0.92)", // Dark red background for loss
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    transition: "bottom 0.35s ease-out",
    zIndex: 2000, // Same z-index as WinDrawer, ensure only one is open
    fontFamily: "sans-serif",
  };

  return (
    <div style={drawerStyle}>
      {/* --- Changed Text --- */}
      <h2 style={{ margin: 0, marginBottom: 12 }}>Mission Failed!</h2>
      <p style={{ margin: 0, marginBottom: 24 }}>
        The booster was destroyed. Better luck next time!
      </p>
      {/* --- Changed Button Text --- */}
      <button
        onClick={onRestart}
        style={{
          padding: "10px 26px",
          fontSize: 16,
          fontWeight: 600,
          background: "#ff6b6b", // A reddish color for try again
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          color: "#fff", // White text for better contrast
        }}
      >
        Try again
      </button>
    </div>
  );
};

export default LoseDrawer;