import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';
export const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Role is fixed to patient in this signup view
  const role = 'patient' as const;

  // Medical identification fields
  const [nationalId, setNationalId] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other');

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !firstName || !lastName) {
      setError('Please complete required fields');
      return;
    }

    const success = await register({ email, password, firstName, lastName, role });
    if (!success) {
      setError('Registration failed');
      return;
    }

    // Save medical identification locally for demo purposes
    const storedUserRaw =
      localStorage.getItem('hoffmann_user') ??
      localStorage.getItem('hoffman_user');
    const storedUser = JSON.parse(storedUserRaw || 'null');
    if (storedUser) {
      const medRecId = `medrec-${Date.now().toString()}`;
      const medical = {
        id: medRecId,
        userId: storedUser.id,
        nationalId,
        insuranceNumber,
        birthDate: birthDate ? new Date(birthDate).toISOString() : null,
        gender,
        createdAt: new Date().toISOString(),
      };

      const existingRaw =
        localStorage.getItem('hoffmann_medical_history') ??
        localStorage.getItem('hoffman_medical_history');
      const existing = JSON.parse(existingRaw || '[]');
      existing.push(medical);
      localStorage.setItem('hoffmann_medical_history', JSON.stringify(existing));
      localStorage.removeItem('hoffman_medical_history');
    }

    navigate('/dashboard');
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-10 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200/50 via-cyan-200/40 to-sky-400/30 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-purple-200/40 to-rose-200/30 blur-3xl" />
        <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/30 backdrop-blur lg:block" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center px-4 py-12 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8 text-center lg:text-left">
              <p className="inline-flex items-center rounded-full border border-white/60 bg-white/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm backdrop-blur">
                Un nuevo comienzo
              </p>
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
                  Diseña tu perfil y accede a experiencias personalizadas.
                </h1>
                <p className="text-base text-slate-600 sm:text-lg">
                  Completa tu información básica y médica para activar tu tablero inteligente. Cada detalle ayuda a crear un acompañamiento integral y preciso.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/70 bg-white/60 p-5 text-left shadow-lg backdrop-blur">
                  <p className="text-2xl font-semibold text-slate-900">4 pasos</p>
                  <p className="text-sm text-slate-600">Proceso guiado y sin fricción</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/60 p-5 text-left shadow-lg backdrop-blur">
                  <p className="text-2xl font-semibold text-slate-900">100%</p>
                  <p className="text-sm text-slate-600">Datos protegidos</p>
                </div>
              </div>
            </div>

            <Card className="border-white/60 bg-white/80 shadow-2xl backdrop-blur-xl">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-semibold text-slate-900">Crea tu cuenta</h2>
                <p className="mt-2 text-sm text-slate-500">Perfil y datos médicos esenciales</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nombre</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Apellido</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      placeholder="Tu apellido"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Contraseña</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      placeholder="Ingresa una clave segura"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Rol</label>
                    <input
                      readOnly
                      value={role}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Fecha de nacimiento</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Identificación nacional</label>
                    <input
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      placeholder="Documento"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Número de seguro</label>
                    <input
                      value={insuranceNumber}
                      onChange={(e) => setInsuranceNumber(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      placeholder="Seguro"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Género</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-900 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-2xl border-slate-200 bg-white/60 text-slate-600"
                    onClick={() => {
                      try {
                        navigate(-1);
                      } catch {
                        navigate('/login');
                      }
                    }}
                  >
                    Volver
                  </Button>

                  <Button
                    type="submit"
                    className="flex-1 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 py-3 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creando...' : 'Crear cuenta'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
