import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
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
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const mapped: User[] = Array.isArray(data) ? data.map((u: any) => mapUserFromApi(u)) : [];
        setUsers(mapped);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load users');
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
        const message = errBody?.message ?? `Failed to create user (status ${response.status})`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const payload = await response.json();
      const createdUser = mapUserFromApi(payload);
      setUsers((prev: User[]) => [...prev, createdUser]);
      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', role: 'patient' });
    } catch (err: any) {
      setError(err?.message ?? 'Error creating user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const columns = [
    {
      key: 'username',
      header: 'Name',
      render: (user: User) => ((user as any).username ?? `${user.firstName} ${user.lastName}`),
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {user.role}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (user: User) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and their roles</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

  {loading && <div className="p-4 text-sm text-gray-600">Loading users...</div>}
  {error && <div className="p-4 text-sm text-red-600">Error: {error}</div>}

  <Table data={filteredUsers} columns={columns} />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            {/* Non-admin users cannot create administrator or doctor roles */}
            {editingUser && (editingUser.role === 'administrator' || editingUser.role === 'doctor') && currentUser?.role !== 'administrator' ? (
              <input readOnly value={editingUser.role} className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg" />
            ) : (
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {currentUser?.role === 'administrator' && <option value="administrator">Administrator</option>}
                {currentUser?.role === 'administrator' && <option value="doctor">Doctor</option>}
                <option value="therapist">Therapist</option>
                <option value="trainer">Trainer</option>
                <option value="coach">Coach</option>
                <option value="patient">Patient</option>
                <option value="student">Student</option>
              </select>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};