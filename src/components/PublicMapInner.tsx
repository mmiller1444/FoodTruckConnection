'use client';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function PublicMapInner({ items }: { items: any[] }) {
  const center: [number, number] = items.length ? [items[0].latitude, items[0].longitude] : [45.7833, -108.5007];

  return (
    <div className="card" style={{ height: 500 }}>
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {items.map((item) => (
          <Marker key={item.id} position={[item.latitude, item.longitude]}>
            <Popup>
              <strong>{item.truck_name}</strong><br />
              {item.address}<br />
              {item.start_time} - {item.end_time}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
