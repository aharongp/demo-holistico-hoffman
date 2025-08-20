import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface Permissions {
  canManageUsers: boolean;
  canManagePatients: boolean;
  canManageInstruments: boolean;
  canManagePrograms: boolean;
  canViewReports: boolean;
  canAssignInstruments: boolean;
  canViewEvolution: boolean;
  canUploadFiles: boolean;
  isPatient: boolean;
  isTherapist: boolean;
  isAdmin: boolean;
}

export const usePermissions = (): Permissions => {
  const { user } = useAuth();

  if (!user) {
    return {
      canManageUsers: false,
      canManagePatients: false,
      canManageInstruments: false,
      canManagePrograms: false,
      canViewReports: false,
      canAssignInstruments: false,
      canViewEvolution: false,
      canUploadFiles: false,
      isPatient: false,
      isTherapist: false,
      isAdmin: false,
    };
  }

  const isAdmin = user.role === 'administrator';
  const isTherapist = ['trainer', 'therapist', 'doctor', 'coach'].includes(user.role);
  const isPatient = ['patient', 'student'].includes(user.role);

  return {
    canManageUsers: isAdmin,
    canManagePatients: isAdmin || isTherapist,
    canManageInstruments: isAdmin || isTherapist,
    canManagePrograms: isAdmin || isTherapist,
    canViewReports: isAdmin || isTherapist,
    canAssignInstruments: isAdmin || isTherapist,
    canViewEvolution: true, // All users can view evolution (filtered by their permissions)
    canUploadFiles: isPatient || isAdmin,
    isPatient,
    isTherapist,
    isAdmin,
  };
};