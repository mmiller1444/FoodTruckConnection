import "./globals.css";
import Link from "next/link";
import { createClient } from "../lib/supabase/server";
import { getUserAndRole } from "../lib/auth";

export const metadata = {
  title: "Food Truck Booking",
  description: "Request and schedule food trucks.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { role, email, fullName } = await getUserAndRole();

  const display = fullName || email || "";

  return (
    <html lang="en">
      <body>
        <div className="container">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="row" style={{ alignItems: "center" }}>
              <Link href="/" className="btn primary">
                Food Truck Booking
              </Link>
              <Link href="/public" className="btn">
                Public Map
              </Link>
              {user && (
                <Link href="/role-gate" className="btn">
                  Dashboard
                </Link>
              )}
              {role === "admin" && (
                <>
                  <Link href="/admin" className="btn">
                    Admin
                  </Link>
                  <Link href="/admin/users" className="btn">
                    Users
                  </Link>
                
                  <Link href="/business/dashboard" className="btn">Business</Link>
                  <Link href="/truck/dashboard" className="btn">Trucks</Link>
</>
              )}
            </div>

            <div className="row" style={{ alignItems: "center", gap: 8 }}>
              {user && (
                <div
                  className="small"
                  style={{
                    padding: "6px 10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    opacity: 0.9,
                    maxWidth: 520,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={email || ""}
                >
                  Logged in as <strong>{display || "User"}</strong>
                  {role ? (
                    <>
                      {" "}
                      (<code>{role}</code>)
                    </>
                  ) : null}
                </div>
              )}

              {user ? (
                <Link href="/signout" className="btn">
                  Sign out
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn">
                    Login
                  </Link>
                  <Link href="/signup" className="btn primary">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>

          <hr />
          {children}

          <div className="small" style={{ marginTop: 30, opacity: 0.8 }}>
            Tip: Admins can roll back by switching the active release in the Admin page.
          </div>
        </div>
      </body>
    </html>
  );
}

