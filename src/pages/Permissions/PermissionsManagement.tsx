import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Save, Search, UserCog } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useAuth } from '../../context/AuthContext';

type PermissionAction = {
  action: string;
  label: string;
  key: string;
};

type PermissionResource = {
  resource: string;
  label: string;
  actions: PermissionAction[];
};

type PermissionTargetUser = {
  id: number;
  username: string | null;
  email: string | null;
  role: string;
  active: number | null;
};

type PermissionByUserResponse = {
  user: PermissionTargetUser;
  permissionKeys: string[];
  hasCustomConfiguration: boolean;
  availablePermissionKeys: string[];
};

export const PermissionsManagement: React.FC = () => {
  const { user, token } = useAuth();
  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';
  const isAdmin = user?.role === 'administrator';

  const [targets, setTargets] = useState<PermissionTargetUser[]>([]);
  const [resources, setResources] = useState<PermissionResource[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [hasCustomConfiguration, setHasCustomConfiguration] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }, [token]);

  const filteredTargets = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return targets;
    }

    return targets.filter((target) => {
      const username = (target.username ?? '').toLowerCase();
      const email = (target.email ?? '').toLowerCase();
      const role = (target.role ?? '').toLowerCase();
      return username.includes(normalized) || email.includes(normalized) || role.includes(normalized);
    });
  }, [targets, searchTerm]);

  const selectedTarget = useMemo(() => {
    if (selectedTargetId === null) {
      return null;
    }

    return targets.find((target) => target.id === selectedTargetId) ?? null;
  }, [targets, selectedTargetId]);

  const toggleKey = (permissionKey: string) => {
    setSelectedKeys((prev) => (
      prev.includes(permissionKey)
        ? prev.filter((item) => item !== permissionKey)
        : [...prev, permissionKey]
    ));
  };

  const toggleResource = (resource: PermissionResource) => {
    const resourceKeys = resource.actions.map((action) => action.key);
    const hasAnyMissing = resourceKeys.some((key) => !selectedKeys.includes(key));

    setSelectedKeys((prev) => {
      if (hasAnyMissing) {
        return Array.from(new Set([...prev, ...resourceKeys]));
      }
      return prev.filter((key) => !resourceKeys.includes(key));
    });
  };

  useEffect(() => {
    if (!isAdmin || !token) {
      return;
    }

    let mounted = true;

    const loadBootstrap = async () => {
      setLoading(true);
      setError(null);

      try {
        const [catalogResponse, targetsResponse] = await Promise.all([
          fetch(`${apiBase}/permissions/catalog`, { headers: authHeaders }),
          fetch(`${apiBase}/permissions/users/targets`, { headers: authHeaders }),
        ]);

        if (!catalogResponse.ok) {
          throw new Error(`No se pudo cargar el catálogo de permisos (${catalogResponse.status}).`);
        }

        if (!targetsResponse.ok) {
          throw new Error(`No se pudo cargar los usuarios objetivo (${targetsResponse.status}).`);
        }

        const catalogPayload = await catalogResponse.json();
        const targetPayload = await targetsResponse.json();

        if (!mounted) {
          return;
        }

        const nextResources = Array.isArray(catalogPayload?.resources) ? catalogPayload.resources : [];
        const nextTargets = Array.isArray(targetPayload) ? targetPayload : [];

        setResources(nextResources);
        setTargets(nextTargets);

        if (nextTargets.length > 0) {
          setSelectedTargetId((prev) => prev ?? Number(nextTargets[0].id));
        }
      } catch (loadError: any) {
        if (mounted) {
          setError(loadError?.message ?? 'No se pudieron cargar los permisos.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadBootstrap();

    return () => {
      mounted = false;
    };
  }, [apiBase, authHeaders, isAdmin, token]);

  useEffect(() => {
    if (!isAdmin || !token || selectedTargetId === null) {
      return;
    }

    let mounted = true;

    const loadTargetPermissions = async () => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(`${apiBase}/permissions/users/${selectedTargetId}`, {
          headers: authHeaders,
        });

        if (!response.ok) {
          throw new Error(`No se pudo cargar permisos del usuario (${response.status}).`);
        }

        const payload = (await response.json()) as PermissionByUserResponse;
        if (!mounted) {
          return;
        }

        setSelectedKeys(Array.isArray(payload.permissionKeys) ? payload.permissionKeys : []);
        setHasCustomConfiguration(Boolean(payload.hasCustomConfiguration));
      } catch (loadError: any) {
        if (mounted) {
          setError(loadError?.message ?? 'No se pudieron cargar los permisos del usuario.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadTargetPermissions();

    return () => {
      mounted = false;
    };
  }, [apiBase, authHeaders, isAdmin, selectedTargetId, token]);

  const handleSavePermissions = async () => {
    if (!token || selectedTargetId === null || !isAdmin) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${apiBase}/permissions/users/${selectedTargetId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ permissionKeys: selectedKeys }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const message = errBody?.message ?? `No se pudo guardar permisos (${response.status}).`;
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }

      const payload = (await response.json()) as PermissionByUserResponse;
      setSelectedKeys(Array.isArray(payload.permissionKeys) ? payload.permissionKeys : []);
      setHasCustomConfiguration(Boolean(payload.hasCustomConfiguration));
      setSuccessMessage('Permisos actualizados correctamente.');
    } catch (saveError: any) {
      setError(saveError?.message ?? 'No se pudieron guardar los permisos.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <section className="p-8">
        <Card className="border border-red-200 bg-red-50" padding="lg">
          <p className="text-sm text-red-700">Solo administradores pueden acceder al panel de permisos.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-4 py-8 sm:px-8">
      <Card className="border border-white/50 bg-white/90 shadow-[0_20px_80px_rgba(15,23,42,0.08)]" padding="lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-500">
              <Shield className="h-3.5 w-3.5" />
              Control de Accesos
            </span>
            <h1 className="text-3xl font-semibold text-slate-900">Permisos por usuario</h1>
            <p className="text-sm text-slate-600">
              Define exactamente qué pueden ver y ejecutar médicos y coaches en cada módulo.
            </p>
          </div>
          <Button
            onClick={handleSavePermissions}
            disabled={saving || selectedTargetId === null || loading}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar permisos'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="border border-slate-200 bg-white" padding="md">
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar usuario..."
                className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="max-h-[520px] space-y-2 overflow-auto">
              {filteredTargets.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  No hay médicos o coaches para configurar.
                </p>
              ) : (
                filteredTargets.map((target) => {
                  const isSelected = target.id === selectedTargetId;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setSelectedTargetId(target.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? 'border-slate-800 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-semibold">{target.username ?? 'Sin nombre'}</p>
                      <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{target.email ?? 'Sin correo'}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.25em] ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {target.role}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200 bg-white" padding="lg">
          {selectedTarget ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Usuario seleccionado</p>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedTarget.username ?? 'Sin nombre'}</h2>
                  <p className="text-sm text-slate-500">{selectedTarget.email ?? 'Sin correo'} · {selectedTarget.role}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  <UserCog className="h-4 w-4" />
                  {hasCustomConfiguration ? 'Configuración personalizada' : 'Configuración por defecto'}
                </div>
              </div>

              <div className="space-y-3">
                {resources.map((resource) => {
                  const resourceKeys = resource.actions.map((action) => action.key);
                  const allChecked = resourceKeys.every((key) => selectedKeys.includes(key));

                  return (
                    <div key={resource.resource} className="rounded-2xl border border-slate-200 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-600">
                          {resource.label}
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => toggleResource(resource)}
                        >
                          {allChecked ? 'Quitar todo' : 'Seleccionar todo'}
                        </Button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {resource.actions.map((action) => {
                          const checked = selectedKeys.includes(action.key);
                          return (
                            <label key={action.key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleKey(action.key)}
                                className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                              />
                              <span>{action.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Selecciona un médico o coach para editar sus permisos.
            </p>
          )}
        </Card>
      </div>

      {error && (
        <Card className="border border-red-200 bg-red-50" padding="md">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {successMessage && (
        <Card className="border border-emerald-200 bg-emerald-50" padding="md">
          <p className="text-sm text-emerald-700">{successMessage}</p>
        </Card>
      )}
    </section>
  );
};
