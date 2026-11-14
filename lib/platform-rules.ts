export function isAllowedUser(
  user: { email: string; emailVerified: boolean } | null,
  ownerEmail: string,
) {
  return (
    !!user &&
    user.emailVerified === true &&
    user.email.toLowerCase() === ownerEmail.toLowerCase()
  );
}
export function isOwnedAudioPath(path: string, owner: string) {
  return (
    path.startsWith(`audio/${owner}/`) &&
    /^[a-zA-Z0-9_-]+$/.test(owner) &&
    /^[0-9a-f-]{36}\.(webm|m4a|wav|ogg)$/.test(
      path.slice(`audio/${owner}/`.length),
    )
  );
}
export function parameterize(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}
export function isRecordKey(
  event: {
    code: string;
    repeat?: boolean;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
  },
  editing: boolean,
) {
  return (
    event.code === "KeyR" &&
    !event.repeat &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !editing
  );
}
