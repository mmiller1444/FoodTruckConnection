import RoleLoginForm from "../../../components/RoleLoginForm";

export default function BusinessLoginPage() {
  return (
    <RoleLoginForm
      title="Business Owner login"
      subtitle="Request trucks and view notifications."
      redirectTo="/business/dashboard"
    />
  );
}