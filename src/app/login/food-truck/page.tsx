import RoleLoginForm from "../../../components/RoleLoginForm";

export default function TruckLoginPage() {
  return (
    <RoleLoginForm
      title="Food Truck Login"
      subtitle="View requests and accept invitations."
      redirectTo="/truck/dashboard"
    />
  );
}
