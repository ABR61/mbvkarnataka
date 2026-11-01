import { ImageResponse } from "next/og";

// Branded social-share card (WhatsApp/Twitter/Facebook link previews). Static
// per locale; no external fonts so it renders fast and reliably.
export const alt = "MBV — Manava Bandhutva Vedike";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #065f46 0%, #047857 60%, #059669 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, opacity: 0.85 }}>Manava Bandhutva Vedike</div>
        <div style={{ fontSize: 76, fontWeight: 800, marginTop: 12, lineHeight: 1.05 }}>
          Free occupational training for youth
        </div>
        <div style={{ fontSize: 40, marginTop: 24, opacity: 0.9 }}>
          Across Karnataka, India
        </div>
      </div>
    ),
    size,
  );
}
