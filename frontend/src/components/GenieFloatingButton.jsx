import React, { useState } from "react";
import GenieChat from "./GenieChat";

export default function GenieFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 50,
          background: "#1c7293", color: "#fff", border: "none", borderRadius: "50px",
          padding: "0.8rem 1.3rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.25)"
        }}
      >
        🤖 Ask LabPulse Genie
      </button>

      {open && (
        <div
          style={{
            position: "fixed", bottom: "5rem", right: "1.5rem", width: "380px",
            maxHeight: "70vh", overflowY: "auto", zIndex: 50,
            background: "#fff", borderRadius: "12px", boxShadow: "0 12px 30px rgba(0,0,0,0.3)"
          }}
        >
          <div style={{ padding: "0.8rem 1rem 0" }}>
            <GenieChat suggestions={["Which labs are free right now?", "Show phantom bookings"]} />
          </div>
        </div>
      )}
    </>
  );
}
