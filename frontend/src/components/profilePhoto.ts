// Key the chosen icon by the signed-in user (the JWT subject) so accounts sharing a browser keep their own choice.
export function avatarKeyFor(token: string | null): string {
  try {
    const payload = JSON.parse(atob((token ?? '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return `mindblaze_profile_icon:${payload.sub ?? 'me'}`
  } catch {
    return 'mindblaze_profile_icon:me'
  }
}
