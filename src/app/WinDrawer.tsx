// \src\app\WinDrawer.tsx component
"use client";
import React from "react";

type WinDrawerProps = {
  open: boolean;          // true  ⇒ show,  false ⇒ hide
  onRestart?: () => void; // called when user presses “Play again”
};

const WinDrawer: React.FC<WinDrawerProps> = ({ open, onRestart }) => {
  const drawerStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    bottom: open ? 0 : "-100%",          // slide in from bottom
    width: "100%",
    height: 220,
    background: "rgba(0,0,0,0.92)",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    transition: "bottom 0.35s ease-out",
    zIndex: 2000,
    fontFamily: "sans-serif",
  };

  return (
    <div style={drawerStyle}>
      <h2 style={{ margin: 0, marginBottom: 12 }}>Touchdown!</h2>
      <p style={{ margin: 0, marginBottom: 24 }}>
        You successfully landed the booster.
      </p>
      <button
        onClick={onRestart}
        style={{
          padding: "10px 26px",
          fontSize: 16,
          fontWeight: 600,
          background: "#61dafb",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Play again
      </button>
    </div>
  );
};

export default WinDrawer;