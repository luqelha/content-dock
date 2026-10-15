export type AuthField = "email" | "password" | "confirmPassword";
export type AuthState = {
  error: string;
  email: string;
  fieldErrors: Partial<Record<AuthField, string>>;
  timestamp: number;
};

export const PASSWORD_HINT =
  "Use at least 15 characters, up to 72 UTF-8 bytes. Choose a unique passphrase; spaces and Unicode are allowed.";

export function validateAuthForm(formData: FormData, registration = false) {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const confirmation = formData.get("confirmPassword");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  // Never trim, normalize, or return passwords in action state.
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const fieldErrors: AuthState["fieldErrors"] = {};

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (!password) {
    fieldErrors.password = "Enter your password.";
  } else if (password.length > 1024) {
    fieldErrors.password = "Password is too long.";
  } else if (registration) {
    if (Array.from(password).length < 15) {
      fieldErrors.password = "Use at least 15 characters.";
    } else if (new TextEncoder().encode(password).length > 72) {
      fieldErrors.password =
        "Use no more than 72 UTF-8 bytes (Unicode may use more than one byte per character).";
    }
  }
  if (registration && (typeof confirmation !== "string" || !confirmation)) {
    fieldErrors.confirmPassword = "Confirm your password.";
  } else if (registration && password !== confirmation) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  return { email, password, fieldErrors };
}

export function authFailure(
  email: string,
  error: string,
  fieldErrors: AuthState["fieldErrors"] = {},
): AuthState {
  return { email, error, fieldErrors, timestamp: Date.now() };
}

// Use status codes, never render an upstream message, array, or internal error.
export function authResponseError(status: number, registration = false) {
  if (status === 429)
    return "Too many attempts. Please wait one minute before trying again.";
  if (!registration && (status === 401 || status === 403)) {
    return "Email or password is incorrect.";
  }
  if (status === 400 || status === 422) {
    return "Check your email and password requirements, then try again.";
  }
  return "The authentication service is temporarily unavailable. Please try again shortly.";
}

export function dashboardDestination(referer: string | null) {
  try {
    const from = referer ? new URL(referer).searchParams.get("from") : null;
    if (!from || /[\\\u0000-\u001f\u007f]/.test(from)) return "/dashboard";
    const base = "https://atlas.invalid";
    const target = new URL(from, base);
    const decodedPath = decodeURIComponent(target.pathname);
    if (
      /[\\\u0000-\u001f\u007f]/.test(decodedPath) ||
      decodedPath
        .split("/")
        .some((segment) => segment === "." || segment === "..")
    ) {
      return "/dashboard";
    }
    if (
      target.origin === base &&
      (target.pathname === "/dashboard" ||
        target.pathname.startsWith("/dashboard/"))
    )
      return target.pathname + target.search;
  } catch {
    // A malformed Referer must not turn a successful login into a server error.
  }
  return "/dashboard";
}
