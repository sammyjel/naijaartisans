"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Leaflet's default marker images break under bundlers — point them at the CDN.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function AdminMap({ members = [] }) {
  const center = members.length ? [members[0].lat, members[0].lng] : [9.082, 8.6753]; // Nigeria

  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom={false} style={{ height: 420, width: "100%" }} className="rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {members.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]}>
          <Popup>
            <strong>{m.name}</strong>
            <br />
            {m.role === "ARTISAN" ? "Artisan" : "Customer"}
            {m.city ? ` · ${m.city}` : ""}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
