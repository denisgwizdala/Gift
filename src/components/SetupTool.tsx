"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

/**
 * Setup Tool — visit /setup to use this.
 *
 * Shows all your photos in a grid. Click one, then click on the map
 * to set its location. Fill in city/country. When done, click
 * "Copy photos.ts" to get the generated code — paste it into
 * src/lib/photos.ts.
 */

interface PhotoEntry {
  id: string;
  filename: string;
  src: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  date: string;
  caption: string;
}

export function SetupTool() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState("Our Adventure");
  const [subtitle, setSubtitle] = useState("A journey to remember");

  // Load photos from the generated file on mount
  useEffect(() => {
    import("@/lib/photos").then((mod) => {
      const entries: PhotoEntry[] = mod.PHOTOS.map((p: any) => ({
        id: p.id,
        filename: p.src.split("/").pop() || p.src,
        src: p.src,
        city: p.city === "TODO" ? "" : p.city,
        country: p.country === "TODO" ? "" : p.country,
        lat: p.lat,
        lng: p.lng,
        date: p.date,
        caption: p.caption || "",
      }));
      setPhotos(entries);
      setTitle(mod.GIFT_TITLE);
      setSubtitle(mod.GIFT_SUBTITLE);
    });
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [15, 48],
      zoom: 4,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("click", (e) => {
      const lat = Math.round(e.lngLat.lat * 10000) / 10000;
      const lng = Math.round(e.lngLat.lng * 10000) / 10000;
      // Dispatch custom event so the component can pick it up
      window.dispatchEvent(
        new CustomEvent("map-click", { detail: { lat, lng } })
      );
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Listen for map clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const { lat, lng } = (e as CustomEvent).detail;
      if (!selectedId) return;
      setPhotos((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, lat, lng } : p))
      );
      // Place marker
      if (markerRef.current) markerRef.current.remove();
      if (mapRef.current) {
        markerRef.current = new maplibregl.Marker({ color: "#C76F4A" })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
      }
      // Auto reverse-geocode
      reverseGeocode(selectedId, lat, lng);
    };
    window.addEventListener("map-click", handler);
    return () => window.removeEventListener("map-click", handler);
  }, [selectedId]);

  // Reverse geocode helper
  const reverseGeocode = useCallback(async (id: string, lat: number, lng: number) => {
    try {
      const res = await fetch("/api/reverse-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const { city, country } = await res.json();
      if (city || country) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, city: city || p.city, country: country || p.country } : p))
        );
      }
    } catch {}
  }, []);

  // Show marker when selecting a photo that already has coords
  useEffect(() => {
    const photo = photos.find((p) => p.id === selectedId);
    if (markerRef.current) markerRef.current.remove();
    if (photo?.lat && photo?.lng && mapRef.current) {
      markerRef.current = new maplibregl.Marker({ color: "#C76F4A" })
        .setLngLat([photo.lng, photo.lat])
        .addTo(mapRef.current);
      mapRef.current.flyTo({ center: [photo.lng, photo.lat], zoom: 8, duration: 800 });
    }
  }, [selectedId, photos]);

  const updatePhoto = useCallback((id: string, field: keyof PhotoEntry, value: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const generateCode = useCallback(() => {
    const validPhotos = photos.filter((p) => p.lat != null && p.lng != null);
    const entries = validPhotos.map((p) => `  {
    id: "${p.id}",
    src: "${p.src}",
    city: "${p.city || "Unknown"}",
    country: "${p.country || "Unknown"}",
    lat: ${p.lat},
    lng: ${p.lng},
    date: "${p.date}",
    caption: "${p.caption}",
  }`).join(",\n");

    return `/**
 * YOUR PHOTOS — Generated by the Setup Tool (/setup)
 */

export interface GiftPhoto {
  id: string;
  src: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  date: string;
  caption?: string;
}

export const GIFT_TITLE = "${title}";
export const GIFT_SUBTITLE = "${subtitle}";

export const PHOTOS: GiftPhoto[] = [
${entries}
];
`;
  }, [photos, title, subtitle]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generateCode]);

  const saveToFile = useCallback(async () => {
    const code = generateCode();
    const res = await fetch("/api/save-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generateCode]);

  const selectedPhoto = photos.find((p) => p.id === selectedId);
  const readyCount = photos.filter((p) => p.lat != null && p.lng != null).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Left: Photo list */}
      <div className="w-80 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-3">
        <h1 className="mb-1 text-lg font-bold text-gray-900">📍 Photo Setup</h1>
        <p className="mb-3 text-xs text-gray-500">
          Click a photo, then click the map to set its location. {readyCount}/{photos.length} ready.
        </p>

        {/* Title/subtitle */}
        <div className="mb-3 space-y-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Gift title"
            className="w-full rounded border px-2 py-1 text-sm"
          />
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Subtitle"
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>

        {/* Photo grid */}
        <div className="space-y-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedId(photo.id)}
              className={`cursor-pointer rounded-lg border p-2 transition ${
                selectedId === photo.id
                  ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
                  : photo.lat != null
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex gap-2">
                <img
                  src={photo.src}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-700">{photo.filename}</p>
                  <p className="text-xs text-gray-400">{photo.date}</p>
                  {photo.lat != null ? (
                    <p className="text-xs text-green-600">
                      ✓ {photo.city || "?"}, {photo.country || "?"} ({photo.lat}, {photo.lng})
                    </p>
                  ) : (
                    <p className="text-xs text-red-400">⚠ No location</p>
                  )}
                  {/* Inline coordinate inputs */}
                  {selectedId === photo.id && (
                    <div className="mt-1 flex gap-1">
                      <input
                        value={photo.lat != null && photo.lng != null ? `${photo.lat}, ${photo.lng}` : ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          // Parse "lat, lng" or "lat lng" formats (Google Maps copy format)
                          const parts = raw.split(/[,\s]+/).filter(Boolean);
                          if (parts.length >= 2) {
                            const lat = parseFloat(parts[0]);
                            const lng = parseFloat(parts[1]);
                            if (!isNaN(lat) && !isNaN(lng)) {
                              setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, lat, lng } : p));
                              return;
                            }
                          }
                          // If not parseable yet, store raw in a temp way (clear coords)
                          setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, lat: null, lng: null } : p));
                        }}
                        onPaste={(e) => {
                          // Handle paste directly
                          setTimeout(() => {
                            const val = (e.target as HTMLInputElement).value;
                            const parts = val.split(/[,\s]+/).filter(Boolean);
                            if (parts.length >= 2) {
                              const lat = parseFloat(parts[0]);
                              const lng = parseFloat(parts[1]);
                              if (!isNaN(lat) && !isNaN(lng)) {
                                setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, lat, lng } : p));
                                // Auto-plot on map
                                if (mapRef.current) {
                                  mapRef.current.flyTo({ center: [lng, lat], zoom: 10, duration: 800 });
                                  if (markerRef.current) markerRef.current.remove();
                                  markerRef.current = new maplibregl.Marker({ color: "#C76F4A" })
                                    .setLngLat([lng, lat])
                                    .addTo(mapRef.current!);
                                }
                                // Auto reverse-geocode
                                reverseGeocode(photo.id, lat, lng);
                              }
                            }
                          }, 0);
                        }}
                        placeholder="Paste: 48.8566, 2.3522"
                        className="flex-1 rounded border px-1.5 py-0.5 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (photo.lat != null && photo.lng != null && mapRef.current) {
                            mapRef.current.flyTo({ center: [photo.lng, photo.lat], zoom: 10, duration: 800 });
                            if (markerRef.current) markerRef.current.remove();
                            markerRef.current = new maplibregl.Marker({ color: "#C76F4A" })
                              .setLngLat([photo.lng, photo.lat])
                              .addTo(mapRef.current);
                            // Auto reverse-geocode if city is empty
                            if (!photo.city || photo.city === "TODO") {
                              reverseGeocode(photo.id, photo.lat, photo.lng);
                            }
                          }
                        }}
                        className="rounded bg-orange-500 px-1.5 py-0.5 text-xs text-white hover:bg-orange-600"
                        title="Plot on map"
                      >
                        📍
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                  className="shrink-0 text-xs text-red-300 hover:text-red-500"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={saveToFile}
          className="mt-4 w-full rounded-lg bg-green-600 py-2 text-sm font-bold text-white hover:bg-green-700"
        >
          {copied ? "✓ Saved!" : `💾 Save (${readyCount} photos with GPS)`}
        </button>
        <p className="mt-1 text-center text-xs text-gray-400">
          Saves directly to src/lib/photos.ts — then visit <a href="/" className="underline">/</a> to preview
        </p>
      </div>

      {/* Right: Map + editor */}
      <div className="relative flex-1">
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Selected photo editor overlay */}
        {selectedPhoto && (
          <div className="absolute bottom-4 left-4 z-10 w-72 rounded-xl border bg-white p-3 shadow-lg">
            <div className="flex items-start gap-2">
              <img
                src={selectedPhoto.src}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="flex-1 space-y-1">
                <input
                  value={selectedPhoto.city}
                  onChange={(e) => updatePhoto(selectedPhoto.id, "city", e.target.value)}
                  placeholder="City"
                  className="w-full rounded border px-2 py-0.5 text-sm"
                />
                <input
                  value={selectedPhoto.country}
                  onChange={(e) => updatePhoto(selectedPhoto.id, "country", e.target.value)}
                  placeholder="Country"
                  className="w-full rounded border px-2 py-0.5 text-sm"
                />
                <input
                  value={selectedPhoto.caption}
                  onChange={(e) => updatePhoto(selectedPhoto.id, "caption", e.target.value)}
                  placeholder="Caption (optional)"
                  className="w-full rounded border px-2 py-0.5 text-sm"
                />
              </div>
            </div>
            {selectedPhoto.lat != null ? (
              <p className="mt-2 text-center text-xs text-green-600">
                📍 {selectedPhoto.lat}, {selectedPhoto.lng} — click map to change
              </p>
            ) : (
              <p className="mt-2 text-center text-xs text-orange-500 font-medium">
                👆 Click on the map to set location
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
