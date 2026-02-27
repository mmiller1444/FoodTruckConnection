import RoleLoginForm from "../../../components/RoleLoginForm";

export default function BusinessLoginPage() {
  return (
    <RoleLoginForm
      title="Business Owner Login"
      subtitle="Request trucks and manage bookings."
      redirectTo="/business/dashboard"
    />
  );
}
