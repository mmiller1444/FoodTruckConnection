'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./PublicMapInner'), { ssr: false });

export function PublicMap({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/public/locations?date=${date}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items || []));
  }, [date]);

  return (
    <div className="grid">
      <div className="card">
        <label>
          Public map date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <LeafletMap items={items} />
      <div className="card">
        <table className="table">
          <thead><tr><th>Truck</th><th>Time</th><th>Location</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.truck_name}</td>
                <td>{item.start_time} - {item.end_time}</td>
                <td>{item.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
