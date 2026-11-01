import "server-only";
import QRCode from "qrcode";

/**
 * Render `data` as a crisp, scalable QR code SVG string (server-side; no canvas).
 * Used to put a scannable verification link on certificates. `margin: 0` because
 * the layout provides its own padding; callers size it via a wrapping element.
 */
export async function qrSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#065f46", light: "#00000000" }, // emerald on transparent
  });
}
