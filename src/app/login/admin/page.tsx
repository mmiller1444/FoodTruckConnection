import RoleLoginForm from "../../../components/RoleLoginForm";

export default function AdminLoginPage() {
  return (
    <RoleLoginForm
      title="Admin Login"
      subtitle="Manage schedules and users."
      redirectTo="/admin"
    />
  );
}
