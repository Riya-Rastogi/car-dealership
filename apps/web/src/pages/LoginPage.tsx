import { loginSchema, type LoginInput } from "@dealer/shared";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import { AuthShell } from "../components/AuthShell.js";
import { TextField } from "../components/TextField.js";
import { ApiError } from "../lib/api.js";
import { fieldErrorsFrom } from "../lib/validation.js";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [values, setValues] = useState<LoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error.issues));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await login(parsed.data);
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "VALIDATION_ERROR") {
          setErrors(fieldErrorsFrom(error.details));
        } else if (error.code === "UNAUTHORIZED") {
          setFormError("That email and password combination does not match an account.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-accent underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent">
        Welcome back
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">Sign in</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Pick up where you left off and browse today&apos;s inventory.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {formError ? (
          <p
            role="alert"
            className="rounded-md border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-sm text-red-300"
          >
            {formError}
          </p>
        ) : null}

        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          error={errors.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          required
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          error={errors.password}
          onChange={(event) =>
            setValues((current) => ({ ...current, password: event.target.value }))
          }
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span
                aria-hidden="true"
                className="size-3.5 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink"
              />
              Signing in
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {import.meta.env.DEV ? (
        <div className="mt-6 rounded-md border border-dashed border-line bg-panel/60 px-4 py-3 text-xs text-muted">
          <p className="font-medium uppercase tracking-[0.16em] text-muted/80">Demo account</p>
          <button
            type="button"
            onClick={() => setValues({ email: "demo@autoline.dev", password: "demo1234" })}
            className="mt-2 text-left text-accent underline-offset-4 hover:underline"
          >
            demo@autoline.dev · demo1234
          </button>
        </div>
      ) : null}
    </AuthShell>
  );
}
