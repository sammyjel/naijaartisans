import { cookies } from "next/headers";
import { verifyToken } from "./auth";

export const ADMIN_COOKIE = "naija_admin";

// True when the current request carries a valid admin session cookie.
export function isAdmin() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const decoded = verifyToken(token);
  return decoded?.admin === true;
}
