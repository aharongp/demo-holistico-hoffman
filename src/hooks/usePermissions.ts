import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
// type PermissionKey =
//   | 'instruments.view'
//   | 'instruments.create'
//   | 'instruments.update'
//   | 'instruments.delete'
//   | 'instruments.assign'
//   | 'patients.view'
//   | 'patients.create'
//   | 'patients.update'
//   | 'patients.delete'
//   | 'patients.assign'
//   | 'programs.view'
//   | 'programs.create'
//   | 'programs.update'
//   | 'programs.delete'
//   | 'programs.assign'
//   | 'users.view'
//   | 'users.create'
//   | 'users.update'
//   | 'users.delete'
//   | 'users.assign';

interface Permissions {
  canManageUsers: boolean;
  canManagePatients: boolean;
  canManageInstruments: boolean;
  canManagePrograms: boolean;
  canViewReports: boolean;
  canAssignInstruments: boolean;
  canViewEvolution: boolean;
  canUploadFiles: boolean;
  // canViewUsers: boolean;
  // canCreateUsers: boolean;
  // canUpdateUsers: boolean;
  // canDeleteUsers: boolean;
  // canViewPatients: boolean;
  // canCreatePatients: boolean;
  // canUpdatePatients: boolean;
  // canDeletePatients: boolean;
  // canAssignPatients: boolean;
  // canViewInstruments: boolean;
  // canCreateInstruments: boolean;
  // canUpdateInstruments: boolean;
  // canDeleteInstruments: boolean;
  // canViewPrograms: boolean;
  // canCreatePrograms: boolean;
  // canUpdatePrograms: boolean;
  // canDeletePrograms: boolean;
  // canAssignPrograms: boolean;
  isPatient: boolean;
  isTherapist: boolean;
  isAdmin: boolean;
}
//   hasPermission: (permission: PermissionKey) => boolean;
// }

// const ALL_PERMISSIONS: PermissionKey[] = [
//   'instruments.view',
//   'instruments.create',
//   'instruments.update',
//   'instruments.delete',
//   'instruments.assign',
//   'patients.view',
//   'patients.create',
//   'patients.update',
//   'patients.delete',
//   'patients.assign',
//   'programs.view',
//   'programs.create',
//   'programs.update',
//   'programs.delete',
//   'programs.assign',
//   'users.view',
//   'users.create',
//   'users.update',
//   'users.delete',
//   'users.assign',
// ];

// const THERAPIST_DEFAULT_PERMISSIONS = ALL_PERMISSIONS.filter(
//   (permission) => !permission.startsWith('users.'),
// );

// const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, PermissionKey[]> = {
//   administrator: ALL_PERMISSIONS,
//   trainer: THERAPIST_DEFAULT_PERMISSIONS,
//   therapist: THERAPIST_DEFAULT_PERMISSIONS,
//   doctor: THERAPIST_DEFAULT_PERMISSIONS,
//   coach: THERAPIST_DEFAULT_PERMISSIONS,
//   patient: [],
//   student: [],
// };

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
      // canViewUsers: false,
      // canCreateUsers: false,
      // canUpdateUsers: false,
      // canDeleteUsers: false,
      // canViewPatients: false,
      // canCreatePatients: false,
      // canUpdatePatients: false,
      // canDeletePatients: false,
      // canAssignPatients: false,
      // canViewInstruments: false,
      // canCreateInstruments: false,
      // canUpdateInstruments: false,
      // canDeleteInstruments: false,
      // canViewPrograms: false,
      // canCreatePrograms: false,
      // canUpdatePrograms: false,
      // canDeletePrograms: false,
      // canAssignPrograms: false,
      isPatient: false,
      isTherapist: false,
      isAdmin: false,
      // hasPermission: () => false,
    };
  }

  const isAdmin = user.role === 'administrator';
  const isTherapist = ['trainer', 'therapist', 'doctor', 'coach'].includes(user.role);
  const isPatient = ['patient', 'student'].includes(user.role);

  // const configuredPermissions = Array.isArray(user.permissions)
  //   ? user.permissions
  //       .map((permission) => permission.trim())
  //       .filter((permission): permission is PermissionKey => ALL_PERMISSIONS.includes(permission as PermissionKey))
  //   : [];

  // const basePermissions = configuredPermissions.length > 0
  //   ? configuredPermissions
  //   : (DEFAULT_PERMISSIONS_BY_ROLE[user.role] ?? []);

  // const permissionSet = new Set<PermissionKey>(basePermissions);

  // const hasPermission = (permission: PermissionKey) => {
  //   if (isAdmin) {
  //     return true;
  //   }
  //   return permissionSet.has(permission);
  // };

  // const canViewUsers = hasPermission('users.view');
  // const canCreateUsers = hasPermission('users.create');
  // const canUpdateUsers = hasPermission('users.update');
  // const canDeleteUsers = hasPermission('users.delete');

  // const canViewPatients = hasPermission('patients.view');
  // const canCreatePatients = hasPermission('patients.create');
  // const canUpdatePatients = hasPermission('patients.update');
  // const canDeletePatients = hasPermission('patients.delete');
  // const canAssignPatients = hasPermission('patients.assign');

  // const canViewInstruments = hasPermission('instruments.view');
  // const canCreateInstruments = hasPermission('instruments.create');
  // const canUpdateInstruments = hasPermission('instruments.update');
  // const canDeleteInstruments = hasPermission('instruments.delete');

  // const canViewPrograms = hasPermission('programs.view');
  // const canCreatePrograms = hasPermission('programs.create');
  // const canUpdatePrograms = hasPermission('programs.update');
  // const canDeletePrograms = hasPermission('programs.delete');
  // const canAssignPrograms = hasPermission('programs.assign');

  return {
    canManageUsers: isAdmin,
    canManagePatients: isAdmin || isTherapist,
    canManageInstruments: isAdmin || isTherapist,
    canManagePrograms: isAdmin || isTherapist,
    canViewReports: isAdmin || isTherapist,
    canAssignInstruments: isAdmin || isTherapist,
    // canManageUsers: canViewUsers || canCreateUsers || canUpdateUsers || canDeleteUsers,
    // canManagePatients: canViewPatients || canCreatePatients || canUpdatePatients || canDeletePatients,
    // canManageInstruments: canViewInstruments || canCreateInstruments || canUpdateInstruments || canDeleteInstruments,
    // canManagePrograms: canViewPrograms || canCreatePrograms || canUpdatePrograms || canDeletePrograms,
    // canViewReports: isAdmin || isTherapist || canViewPatients || canViewInstruments || canViewPrograms,
    // canAssignInstruments: hasPermission('instruments.assign'),
    canViewEvolution: true, // All users can view evolution (filtered by their permissions)
    canUploadFiles: isPatient || isAdmin,
    // canViewUsers,
    // canCreateUsers,
    // canUpdateUsers,
    // canDeleteUsers,
    // canViewPatients,
    // canCreatePatients,
    // canUpdatePatients,
    // canDeletePatients,
    // canAssignPatients,
    // canViewInstruments,
    // canCreateInstruments,
    // canUpdateInstruments,
    // canDeleteInstruments,
    // canViewPrograms,
    // canCreatePrograms,
    // canUpdatePrograms,
    // canDeletePrograms,
    // canAssignPrograms,
    isPatient,
    isTherapist,
    isAdmin,
    // hasPermission,
  };
};