export function ConnectSupabase() {
  return (
    <div className="gate__form">
      <p className="notice">
        <strong>Connect Supabase to use the admin area.</strong>
        <br />
        Copy <code>.env.example</code> to <code>.env.local</code>, add your project URL and publishable key, then restart the
        dev server. The README has the full setup steps.
      </p>
    </div>
  );
}
