import { FormEvent, useState } from 'react';
import { api, setToken } from '../api';
import { SEEDED } from '../bugs';

export default function Login({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = mode === 'login' ? await api.login(email, password) : await api.register(name, email, password);
      setToken(res.token);
      onAuth();
    } catch (err: any) {
      // BUG-015: a failed login shows no feedback at all
      if (!SEEDED) setError(err.message || 'Something went wrong');
    }
  };

  return (
    <form onSubmit={submit} className="card" aria-labelledby="auth-title" noValidate>
      <h2 id="auth-title">{mode === 'login' ? 'Log in' : 'Create account'}</h2>

      {/* BUG-011: inputs have placeholder text only - no associated <label> */}
      {mode === 'register' && (
        SEEDED
          ? <input data-testid="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          : <><label htmlFor="name">Name</label><input id="name" data-testid="name" value={name} onChange={(e) => setName(e.target.value)} /></>
      )}
      {SEEDED ? (
        <>
          <input data-testid="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input data-testid="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </>
      ) : (
        <>
          <label htmlFor="email">Email</label>
          <input id="email" data-testid="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" data-testid="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </>
      )}

      {error && <p role="alert" className="error" data-testid="auth-error">{error}</p>}

      <button type="submit" data-testid="submit">{mode === 'login' ? 'Log in' : 'Register'}</button>
      <button type="button" className="link" data-testid="toggle-mode" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
      </button>
    </form>
  );
}
