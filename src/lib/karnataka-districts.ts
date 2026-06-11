// The 31 districts of Karnataka, with English + Kannada names and a stable short code.
// Used by the Prisma seed to populate the District table for district-wise reporting.
// PURE module (no imports) so it can be imported by the tsx-run seed.

export type DistrictSeed = { code: string; name: { en: string; kn: string } };

export const KARNATAKA_DISTRICTS: DistrictSeed[] = [
  { code: "BGK", name: { en: "Bagalkote", kn: "ಬಾಗಲಕೋಟೆ" } },
  { code: "BLY", name: { en: "Ballari", kn: "ಬಳ್ಳಾರಿ" } },
  { code: "BGM", name: { en: "Belagavi", kn: "ಬೆಳಗಾವಿ" } },
  { code: "BLR-R", name: { en: "Bengaluru Rural", kn: "ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ" } },
  { code: "BLR-U", name: { en: "Bengaluru Urban", kn: "ಬೆಂಗಳೂರು ನಗರ" } },
  { code: "BDR", name: { en: "Bidar", kn: "ಬೀದರ್" } },
  { code: "CRN", name: { en: "Chamarajanagar", kn: "ಚಾಮರಾಜನಗರ" } },
  { code: "CKB", name: { en: "Chikkaballapura", kn: "ಚಿಕ್ಕಬಳ್ಳಾಪುರ" } },
  { code: "CKM", name: { en: "Chikkamagaluru", kn: "ಚಿಕ್ಕಮಗಳೂರು" } },
  { code: "CTD", name: { en: "Chitradurga", kn: "ಚಿತ್ರದುರ್ಗ" } },
  { code: "DK", name: { en: "Dakshina Kannada", kn: "ದಕ್ಷಿಣ ಕನ್ನಡ" } },
  { code: "DVG", name: { en: "Davanagere", kn: "ದಾವಣಗೆರೆ" } },
  { code: "DWD", name: { en: "Dharwad", kn: "ಧಾರವಾಡ" } },
  { code: "GDG", name: { en: "Gadag", kn: "ಗದಗ" } },
  { code: "HSN", name: { en: "Hassan", kn: "ಹಾಸನ" } },
  { code: "HVR", name: { en: "Haveri", kn: "ಹಾವೇರಿ" } },
  { code: "KLB", name: { en: "Kalaburagi", kn: "ಕಲಬುರಗಿ" } },
  { code: "KDG", name: { en: "Kodagu", kn: "ಕೊಡಗು" } },
  { code: "KLR", name: { en: "Kolar", kn: "ಕೋಲಾರ" } },
  { code: "KPL", name: { en: "Koppal", kn: "ಕೊಪ್ಪಳ" } },
  { code: "MDY", name: { en: "Mandya", kn: "ಮಂಡ್ಯ" } },
  { code: "MYS", name: { en: "Mysuru", kn: "ಮೈಸೂರು" } },
  { code: "RCR", name: { en: "Raichur", kn: "ರಾಯಚೂರು" } },
  { code: "RMN", name: { en: "Ramanagara", kn: "ರಾಮನಗರ" } },
  { code: "SMG", name: { en: "Shivamogga", kn: "ಶಿವಮೊಗ್ಗ" } },
  { code: "TMK", name: { en: "Tumakuru", kn: "ತುಮಕೂರು" } },
  { code: "UDP", name: { en: "Udupi", kn: "ಉಡುಪಿ" } },
  { code: "UK", name: { en: "Uttara Kannada", kn: "ಉತ್ತರ ಕನ್ನಡ" } },
  { code: "VJP", name: { en: "Vijayapura", kn: "ವಿಜಯಪುರ" } },
  { code: "VJN", name: { en: "Vijayanagara", kn: "ವಿಜಯನಗರ" } },
  { code: "YDG", name: { en: "Yadgir", kn: "ಯಾದಗಿರಿ" } },
];
