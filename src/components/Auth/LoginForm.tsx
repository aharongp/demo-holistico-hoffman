import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';
import { Modal } from '../UI/Modal';

export const LoginForm: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const {
    login,
    isLoading,
    getDashboardPath,
    requestPasswordReset,
    confirmPasswordReset,
  } = useAuth();
  const navigate = useNavigate();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!tokenExpiresAt) {
      setRemainingSeconds(0);
      return () => undefined;
    }

    const updateRemaining = () => {
      const diffMs = tokenExpiresAt - Date.now();
      const nextSeconds = diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
      setRemainingSeconds(nextSeconds);
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [tokenExpiresAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const loggedUser = await login(identifier, password);
    if (!loggedUser) {
      setError('Credenciales inválidas. Verifica tu usuario o contraseña.');
      return;
    }

    const destination = getDashboardPath(loggedUser.role);
    navigate(destination, { replace: true });
  };

  const handleOpenResetModal = () => {
    setSuccessMessage('');
    setResetError(null);
    setResetMessage(null);
    setResetStep('request');
    setResetCode('');
    setResetPassword('');
    setResetPasswordConfirm('');
    setResetToken('');
    setTokenExpiresAt(null);
    setRemainingSeconds(0);
    if (!resetEmail && identifier.includes('@')) {
      setResetEmail(identifier);
    }
    setIsResetModalOpen(true);
  };

  const handleCloseResetModal = () => {
    setIsResetModalOpen(false);
    setIsResetSubmitting(false);
    setResetError(null);
    setResetMessage(null);
    setResetStep('request');
    setResetCode('');
    setResetPassword('');
    setResetPasswordConfirm('');
    setResetToken('');
    setTokenExpiresAt(null);
    setRemainingSeconds(0);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);
    setIsResetSubmitting(true);

    try {
      const token = await requestPasswordReset(resetEmail);
      setResetToken('');
      setTokenExpiresAt(null);
      setRemainingSeconds(0);
      if (token) {
        setResetToken(token);
        setTokenExpiresAt(Date.now() + 3 * 60 * 1000);
        setResetMessage('Hemos enviado un código de verificación a tu correo. Caduca en 3 minutos, revisa tu bandeja de entrada o la carpeta de spam.');
        setResetStep('verify');
      } else {
        setResetMessage('Si el correo está registrado, recibirás un código en los próximos instantes. Verifica tu bandeja de entrada y vuelve a intentarlo.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setResetError(err.message);
      } else {
        setResetError('No se pudo enviar el código de verificación. Intenta nuevamente.');
      }
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleResetConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);

    if (resetPassword !== resetPasswordConfirm) {
      setResetError('Las contraseñas no coinciden.');
      return;
    }

    if (!resetToken) {
      setResetError('El código ha expirado. Solicita uno nuevo.');
      return;
    }

    if (tokenExpiresAt && Date.now() > tokenExpiresAt) {
      setResetError('El código ha expirado. Solicita uno nuevo.');
      return;
    }

    setIsResetSubmitting(true);

    try {
      await confirmPasswordReset({
        email: resetEmail,
        code: resetCode,
        newPassword: resetPassword,
        token: resetToken,
      });
      setSuccessMessage('Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con la nueva contraseña.');
      setIdentifier(resetEmail);
      setPassword('');
      setError('');
      handleCloseResetModal();
    } catch (err) {
      if (err instanceof Error) {
        setResetError(err.message);
      } else {
        setResetError('No se pudo actualizar la contraseña. Intenta nuevamente.');
      }
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleResetRestart = () => {
    setResetError(null);
    setResetMessage(null);
    setResetStep('request');
    setResetCode('');
    setResetPassword('');
    setResetPasswordConfirm('');
    setResetToken('');
    setTokenExpiresAt(null);
    setRemainingSeconds(0);
    setIsResetSubmitting(false);
  };

  const formatCountdown = (totalSeconds: number) => {
    const clamped = Math.max(totalSeconds, 0);
    const minutes = Math.floor(clamped / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (clamped % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-16 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-300/40 to-sky-500/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-10 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-300/30 blur-3xl" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/30 backdrop-blur" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center px-4 py-12 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8 text-center lg:text-left">
              <p className="inline-flex items-center rounded-full border border-white/60 bg-white/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm backdrop-blur">
                Hoffmann Sistema Holistico
              </p>
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
                  Bienvenido a una experiencia de salud integral hecha para ti.
                </h1>
                <p className="text-base text-slate-600 sm:text-lg">
                  Gestiona tu bienestar con una interfaz limpia, luminosa y elegante. Accede a tus programas, monitorea tu progreso y mantente conectado con tu equipo clínico.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/70 bg-white/60 p-5 text-left shadow-lg backdrop-blur">
                  <p className="text-2xl font-semibold text-slate-900">+1500</p>
                  <p className="text-sm text-slate-600">Usuarios registrados</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/60 p-5 text-left shadow-lg backdrop-blur">
                  <p className="text-2xl font-semibold text-slate-900">92%</p>
                  <p className="text-sm text-slate-600">Adherencia de pacientes</p>
                </div>
              </div>
            </div>

            <Card className="border-white/60 bg-white/80 shadow-2xl backdrop-blur-xl">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-semibold text-slate-900">Inicia Sesión</h2>
                <p className="mt-2 text-sm text-slate-500">Ingresa tus credenciales para acceder a tu panel personalizado</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
                    Email o nombre de usuario
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    placeholder="Correo electrónico o usuario"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    placeholder="Ingresa tu contraseña"
                  />
                </div>

                <div className="text-right text-sm">
                  <button
                    type="button"
                    onClick={handleOpenResetModal}
                    className="font-semibold text-sky-600 transition hover:text-sky-500"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 py-3 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
                  disabled={isLoading}
                >
                  {isLoading ? 'Ingresando...' : 'Entrar al sistema'}
                </Button>

                <div className="text-center text-sm text-slate-500">
                  ¿Aún no tienes cuenta?
                  {' '}
                  <a href="/signup" className="font-semibold text-sky-600 hover:text-sky-500">
                    Crear acceso
                  </a>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isResetModalOpen}
        onClose={handleCloseResetModal}
        title="Recuperar contraseña"
        size="md"
      >
        <div className="space-y-6">
          {resetError && (
            <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-600">
              {resetError}
            </div>
          )}
          {resetMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
              {resetMessage}
            </div>
          )}

          {resetStep === 'request' ? (
            <form className="space-y-4" onSubmit={handleResetRequest}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="reset-email">
                  Correo electrónico
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="tu-correo@ejemplo.com"
                  autoComplete="email"
                />
                <p className="text-xs text-slate-500">
                  Te enviaremos un código temporal que caduca en 3 minutos para que puedas actualizar tu contraseña.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full rounded-2xl bg-sky-600 py-3 text-base font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-500"
                disabled={isResetSubmitting}
              >
                {isResetSubmitting ? 'Enviando código...' : 'Enviar código de verificación'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResetConfirmation}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="reset-email-verify">
                  Correo electrónico
                </label>
                <input
                  id="reset-email-verify"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="tu-correo@ejemplo.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="reset-code">
                  Código de verificación
                </label>
                <input
                  id="reset-code"
                  type="text"
                  required
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 uppercase"
                  placeholder="Ingresa el código recibido"
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-slate-500">
                  El código de verificación caduca en 3 minutos. Si expira, solicita uno nuevo.
                </p>
                {resetToken && (
                  <p className={`text-xs font-semibold ${remainingSeconds > 0 ? 'text-slate-500' : 'text-red-600'}`}>
                    Tiempo restante: {remainingSeconds > 0 ? formatCountdown(remainingSeconds) : 'Expirado'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="reset-password">
                  Nueva contraseña
                </label>
                <input
                  id="reset-password"
                  type="password"
                  required
                  minLength={6}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Ingresa una nueva contraseña"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="reset-password-confirm">
                  Confirmar nueva contraseña
                </label>
                <input
                  id="reset-password-confirm"
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleResetRestart}
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  ¿Necesitas reenviar el código?
                </button>
                <Button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
                  disabled={isResetSubmitting}
                >
                  {isResetSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </section>
  );
};