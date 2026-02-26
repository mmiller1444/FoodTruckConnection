import RoleLoginForm from "../../../components/RoleLoginForm";

export default function AdminLoginPage() {
  return (
    <RoleLoginForm
      title="Admin login"
      subtitle="View scheduled trucks and manage the system."
      redirectTo="/admin"
    />
  );
}