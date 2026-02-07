import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';

export const LoginForm: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const loggedUser = await login(identifier, password);
    if (!loggedUser) {
      setError('Credenciales inválidas. Verifica tu usuario o contraseña.');
      return;
    }

    const destination = getDashboardPath(loggedUser.role);
    navigate(destination, { replace: true });
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
    </section>
  );
};