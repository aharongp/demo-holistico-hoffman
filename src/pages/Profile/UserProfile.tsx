import React, { useEffect, useState } from 'react';
import { User, Camera, Save, Eye, EyeOff } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { useAuth } from '../../context/AuthContext';

export const UserProfile: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatar || null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setProfileImage(user.avatar || null);
  }, [user]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setServerError(null);
      setSuccessMessage(null);
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, image: 'La imagen debe ser menor a 5MB' }));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
        setErrors(prev => ({ ...prev, image: '' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es obligatorio';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El correo no tiene un formato válido';
    }

    // Password validation only if user is trying to change password
    if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Debes ingresar tu contraseña actual para poder cambiarla';
      }

      if (!formData.newPassword) {
        newErrors.newPassword = 'La nueva contraseña es obligatoria';
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedUser = await updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        avatar: profileImage ?? null,
      });

      if (!updatedUser) {
        throw new Error('No se pudo actualizar el perfil');
      }

      if (formData.newPassword) {
        await changePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        });
      }

      setSuccessMessage(
        formData.newPassword
          ? 'Perfil y contraseña actualizados correctamente'
          : 'Perfil actualizado correctamente',
      );

      setIsEditing(false);
      setFormData({
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        email: updatedUser.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setProfileImage(updatedUser.avatar || null);
      setErrors({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el perfil';
      setServerError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setProfileImage(user?.avatar || null);
    setErrors({});
    setServerError(null);
    setSuccessMessage(null);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <section className="relative space-y-8 px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-[#dff7ff] via-white to-[#e0e7ff] p-6 sm:p-10 shadow-2xl">
        <div className="absolute -right-12 top-0 h-48 w-48 rounded-full bg-sky-200/60 blur-3xl" aria-hidden />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-cyan-100/40 blur-3xl" aria-hidden />
        <div className="relative z-10 max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.4em] text-sky-500">Identidad digital</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-[2.5rem]">Perfil de usuario</h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Administra tu fotografía, datos principales y credenciales dentro de un entorno minimalista y seguro.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          padding="lg"
          className="rounded-[28px] border-white/60 bg-white/85 text-center shadow-xl shadow-sky-100/70 backdrop-blur"
        >
          <div className="relative inline-block">
            <div className="relative mx-auto mb-5 h-24 w-24 rounded-full border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-1 sm:h-32 sm:w-32">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-white">
                  <User className="h-10 w-10 sm:h-12 sm:w-12" />
                </div>
              )}
              {isEditing && (
                <label className="absolute bottom-2 right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-200/70 transition hover:bg-sky-600">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isSaving}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {errors.image && (
            <p className="mb-2 text-xs text-rose-500">{errors.image}</p>
          )}

          <h3 className="text-lg font-semibold text-slate-900">
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-sm capitalize text-slate-500">{user.role}</p>

          {!isEditing && (
            <Button
              onClick={() => {
                setIsEditing(true);
                setServerError(null);
                setSuccessMessage(null);
              }}
              disabled={isSaving}
              className="mt-5 w-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-cyan-200/70 hover:opacity-95"
              size="sm"
            >
              Editar perfil
            </Button>
          )}
        </Card>

        <div className="lg:col-span-2">
          <Card
            padding="lg"
            className="rounded-[28px] border-white/60 bg-white/90 shadow-xl shadow-sky-100/60 backdrop-blur"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              {serverError && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {serverError}
                </div>
              )}

              {successMessage && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                  {successMessage}
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Datos básicos</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Información personal</h3>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600">Nombre</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      disabled={!isEditing || isSaving}
                      className={`w-full rounded-2xl border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-inner focus:ring-2 focus:ring-sky-200 focus:border-sky-200 ${
                          !isEditing || isSaving ? 'cursor-not-allowed opacity-60' : ''
                      }`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-rose-500">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600">Apellido</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!isEditing || isSaving}
                      className={`w-full rounded-2xl border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-inner focus:ring-2 focus:ring-sky-200 focus:border-sky-200 ${
                          !isEditing || isSaving ? 'cursor-not-allowed opacity-60' : ''
                      }`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-rose-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-slate-600">Correo electrónico</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing || isSaving}
                    className={`w-full rounded-2xl border border-transparent bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-inner focus:ring-2 focus:ring-sky-200 focus:border-sky-200 ${
                      !isEditing || isSaving ? 'cursor-not-allowed opacity-60' : ''
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-rose-500">{errors.email}</p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Seguridad</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">Actualizar contraseña</h3>
                  <p className="mt-2 text-sm text-slate-500">Déjalo en blanco si no deseas actualizarla</p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-600">Contraseña actual</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={formData.currentPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          disabled={isSaving}
                          className={`w-full rounded-2xl border border-transparent bg-white/80 px-4 py-3 pr-12 text-sm text-slate-700 shadow-inner focus:ring-2 focus:ring-sky-200 focus:border-sky-200 ${
                            isSaving ? 'cursor-not-allowed opacity-60' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          disabled={isSaving}
                          className={`absolute inset-y-0 right-3 flex items-center text-slate-400 ${
                            isSaving ? 'opacity-60' : ''
                          }`}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {errors.currentPassword && (
                        <p className="mt-1 text-xs text-rose-500">{errors.currentPassword}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-600">Nueva contraseña</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={formData.newPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                            disabled={isSaving}
                            className={`w-full rounded-2xl border border-transparent bg-white/80 px-4 py-3 pr-12 text-sm text-slate-700 shadow-inner focus:ring-2 focus:ring-sky-200 focus:border-sky-200 ${
                              isSaving ? 'cursor-not-allowed opacity-60' : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            disabled={isSaving}
                            className={`absolute inset-y-0 right-3 flex items-center text-slate-400 ${
                              isSaving ? 'opacity-60' : ''
                            }`}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {errors.newPassword && (
                          <p className="mt-1 text-xs text-rose-500">{errors.newPassword}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-600">Confirmar nueva contraseña</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            disabled={isSaving}
                            className={`w-full rounded-2xl border border-transparent bg-white/80 px-4 py-3 pr-12 text-sm text-slate-700 shadow-inner focus:ring-2 focus:ring-sky-200 focus:border-sky-200 ${
                              isSaving ? 'cursor-not-allowed opacity-60' : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isSaving}
                            className={`absolute inset-y-0 right-3 flex items-center text-slate-400 ${
                              isSaving ? 'opacity-60' : ''
                            }`}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="mt-1 text-xs text-rose-500">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="rounded-3xl border-t border-dashed border-sky-100 pt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="w-full border-sky-100 bg-white/80 text-slate-700 hover:bg-white sm:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="w-full bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 text-white shadow-lg shadow-sky-200/70 hover:opacity-95 sm:w-auto"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};