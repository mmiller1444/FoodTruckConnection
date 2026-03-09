import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { activateRelease } from '@/lib/actions';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  await requireRole(['admin']);
  const supabase = await createClient();
  const { data: releases } = await supabase.from('change_control_versions').select('*').order('created_at', { ascending: false });
  const { data: flags } = await supabase.from('feature_flags').select('*').order('flag_key');
  const { data: auditRows } = await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(20);

  return (
    <Shell title="Admin Console">
      <div className="grid-2">
        <section className="card">
          <h2>User administration</h2>
          <div className="grid">
            <Link href="/admin/businesses">Add business owner</Link>
            <Link href="/admin/trucks">Add truck owner</Link>
          </div>
        </section>
        <section className="card">
          <h2>Feature flags</h2>
          <ul>{(flags || []).map((flag) => <li key={flag.id}>{flag.flag_key}: {String(flag.is_enabled)}</li>)}</ul>
        </section>
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Change control and rollback</h2>
        <table className="table">
          <thead><tr><th>Version</th><th>Status</th><th>Created</th><th>Notes</th><th>Rollback</th></tr></thead>
          <tbody>
            {(releases || []).map((release) => (
              <tr key={release.id}>
                <td>{release.version_label}</td>
                <td>{release.is_active ? 'Active' : 'Inactive'}</td>
                <td>{new Date(release.created_at).toLocaleString()}</td>
                <td>{release.notes}</td>
                <td>
                  {!release.is_active ? (
                    <form action={activateRelease} className="grid" style={{ minWidth: 240 }}>
                      <input type="hidden" name="release_id" value={release.id} />
                      <input name="rollback_reason" placeholder="Reason for activation or rollback" required />
                      <button className="rounded bg-slate-900 px-3 py-1 text-white">Activate</button>
                    </form>
                  ) : (
                    'Current'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Recent audit trail</h2>
        <table className="table">
          <thead><tr><th>When</th><th>Action</th><th>Target</th><th>Actor</th><th>Details</th></tr></thead>
          <tbody>
            {(auditRows || []).map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.created_at).toLocaleString()}</td>
                <td>{row.action_type}</td>
                <td>{row.target_table}{row.target_id ? ` / ${row.target_id}` : ''}</td>
                <td>{row.actor_user_id || 'system'}</td>
                <td><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(row.details, null, 2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}
