/**
 * Reset links keep the token in the fragment: browsers do not send fragments to the
 * server, so the raw token stays out of access logs and Referer headers.
 */
export function passwordResetUrl(token: string): string {
  const baseUrl = (
    process.env.APP_BASE_URL ??
    process.env.CLIENT_URL ??
    "http://localhost:5173"
  ).replace(/\/+$/, "");

  return `${baseUrl}/admin/reset-password#token=${encodeURIComponent(token)}`;
}
