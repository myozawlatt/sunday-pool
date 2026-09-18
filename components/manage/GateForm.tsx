'use client';

import { useActionState } from 'react';
import { signIn } from '@/app/manage/actions';

export function GateForm() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <form className="gate__form" action={action}>
      <label className="field">
        <span className="field__label">Email</span>
        <input className="input" type="email" name="email" autoComplete="username" required />
      </label>
      <label className="field">
        <span className="field__label">Password</span>
        <input className="input" type="password" name="password" autoComplete="current-password" required />
      </label>
      {state?.error && (
        <p className="form-errors form-errors--inline" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn btn--primary" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
