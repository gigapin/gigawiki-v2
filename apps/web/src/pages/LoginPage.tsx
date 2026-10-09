import { useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import type { User } from '@shared/types/user'

import { ThemeToggle } from '@/components/shared/ThemeToggle'
import apiClient from '@/api/client'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })

  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [pwError, setPwError] = useState('')
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function validateEmail(value: string) {
    if (!value.trim()) {
      setEmailError('Email is required.')
      return false
    }
    if (!EMAIL_RE.test(value.trim())) {
      setEmailError('Enter a valid email address.')
      return false
    }
    setEmailError('')
    return true
  }

  function validatePw(value: string) {
    if (!value) {
      setPwError('Password is required.')
      return false
    }
    setPwError('')
    return true
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    setServerError('')
    const okEmail = validateEmail(email)
    const okPw = validatePw(password)
    if (!okEmail || !okPw) return

    setSubmitting(true)
    try {
      const { data: loginData } = await apiClient.post<{ accessToken: string }>(
        '/api/v2/auth/login',
        { email: email.trim().toLowerCase(), password },
      )
      const { data: meData } = await apiClient.get<{ user: User }>('/api/v2/auth/me', {
        headers: { Authorization: `Bearer ${loginData.accessToken}` },
      })
      setAuth(meData.user, loginData.accessToken)
      navigate({ to: (search as { redirect?: string }).redirect || '/' })
    } catch (error) {
      setServerError(apiErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <style>{`
        @keyframes gw-banner-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gw-login-body {
          font-family: var(--font-ui);
          -webkit-font-smoothing: antialiased;
          background: var(--gw-bg-deep);
          color: var(--gw-text);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          position: relative;
          overflow: hidden;
        }
        .gw-login-body::before {
          content: "";
          position: fixed;
          top: 50%; left: 50%;
          width: 760px; height: 760px;
          transform: translate(-50%, -54%);
          background: radial-gradient(
            circle at center,
            oklch(0.72 0.15 160 / 0.20) 0%,
            oklch(0.72 0.15 160 / 0.09) 32%,
            oklch(0.72 0.15 160 / 0.02) 55%,
            transparent 70%
          );
          pointer-events: none;
          z-index: 0;
        }
        .gw-login-body::after {
          content: "";
          position: fixed; inset: 0;
          background: radial-gradient(circle at 50% 42%, transparent 40%, color-mix(in oklch, var(--gw-bg) 55%, transparent) 100%);
          pointer-events: none;
          z-index: 0;
        }
        .gw-shell {
          position: relative; z-index: 1;
          width: 100%; max-width: 408px;
          display: flex; flex-direction: column; align-items: center;
        }
        .gw-brand {
          display: flex; align-items: center; gap: 9px;
          margin-bottom: 26px; user-select: none;
        }
        .gw-mark {
          width: 26px; height: 26px; border-radius: 7px;
          background: linear-gradient(145deg, var(--gw-emerald-bright), var(--gw-emerald-deep));
          display: grid; place-items: center;
          box-shadow: 0 0 0 1px oklch(0.78 0.16 160 / 0.4), 0 6px 16px oklch(0.6 0.14 160 / 0.28);
        }
        .gw-mark span {
          font-family: var(--font-ui);
          font-weight: 700; font-size: 16px;
          color: oklch(var(--primary-foreground)); line-height: 1;
        }
        .gw-word {
          font-family: var(--font-ui);
          font-weight: 600; font-size: 19px;
          letter-spacing: -0.01em; color: var(--gw-text);
        }
        .gw-word b { font-weight: 600; color: var(--gw-emerald-bright); }
        .gw-card {
          width: 100%;
          background: linear-gradient(180deg, var(--gw-card), var(--db-bg-2));
          border: 1px solid var(--gw-card-edge);
          border-radius: 14px;
          padding: 30px 30px 28px;
          box-shadow:
            0 1px 0 oklch(1 0 0 / 0.04) inset,
            var(--shadow-dialog),
            0 0 0 1px oklch(0 0 0 / 0.2);
        }
        .gw-head { margin-bottom: 22px; }
        .gw-head h1 {
          font-family: var(--font-ui);
          font-size: 21px; font-weight: 600;
          letter-spacing: -0.015em; margin: 0 0 6px;
          color: var(--gw-text);
        }
        .gw-head p { margin: 0; font-size: 13.5px; color: var(--gw-faint); }
        .gw-banner {
          display: flex; align-items: flex-start; gap: 10px;
          background: color-mix(in oklch, var(--gw-danger) 12%, var(--gw-card));
          border: 1px solid var(--gw-danger-edge);
          border-radius: 10px;
          padding: 11px 13px; margin-bottom: 18px;
          font-size: 13px; line-height: 1.45;
          color: var(--gw-danger);
          animation: gw-banner-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .gw-banner svg { flex: none; margin-top: 1px; color: var(--gw-danger); }
        .gw-banner strong { color: var(--gw-danger); font-weight: 600; }
        .gw-form { display: flex; flex-direction: column; gap: 16px; }
        .gw-field { display: flex; flex-direction: column; gap: 7px; }
        .gw-label {
          font-size: 12.5px; font-weight: 500;
          color: var(--gw-muted); letter-spacing: 0.005em;
        }
        .gw-input-wrap { position: relative; display: flex; align-items: center; }
        .gw-input {
          width: 100%;
          background: var(--gw-field);
          border: 1px solid var(--gw-field-edge);
          border-radius: 10px;
          padding: 11px 13px;
          font-family: var(--font-ui);
          font-size: 14px; color: var(--gw-text);
          transition: border-color 0.16s, box-shadow 0.16s, background 0.16s;
        }
        .gw-input::placeholder { color: var(--gw-faint); }
        .gw-input:hover { border-color: var(--gw-field-edge); }
        .gw-input:focus {
          outline: none;
          border-color: var(--gw-emerald);
          background: var(--gw-field);
          box-shadow: 0 0 0 3px oklch(0.72 0.15 160 / 0.16);
        }
        .gw-input-pw { padding-right: 46px; }
        .gw-input-error { border-color: var(--gw-danger) !important; }
        .gw-input-error:focus { box-shadow: 0 0 0 3px oklch(0.68 0.17 22 / 0.16) !important; }
        .gw-hint { font-size: 12px; color: var(--gw-danger); margin-top: -1px; }
        .gw-toggle {
          position: absolute; right: 6px;
          background: none; border: none;
          color: var(--gw-faint); cursor: pointer;
          padding: 7px; border-radius: 7px;
          display: grid; place-items: center;
          transition: color 0.14s, background 0.14s;
        }
        .gw-toggle:hover { color: var(--gw-muted); background: var(--db-surface-2); }
        .gw-row {
          display: flex; align-items: center;
          justify-content: space-between; margin-top: 2px;
        }
        .gw-remember {
          display: flex; align-items: center; gap: 9px;
          cursor: pointer; user-select: none;
          font-size: 13px; color: var(--gw-muted);
        }
        .gw-check {
          width: 17px; height: 17px; border-radius: 5px;
          border: 1px solid var(--gw-field-edge);
          background: var(--gw-field);
          display: grid; place-items: center;
          transition: all 0.15s; flex: none;
        }
        .gw-link {
          font-size: 13px; color: var(--gw-emerald-bright);
          text-decoration: none; font-weight: 500;
          transition: color 0.14s;
        }
        .gw-link:hover { color: var(--gw-emerald-bright); }
        .gw-submit {
          margin-top: 8px; width: 100%; border: none;
          border-radius: 10px; padding: 12px 16px;
          font-family: var(--font-ui);
          font-size: 14.5px; font-weight: 600;
          letter-spacing: 0.005em;
          color: oklch(var(--primary-foreground));
          background: linear-gradient(180deg, var(--gw-emerald-bright), var(--gw-emerald-deep));
          cursor: pointer;
          box-shadow: 0 1px 0 oklch(1 0 0 / 0.18) inset, 0 8px 22px -8px oklch(0.6 0.14 160 / 0.55);
          transition: transform 0.12s, box-shadow 0.16s, filter 0.16s;
        }
        .gw-submit:hover:not(:disabled) { filter: brightness(1.06); }
        .gw-submit:active:not(:disabled) { transform: translateY(1px); }
        .gw-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .gw-foot {
          margin-top: 22px; text-align: center;
          font-size: 13.5px; color: var(--gw-faint);
        }
        .gw-foot a {
          color: var(--gw-text); text-decoration: none;
          font-weight: 500;
          border-bottom: 1px solid var(--gw-field-edge);
          padding-bottom: 1px;
          transition: border-color 0.14s, color 0.14s;
        }
        .gw-foot a:hover { color: var(--gw-emerald-bright); border-color: var(--gw-emerald); }
      `}</style>

      <div className="gw-login-body">
        <div className="gw-shell">
          <div className="gw-brand">
            <div className="gw-mark">
              <span>G</span>
            </div>
            <div className="gw-word">
              Giga<b>Wiki</b>
            </div>
          </div>

          <div className="gw-card">
            <div className="gw-head">
              <h1>Sign in</h1>
              <p>Welcome back. Pick up where you left off.</p>
            </div>

            {serverError && (
              <div className="gw-banner" role="alert">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p>{serverError}</p>
                  <Link to="/verify-email" search={{ token: '' }} className="gw-link">
                    Resend verification email
                  </Link>
                </div>
              </div>
            )}

            <form className="gw-form" noValidate onSubmit={handleSubmit}>
              <div className="gw-field">
                <label className="gw-label" htmlFor="email">
                  Email
                </label>
                <div className="gw-input-wrap">
                  <input
                    id="email"
                    type="email"
                    className={`gw-input${emailError ? ' gw-input-error' : ''}`}
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) validateEmail(e.target.value)
                      setServerError('')
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) validateEmail(e.target.value)
                    }}
                  />
                </div>
                {emailError && <span className="gw-hint">{emailError}</span>}
              </div>

              <div className="gw-field">
                <label className="gw-label" htmlFor="password">
                  Password
                </label>
                <div className="gw-input-wrap">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    className={`gw-input gw-input-pw${pwError ? ' gw-input-error' : ''}`}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (pwError) validatePw(e.target.value)
                      setServerError('')
                    }}
                  />
                  <button
                    type="button"
                    className="gw-toggle"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 2.92" />
                        <path d="M6.06 6.06A13.2 13.2 0 0 0 2 11s3.5 7 10 7a9.1 9.1 0 0 0 3.06-.52" />
                        <path d="m2 2 20 20" />
                        <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {pwError && <span className="gw-hint">{pwError}</span>}
              </div>

              <div className="gw-row">
                <label className="gw-remember">
                  <span className="gw-check" aria-hidden="true" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="gw-link">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="gw-submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="gw-foot">
              Don't have an account? <Link to="/register">Create account</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
