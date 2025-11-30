import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, Search, Shield, Users, Sparkles } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { User, UserRole } from '../../types';

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
    <section className="space-y-8 bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white via-emerald-50 to-white shadow-2xl">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.5em] text-emerald-500">
                <Shield className="h-3.5 w-3.5" /> Usuarios
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Control preciso de perfiles y roles
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Supervisa quién tiene acceso al ecosistema clínico y aplica cambios con una interfaz clara y profesional.
              </p>
            </div>
            <Button onClick={() => handleOpenModal()} className="whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" /> Nuevo usuario
            </Button>
          </div>
          <div className="mt-6 grid gap-3 text-xs uppercase tracking-[0.3em] text-slate-500 sm:grid-cols-3">
            <span className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-center">
              {users.length.toLocaleString()} usuarios registrados
            </span>
            <span className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-center">
              {filteredUsers.length.toLocaleString()} coinciden con la búsqueda
            </span>
            <span className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-center">
              {users.filter(u => u.isActive).length.toLocaleString()} activos
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-slate-100 bg-white/90 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-50 p-3 text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Usuarios totales</p>
              <p className="text-2xl font-semibold text-slate-900">{users.length.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Incluye todos los roles activos</p>
            </div>
          </div>
        </Card>
        <Card className="border border-slate-100 bg-white/90 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-50 p-3 text-emerald-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Administradores</p>
              <p className="text-2xl font-semibold text-slate-900">{users.filter(u => u.role === 'administrator').length}</p>
              <p className="text-xs text-slate-500">Con permisos de control total</p>
            </div>
          </div>
        </Card>
        <Card className="border border-slate-100 bg-white/90 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-50 p-3 text-rose-500">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Usuarios inactivos</p>
              <p className="text-2xl font-semibold text-slate-900">{users.filter(u => !u.isActive).length}</p>
              <p className="text-xs text-slate-500">Pendientes de revisión</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por nombre o correo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        {loading && <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Cargando usuarios...</div>}
        {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">Error: {error}</div>}

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