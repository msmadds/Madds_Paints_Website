import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MedePaints",
    short_name: "MedePaints",
    description: "Original paintings and fine art prints from Dar es Salaam.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f2",
    theme_color: "#f5f5f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
