import RoleLoginForm from "../../../components/RoleLoginForm";

export default function TruckLoginPage() {
  return (
    <RoleLoginForm
      title="Food Truck login"
      subtitle="View business requests and accept/ignore invitations."
      redirectTo="/truck/dashboard"
    />
  );
}