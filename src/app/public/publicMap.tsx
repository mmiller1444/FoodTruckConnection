"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type PublicBooking = {
  request_id: string;
  truck_name: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
};

export default function PublicMap({ center, items }: { center: [number, number]; items: PublicBooking[] }) {
  return (
    <MapContainer center={center} zoom={Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM || 12)} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {items.filter(i => i.location_lat && i.location_lng).map(i => (
        <Marker key={i.request_id} position={[i.location_lat!, i.location_lng!]} icon={icon}>
          <Popup>
            <strong>{i.truck_name}</strong><br />
            {new Date(i.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(i.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<br />
            {i.location_name}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
