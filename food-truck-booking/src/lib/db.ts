export type RequestStatus = "pending" | "accepted" | "ignored" | "cancelled";

export type TruckRequest = {
  id: string;
  created_at: string;
  business_id: string;
  requested_truck_id: string | null;
  blanket_request: boolean;
  start_time: string;
  end_time: string;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
  status: RequestStatus;
  accepted_truck_id: string | null;
};
