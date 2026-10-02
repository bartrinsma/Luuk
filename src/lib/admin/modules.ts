/** Gedeeld tussen server- en clientcomponenten (dus géén "use client"-bestand). */
export const MODULE_COLORS = {
  huizen: "#2a78d6",
  autos: "#eb6834",
  roast: "#1baf7a",
  chat: "#eda100",
} as const;

export const MODULE_LABELS: Record<string, string> = {
  huizen: "Huizen",
  autos: "Auto's",
  roast: "Roast",
  chat: "Home-chat",
  fotos: "Foto-analyse",
  share: "Delen",
};
