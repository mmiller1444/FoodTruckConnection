import { Shell } from '@/components/Shell';
import { PublicMap } from '@/components/PublicMap';

export default function PublicMapPage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Shell title="Public Food Truck Map">
      <PublicMap initialDate={today} />
    </Shell>
  );
}
