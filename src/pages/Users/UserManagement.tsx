import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, Search, Shield, Users, Sparkles } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { User, UserRole } from '../../types';


// definimos la api base
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const mapUserFromApi = (u: any): User => {
  const firstName = (u?.firstName ?? u?.nombres ?? '').toString();
  const lastName = (u?.lastName ?? u?.apellidos ?? '').toString();
  const fallbackUsername = `${firstName} ${lastName}`.trim();

  return {
    id: String(u?.id ?? ''),
    username: (u?.username ?? fallbackUsername).toString(),
    email: (u?.email ?? '').toString(),
    firstName,
    lastName,
    role: ((u?.rol ?? u?.role) || 'patient') as UserRole,
    avatar: undefined,
    createdAt: u?.created_at ? new Date(u.created_at) : new Date(),
    lastLogin: u?.last_login ? new Date(u.last_login) : undefined,
    isActive: (u?.active ?? 1) === 1,
  };
};

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'patient' as UserRole,
  });

  const apiBase = useMemo(() => API_BASE, []);

  const filteredUsers = users.filter(user => {
    const s = searchTerm.toLowerCase();
    const username = (user as any).username ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`;
    return (
      String(username).toLowerCase().includes(s) ||
      (user.email ?? '').toLowerCase().includes(s)
    );
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'patient',
      });
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    // Debug: print selected API base so we can diagnose failed fetches from the browser console
    // This is safe in dev; remove before production if needed.
    // eslint-disable-next-line no-console
    console.log('UserManagement: API base =', apiBase);
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/users`);
        if (!res.ok) throw new Error(`Estado ${res.status}`);
        const data = await res.json();
        const mapped: User[] = Array.isArray(data) ? data.map((u: any) => mapUserFromApi(u)) : [];
        setUsers(mapped);
      } catch (err: any) {
        setError(err.message ?? 'No se pudieron cargar los usuarios');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [apiBase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSaving) return;

    if (editingUser) {
      // Update user locally for now; backend integration pending dedicated endpoint support
      setUsers((prev: User[]) => prev.map((u: User) =>
        u.id === editingUser.id
          ? { ...u, ...formData, username: `${formData.firstName} ${formData.lastName}`.trim() }
          : u
      ));
      setIsModalOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${apiBase}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const message = errBody?.message ?? `No se pudo crear el usuario (estado ${response.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const payload = await response.json();
      const createdUser = mapUserFromApi(payload);
      setUsers((prev: User[]) => [...prev, createdUser]);
      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', role: 'patient' });
    } catch (err: any) {
      setError(err?.message ?? 'Error creando usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (userId: string) => {
    if (confirm('¿Seguro que deseas eliminar este usuario?')) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const roleLabels: Record<UserRole, string> = {
    administrator: 'Administrador',
    trainer: 'Entrenador',
    therapist: 'Terapeuta',
    doctor: 'Doctor',
    coach: 'Coach',
    patient: 'Paciente',
    student: 'Estudiante',
  };

  const columns = [
    {
      key: 'username',
      header: 'Nombre',
      render: (user: User) => ((user as any).username ?? `${user.firstName} ${user.lastName}`),
    },
    {
      key: 'email',
      header: 'Correo',
    },
    {
      key: 'role',
      header: 'Rol',
      render: (user: User) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 capitalize">
          {roleLabels[user.role] ?? user.role}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (user: User) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {user.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (user: User) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenModal(user)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(user.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-9 from-slate-900/5 via-white to-emerald-50/50 px-4 py-8 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-br from-white/90 via-emerald-50/70 to-white/90 shadow-[0_35px_90px_-65px_rgba(15,118,110,0.8)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_60%)]" aria-hidden />
        <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-emerald-500">
              <Shield className="h-3.5 w-3.5" /> Custodia Digital
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500/80">Panel de Usuarios</p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Identidades seguras para tu ecosistema clínico
              </h1>
              <p className="max-w-2xl text-base text-slate-500">
                Administra roles, accesos y estados con un tablero minimalista que prioriza la claridad y la velocidad de respuesta.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-400"
          >
            <Plus className="w-4 h-4 mr-2" /> Nuevo usuario
          </Button>
        </div>
        <div className="relative z-10 grid gap-3 border-t border-white/40 px-6 py-4 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500 sm:grid-cols-3">
          {[
            { label: 'Registrados', value: users.length.toLocaleString() },
            { label: 'Coincidencias', value: filteredUsers.length.toLocaleString() },
            { label: 'Activos', value: users.filter(u => u.isActive).length.toLocaleString() },
          ].map((item) => (
            <span key={item.label} className="rounded-2xl border border-white/60 bg-white/80 px-3 py-3 text-center text-slate-600">
              <strong className="block text-2xl font-semibold tracking-normal text-slate-900">{item.value}</strong>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {[{
          label: 'Usuarios totales',
          value: users.length.toLocaleString(),
          color: 'text-emerald-400',
          icon: Users,
          detail: 'Incluye todos los roles activos',
        },
        {
          label: 'Administradores',
          value: users.filter(u => u.role === 'administrator').length.toLocaleString(),
          color: 'text-emerald-500',
          icon: Sparkles,
          detail: 'Con permisos de control total',
        },
        {
          label: 'Usuarios inactivos',
          value: users.filter(u => !u.isActive).length.toLocaleString(),
          color: 'text-rose-500',
          icon: Shield,
          detail: 'Pendientes de revisión',
        }].map(tile => (
          <Card
            key={tile.label}
            className="border border-white/50 bg-white/85 shadow-[0_25px_60px_-50px_rgba(15,118,110,0.7)] backdrop-blur-xl"
          >
            <div className="flex items-start gap-5">
              <div className={`rounded-3xl bg-slate-900/5 p-3 ${tile.color}`}>
                <tile.icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.5em] text-slate-400">{tile.label}</p>
                <p className="text-3xl font-semibold text-slate-900">{tile.value}</p>
                <p className="text-xs text-slate-500">{tile.detail}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border border-white/40 bg-white/85 shadow-[0_30px_80px_-65px_rgba(15,118,110,0.8)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por nombre o correo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-3xl border border-slate-200/60 bg-slate-50/70 pl-10 pr-4 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        {loading && <div className="rounded-2xl border border-white/60 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">Cargando usuarios...</div>}
        {error && <div className="rounded-2xl border border-white/60 bg-rose-50/90 px-4 py-3 text-sm text-rose-600">Error: {error}</div>}

        <Table data={filteredUsers} columns={columns} />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar usuario' : 'Crear nuevo usuario'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            {/* Non-admin users cannot create administrator or doctor roles */}
            {editingUser && (editingUser.role === 'administrator' || editingUser.role === 'doctor') && currentUser?.role !== 'administrator' ? (
              <input readOnly value={roleLabels[editingUser.role] ?? editingUser.role} className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg" />
            ) : (
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                {currentUser?.role === 'administrator' && <option value="administrator">Administrador</option>}
                {currentUser?.role === 'administrator' && <option value="doctor">Doctor</option>}
                <option value="therapist">Terapeuta</option>
                <option value="trainer">Entrenador</option>
                <option value="coach">Coach</option>
                <option value="patient">Paciente</option>
                <option value="student">Estudiante</option>
              </select>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingUser ? 'Actualizar usuario' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};