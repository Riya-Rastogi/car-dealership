import { registerSchema, type RegisterInput } from "@dealer/shared";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import { AuthShell } from "../components/AuthShell.js";
import { TextField } from "../components/TextField.js";
import { ApiError } from "../lib/api.js";
import { fieldErrorsFrom } from "../lib/validation.js";

interface RegisterForm extends RegisterInput {
  confirmPassword: string;
}

const emptyForm: RegisterForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<RegisterForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse({
      name: values.name,
      email: values.email,
      password: values.password,
    });

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error.issues));
      return;
    }

    if (values.password !== values.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await register(parsed.data);
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "VALIDATION_ERROR") {
          setErrors(fieldErrorsFrom(error.details));
        } else if (error.code === "EMAIL_TAKEN") {
          setErrors({ email: error.message });
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
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-accent">
        Join the lot
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
        Create an account
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        One account to browse stock, reserve a car, and track your garage.
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
          id="name"
          label="Full name"
          autoComplete="name"
          placeholder="Riya Rastogi"
          value={values.name}
          error={errors.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          required
        />

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
          autoComplete="new-password"
          placeholder="••••••••"
          value={values.password}
          error={errors.password}
          hint="At least 8 characters, including a letter and a number."
          onChange={(event) =>
            setValues((current) => ({ ...current, password: event.target.value }))
          }
          required
        />

        <TextField
          id="confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={(event) =>
            setValues((current) => ({ ...current, confirmPassword: event.target.value }))
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
              Creating account
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
