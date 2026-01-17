import React, { useCallback } from 'react';
import { Button } from '../../../components/UI/Button';
import {
  MedicalHistoryData,
  alterationOptions,
  clinicalBackgroundFields,
  diseaseOptions,
  familyPathologyLabels,
  gynecologicalFields,
  immunizationOptions,
  lifestyleFields,
} from '../../MedicalHistory/MedicalHistory';

type SetMedicalHistoryData = React.Dispatch<React.SetStateAction<MedicalHistoryData>>;

export interface PatientMedicalHistoryFormProps {
  data: MedicalHistoryData;
  setData: SetMedicalHistoryData;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  noticeMessage?: string | null;
  isLoading?: boolean;
}

export const PatientMedicalHistoryForm: React.FC<PatientMedicalHistoryFormProps> = ({
  data,
  setData,
  onSubmit,
  isSaving,
  errorMessage = null,
  successMessage = null,
  noticeMessage = null,
  isLoading = false,
}) => {
  const updatePersonalField = useCallback(
    (field: keyof MedicalHistoryData['personal'], value: string) => {
      setData(prev => ({
        ...prev,
        personal: {
          ...prev.personal,
          [field]: value,
        },
      }));
    },
    [setData]
  );

  const updateContactField = useCallback(
    (field: keyof MedicalHistoryData['contacts'], value: string) => {
      setData(prev => ({
        ...prev,
        contacts: {
          ...prev.contacts,
          [field]: value,
        },
      }));
    },
    [setData]
  );

  const updateTreatingDoctorField = useCallback(
    (field: keyof MedicalHistoryData['treatingDoctor'], value: string) => {
      setData(prev => ({
        ...prev,
        treatingDoctor: {
          ...prev.treatingDoctor,
          [field]: value,
        },
      }));
    },
    [setData]
  );

  const updateFamilyPathologyField = useCallback(
    (field: keyof MedicalHistoryData['family']['pathologies'], value: string) => {
      setData(prev => ({
        ...prev,
        family: {
          ...prev.family,
          pathologies: {
            ...prev.family.pathologies,
            [field]: value,
          },
        },
      }));
    },
    [setData]
  );

  const updateFamilyContextField = useCallback(
    (field: keyof MedicalHistoryData['family']['context'], value: string) => {
      setData(prev => ({
        ...prev,
        family: {
          ...prev.family,
          context: {
            ...prev.family.context,
            [field]: value,
          },
        },
      }));
    },
    [setData]
  );

  const updateImmunizationField = useCallback(
    (
      field: keyof MedicalHistoryData['immunizations'],
      value: MedicalHistoryData['immunizations'][keyof MedicalHistoryData['immunizations']]
    ) => {
      setData(prev => ({
        ...prev,
        immunizations: {
          ...prev.immunizations,
          [field]: value,
        },
      }));
    },
    [setData]
  );

  const updateGynecologicalField = useCallback(
    (field: keyof MedicalHistoryData['gynecological'], value: string) => {
      setData(prev => ({
        ...prev,
        gynecological: {
          ...prev.gynecological,
          [field]: value,
        },
      }));
    },
    [setData]
  );

  const updateLifestyleField = useCallback(
    (field: keyof MedicalHistoryData['lifestyle'], value: string) => {
      setData(prev => ({
        ...prev,
        lifestyle: {
          ...prev.lifestyle,
          [field]: value,
        },
      }));
    },
    [setData]
  );

  const updateClinicalBackgroundField = useCallback(
    (field: keyof MedicalHistoryData['clinicalBackground'], value: string) => {
      setData(prev => ({
        ...prev,
        clinicalBackground: {
          ...prev.clinicalBackground,
          [field]: value,
        },
      }));
    },
    [setData]
  );

  const updateAlterationField = useCallback(
    (key: keyof MedicalHistoryData['alterations'], value: boolean) => {
      setData(prev => ({
        ...prev,
        alterations: {
          ...prev.alterations,
          [key]: value,
        },
      }));
    },
    [setData]
  );

  const updateDiseaseField = useCallback(
    (key: keyof MedicalHistoryData['diseases'], value: string) => {
      setData(prev => ({
        ...prev,
        diseases: {
          ...prev.diseases,
          [key]: value,
        },
      }));
    },
    [setData]
  );

  const isDisabled = isSaving || isLoading;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {errorMessage && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {noticeMessage && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {noticeMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {isLoading && !errorMessage && (
        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Cargando historia médica...
        </div>
      )}

      <fieldset className="space-y-6" disabled={isDisabled}>
        <details className="group rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-colors open:border-[#FAD4B1]" open>
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-800">
            <span>Identificación</span>
            <span className="text-xs text-gray-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lugar de nacimiento
              </label>
              <input
                type="text"
                value={data.personal.birthPlace}
                onChange={(e) => updatePersonalField('birthPlace', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de nacimiento
              </label>
              <input
                type="time"
                value={data.personal.birthTime}
                onChange={(e) => updatePersonalField('birthTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={data.personal.birthDate}
                onChange={(e) => updatePersonalField('birthDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado civil
              </label>
              <select
                value={data.personal.maritalStatus}
                onChange={(e) => updatePersonalField('maritalStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="divorciado">Divorciado/a</option>
                <option value="viudo">Viudo/a</option>
                <option value="union_libre">Unión libre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profesión
              </label>
              <input
                type="text"
                value={data.personal.profession}
                onChange={(e) => updatePersonalField('profession', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ocupación
              </label>
              <input
                type="text"
                value={data.personal.occupation}
                onChange={(e) => updatePersonalField('occupation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-colors open:border-[#FAD4B1]">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-800">
            <span>Contacto y Emergencias</span>
            <span className="text-xs text-gray-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={data.contacts.phone}
                onChange={(e) => updateContactField('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Familiar cercano
              </label>
              <input
                type="text"
                value={data.contacts.closeFamily}
                onChange={(e) => updateContactField('closeFamily', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parentesco
              </label>
              <input
                type="text"
                value={data.contacts.relationship}
                onChange={(e) => updateContactField('relationship', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono del familiar
              </label>
              <input
                type="tel"
                value={data.contacts.familyPhone}
                onChange={(e) => updateContactField('familyPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contacto de emergencia
              </label>
              <input
                type="text"
                value={data.contacts.emergencyContact}
                onChange={(e) => updateContactField('emergencyContact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo de emergencia
              </label>
              <input
                type="email"
                value={data.contacts.emergencyEmail}
                onChange={(e) => updateContactField('emergencyEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono de emergencia
              </label>
              <input
                type="tel"
                value={data.contacts.emergencyPhone}
                onChange={(e) => updateContactField('emergencyPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <textarea
              value={data.contacts.address}
              onChange={(e) => updateContactField('address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa y dirección laboral
            </label>
            <textarea
              value={data.contacts.companyAddress}
              onChange={(e) => updateContactField('companyAddress', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-colors open:border-[#FAD4B1]">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-800">
            <span>Médico Tratante</span>
            <span className="text-xs text-gray-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Médico tratante
              </label>
              <input
                type="text"
                value={data.treatingDoctor.treatingDoctor}
                onChange={(e) => updateTreatingDoctorField('treatingDoctor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidad
              </label>
              <input
                type="text"
                value={data.treatingDoctor.specialty}
                onChange={(e) => updateTreatingDoctorField('specialty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medicación que recibe
            </label>
            <textarea
              value={data.treatingDoctor.currentMedication}
              onChange={(e) => updateTreatingDoctorField('currentMedication', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-colors open:border-[#FAD4B1]">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-800">
            <span>Antecedentes Familiares</span>
            <span className="text-xs text-gray-400 transition group-open:rotate-180">▾</span>
          </summary>
          <p className="mt-4 text-sm text-gray-600">
            Registre el parentesco del familiar directo que haya presentado cada condición
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(familyPathologyLabels) as Array<keyof MedicalHistoryData['family']['pathologies']>).map((key) => (
              <div key={key} className={key === 'others' ? 'md:col-span-2' : undefined}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {familyPathologyLabels[key]}
                </label>
                {key === 'others' ? (
                  <textarea
                    value={data.family.pathologies[key]}
                    onChange={(e) => updateFamilyPathologyField(key, e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={data.family.pathologies[key]}
                    onChange={(e) => updateFamilyPathologyField(key, e.target.value)}
                    placeholder="Parentesco (ej: padre, madre, hermano)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-colors open:border-[#FAD4B1]">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-800">
            <span>Contexto Familiar</span>
            <span className="text-xs text-gray-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Edad del padre
              </label>
              <input
                type="text"
                value={data.family.context.fatherAge}
                onChange={(e) => updateFamilyContextField('fatherAge', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado del padre
              </label>
              <input
                type="text"
                value={data.family.context.fatherStatus}
                onChange={(e) => updateFamilyContextField('fatherStatus', e.target.value)}
                placeholder="Vivo, fallecido, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Edad de la madre
              </label>
              <input
                type="text"
                value={data.family.context.motherAge}
                onChange={(e) => updateFamilyContextField('motherAge', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de la madre
              </label>
              <input
                type="text"
                value={data.family.context.motherStatus}
                onChange={(e) => updateFamilyContextField('motherStatus', e.target.value)}
                placeholder="Viva, fallecida, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de hermanos
              </label>
              <input
                type="text"
                value={data.family.context.siblingsCount}
                onChange={(e) => updateFamilyContextField('siblingsCount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Posición entre los hermanos
              </label>
              <input
                type="text"
                value={data.family.context.siblingPosition}
                onChange={(e) => updateFamilyContextField('siblingPosition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de hijos
              </label>
              <input
                type="text"
                value={data.family.context.childrenCount}
                onChange={(e) => updateFamilyContextField('childrenCount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Con quién vive?
              </label>
              <input
                type="text"
                value={data.family.context.livesWith}
                onChange={(e) => updateFamilyContextField('livesWith', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-colors open:border-[#FAD4B1]">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-800">
            <span>Esquema de Vacunación</span>
            <span className="text-xs text-gray-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {immunizationOptions.map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={Boolean(data.immunizations[key])}
                  onChange={(e) => updateImmunizationField(key, e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Otras vacunas
            </label>
            <textarea
              value={data.immunizations.otherImmunization}
              onChange={(e) => updateImmunizationField('otherImmunization', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-colors open:border-[#FAD4B1]">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-800">
            <span>Historia Ginecológica</span>
            <span className="text-xs text-gray-400 transition group-open:rotate-180">▾</span>
          </summary>
          <p className="mt-4 text-sm text-gray-600">Complete en caso de aplicar</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {gynecologicalFields.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label}
                </label>
                <input
                  type="text"
                  value={data.gynecological[key]}
                  onChange={(e) => updateGynecologicalField(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-colors open:border-[#FAD4B1]">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-800">
            <span>Estilo de Vida</span>
            <span className="text-xs text-gray-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {lifestyleFields.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label}
                </label>
                <input
                  type="text"
                  value={data.lifestyle[key]}
                  onChange={(e) => updateLifestyleField(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-colors open:border-[#fdba74]">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-800">
            <span>Antecedentes Clínicos</span>
            <span className="text-xs text-gray-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {clinicalBackgroundFields.map(({ key, label, type }) => {
              if (key === 'otherDisease') {
                return (
                  <React.Fragment key={key}>
                    <div className="md:col-span-2">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Antecedentes de enfermedades</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {diseaseOptions.map(({ key: diseaseKey, label: diseaseLabel }) => (
                          <div key={diseaseKey}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {diseaseLabel}
                            </label>
                            <input
                              type="text"
                              value={data.diseases[diseaseKey]}
                              onChange={(e) => updateDiseaseField(diseaseKey, e.target.value)}
                              placeholder="Agregue el año de inicio o alguna otra informacion"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                      </label>
                      <textarea
                        value={data.clinicalBackground[key]}
                        onChange={(e) => updateClinicalBackgroundField(key, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </React.Fragment>
                );
              }

              if (key === 'otherAlteration') {
                return (
                  <React.Fragment key={key}>
                    <div className="md:col-span-2">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Alteraciones</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {alterationOptions.map(({ key: alterationKey, label: alterationLabel }) => (
                          <label key={alterationKey} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={Boolean(data.alterations[alterationKey])}
                              onChange={(e) => updateAlterationField(alterationKey, e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{alterationLabel}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                      </label>
                      <textarea
                        value={data.clinicalBackground[key]}
                        onChange={(e) => updateClinicalBackgroundField(key, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <div key={key} className={type === 'textarea' ? 'md:col-span-2' : undefined}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                  </label>
                  {type === 'textarea' ? (
                    <textarea
                      value={data.clinicalBackground[key]}
                      onChange={(e) => updateClinicalBackgroundField(key, e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={data.clinicalBackground[key]}
                      onChange={(e) => updateClinicalBackgroundField(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </details>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button type="submit" disabled={isDisabled}>
            {isSaving ? 'Guardando...' : 'Guardar historia médica'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
};
