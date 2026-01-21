import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, File, Download, Trash2, Plus, Edit, Eye } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { PatientMedicalHistoryForm } from '../Evolution/components/PatientMedicalHistoryForm';
import { useAuth } from '../../context/AuthContext';

export type AlterationKey =
  | 'perdidaDePeso'
  | 'gananciaDePeso'
  | 'confusion'
  | 'nerviosismo'
  | 'descontrolEmotivo'
  | 'tensionMuscular'
  | 'calambreMuscular'
  | 'cambioColorPiel'
  | 'picazon'
  | 'erupcionesCutaneas'
  | 'furunculos'
  | 'fiebres'
  | 'pesadillas'
  | 'vertigoMareos'
  | 'desmayos'
  | 'ruidosOidos'
  | 'doloresOidos'
  | 'secrecionesOidos'
  | 'visionBorrosaDoble'
  | 'secrecionesArdorOjos'
  | 'congestionNasal'
  | 'hemorragiaNasal'
  | 'llagasBoca'
  | 'malAliento'
  | 'problemasDientesEncias'
  | 'gargantaDolorida'
  | 'tos'
  | 'esputoConSangre'
  | 'dificultadesRespiratorias'
  | 'palpitaciones'
  | 'doloresCuello'
  | 'doloresPecho'
  | 'bultosDoloresSenos'
  | 'dolorAbdominal'
  | 'dificultadDigestiva'
  | 'estrenimiento'
  | 'diarrea'
  | 'hecesNegrasSangre'
  | 'colicos'
  | 'acidez'
  | 'hemorroides'
  | 'orinaQuemante'
  | 'despiertaOrinar'
  | 'sangreOrina'
  | 'doloresEspalda'
  | 'piernasHinchadas'
  | 'doloresHuesos'
  | 'doloresArticulaciones'
  | 'problemasBrazos'
  | 'problemasHombros'
  | 'problemasPiernas'
  | 'paralisis'
  | 'trastornosSensibilidad'
  | 'dolorRectalRafagas'
  | 'miomasQuistesOvarios';

export type DiseaseKey =
  | 'sarampion'
  | 'lechina'
  | 'escarlatina'
  | 'difteria'
  | 'tosferina'
  | 'paperas'
  | 'polio'
  | 'tetano'
  | 'disenteria'
  | 'parasitos'
  | 'meningitis'
  | 'asma'
  | 'acne'
  | 'forunculosis'
  | 'eczema'
  | 'psoriasis'
  | 'alergia'
  | 'sinusitis'
  | 'anginas'
  | 'bronquitis'
  | 'diabetes'
  | 'enfermedadTiroidea'
  | 'enfermedadCardiaca'
  | 'enfermedadNeurologica'
  | 'enfermedadMental'
  | 'epilepsia'
  | 'litiasisRenal'
  | 'litiasisVesicular'
  | 'hepatitis'
  | 'nefritis'
  | 'gastritis'
  | 'ulcera'
  | 'lepra'
  | 'tbc'
  | 'sifilis'
  | 'blenorragia'
  | 'otraVenerea'
  | 'fiebreReumatica'
  | 'artritis'
  | 'enfermedadMuscular'
  | 'gota'
  | 'cancer';

export interface MedicalHistoryData {
  personal: {
    birthPlace: string;
    birthTime: string;
    birthDate: string;
    maritalStatus: string;
    profession: string;
    occupation: string;
  };
  contacts: {
    phone: string;
    address: string;
    companyAddress: string;
    closeFamily: string;
    relationship: string;
    familyPhone: string;
    emergencyContact: string;
    emergencyEmail: string;
    emergencyPhone: string;
  };
  treatingDoctor: {
    treatingDoctor: string;
    specialty: string;
    currentMedication: string;
  };
  family: {
    pathologies: {
      cancer: string;
      tuberculosis: string;
      diabetes: string;
      asthma: string;
      highBloodPressure: string;
      epilepsy: string;
      mentalIllness: string;
      suicide: string;
      bloodDisease: string;
      vascularDisease: string;
      arthritis: string;
      syphilis: string;
      others: string;
    };
    context: {
      fatherAge: string;
      motherAge: string;
      fatherStatus: string;
      motherStatus: string;
      siblingsCount: string;
      siblingPosition: string;
      childrenCount: string;
      livesWith: string;
    };
  };
  immunizations: {
    bcg: boolean;
    polio: boolean;
    measles: boolean;
    typhoid: boolean;
    triple: boolean;
    tetanus: boolean;
    cholera: boolean;
    yellowFever: boolean;
    otherImmunization: string;
  };
  gynecological: {
    developmentAge: string;
    menstruation: string;
    menstrualCycle: string;
    flow: string;
    birthControlMethod: string;
    pregnancies: string;
    labors: string;
    cesareans: string;
    births: string;
    abortions: string;
    menopauseAge: string;
  };
  lifestyle: {
    sport: string;
    sportFrequency: string;
    workingHours: string;
    jobSatisfaction: string;
    jobStability: string;
    rest: string;
    freeTime: string;
    workSharing: string;
    leisure: string;
    pets: string;
    plants: string;
    technology: string;
    creed: string;
    consumption: string;
    friendships: string;
    partner: string;
    family: string;
    spirituality: string;
  };
  clinicalBackground: {
    otherDisease: string;
    surgeries: string;
    injuries: string;
    therapies: string;
    allergies: string;
    currentIllness: string;
    otherAlteration: string;
    breathing: string;
    appetite: string;
    aversions: string;
    intolerances: string;
    drinks: string;
    addictions: string;
    evacuation: string;
    vitality: string;
    sleep: string;
    skinManifestation: string;
    sweatingTemperature: string;
    urination: string;
    sexuality: string;
    psychiatricCondition: string;
    physicalCondition: string;
    bloodGroup: string;
    biotype: string;
  };
  alterations: Record<AlterationKey, boolean>;
  diseases: Record<DiseaseKey, string>;
}

interface MedicalFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  category: 'lab_results' | 'imaging' | 'prescription' | 'consultation' | 'other';
  attachmentId?: number | null;
  downloadPath?: string | null;
}

type NullableStringRecord<T> = {
  [K in keyof T]?: string | null;
};

export interface RemotePatientMedicalHistory {
  personal?: NullableStringRecord<MedicalHistoryData['personal']>;
  contacts?: NullableStringRecord<MedicalHistoryData['contacts']>;
  treatingDoctor?: NullableStringRecord<MedicalHistoryData['treatingDoctor']>;
  family?: {
    pathologies?: NullableStringRecord<MedicalHistoryData['family']['pathologies']>;
    context?: NullableStringRecord<MedicalHistoryData['family']['context']>;
  };
  immunizations?: Partial<Record<keyof MedicalHistoryData['immunizations'], boolean | string | null>>;
  gynecological?: NullableStringRecord<MedicalHistoryData['gynecological']>;
  lifestyle?: NullableStringRecord<MedicalHistoryData['lifestyle']>;
  clinicalBackground?: NullableStringRecord<MedicalHistoryData['clinicalBackground']>;
  attachments?: Array<{
    id?: number | null;
    file?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }>;
  diseases?: Array<{
    id?: number | null;
    disease?: string | null;
    status?: string | null;
    onset?: string | null;
  }>;
}

const normalizeLabelKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const DISEASE_NAME_TO_KEY: Record<string, DiseaseKey> = {
  sarampion: 'sarampion',
  lechina: 'lechina',
  escarlatina: 'escarlatina',
  difteria: 'difteria',
  tosferina: 'tosferina',
  paperas: 'paperas',
  polio: 'polio',
  tetano: 'tetano',
  disenteria: 'disenteria',
  parasitos: 'parasitos',
  meningitis: 'meningitis',
  asma: 'asma',
  acne: 'acne',
  forunculosis: 'forunculosis',
  eczema: 'eczema',
  psoriasis: 'psoriasis',
  alergia: 'alergia',
  sinusitis: 'sinusitis',
  anginas: 'anginas',
  bronquitis: 'bronquitis',
  diabetes: 'diabetes',
  enfermedadtiroidea: 'enfermedadTiroidea',
  enfermedadcardiaca: 'enfermedadCardiaca',
  enfermedadneurologica: 'enfermedadNeurologica',
  enfermedadmental: 'enfermedadMental',
  epilepsia: 'epilepsia',
  litiasisrenal: 'litiasisRenal',
  litiasisvesicular: 'litiasisVesicular',
  hepatitis: 'hepatitis',
  nefritis: 'nefritis',
  gastritis: 'gastritis',
  ulcera: 'ulcera',
  lepra: 'lepra',
  tbc: 'tbc',
  sifilis: 'sifilis',
  blenorragia: 'blenorragia',
  otravenera: 'otraVenerea',
  fiebrereumatica: 'fiebreReumatica',
  artritis: 'artritis',
  enfermedadmuscular: 'enfermedadMuscular',
  gota: 'gota',
  cancer: 'cancer',
};

const createInitialAlterations = (): Record<AlterationKey, boolean> => ({
  perdidaDePeso: false,
  gananciaDePeso: false,
  confusion: false,
  nerviosismo: false,
  descontrolEmotivo: false,
  tensionMuscular: false,
  calambreMuscular: false,
  cambioColorPiel: false,
  picazon: false,
  erupcionesCutaneas: false,
  furunculos: false,
  fiebres: false,
  pesadillas: false,
  vertigoMareos: false,
  desmayos: false,
  ruidosOidos: false,
  doloresOidos: false,
  secrecionesOidos: false,
  visionBorrosaDoble: false,
  secrecionesArdorOjos: false,
  congestionNasal: false,
  hemorragiaNasal: false,
  llagasBoca: false,
  malAliento: false,
  problemasDientesEncias: false,
  gargantaDolorida: false,
  tos: false,
  esputoConSangre: false,
  dificultadesRespiratorias: false,
  palpitaciones: false,
  doloresCuello: false,
  doloresPecho: false,
  bultosDoloresSenos: false,
  dolorAbdominal: false,
  dificultadDigestiva: false,
  estrenimiento: false,
  diarrea: false,
  hecesNegrasSangre: false,
  colicos: false,
  acidez: false,
  hemorroides: false,
  orinaQuemante: false,
  despiertaOrinar: false,
  sangreOrina: false,
  doloresEspalda: false,
  piernasHinchadas: false,
  doloresHuesos: false,
  doloresArticulaciones: false,
  problemasBrazos: false,
  problemasHombros: false,
  problemasPiernas: false,
  paralisis: false,
  trastornosSensibilidad: false,
  dolorRectalRafagas: false,
  miomasQuistesOvarios: false,
});

const createInitialDiseases = (): Record<DiseaseKey, string> => ({
  sarampion: '',
  lechina: '',
  escarlatina: '',
  difteria: '',
  tosferina: '',
  paperas: '',
  polio: '',
  tetano: '',
  disenteria: '',
  parasitos: '',
  meningitis: '',
  asma: '',
  acne: '',
  forunculosis: '',
  eczema: '',
  psoriasis: '',
  alergia: '',
  sinusitis: '',
  anginas: '',
  bronquitis: '',
  diabetes: '',
  enfermedadTiroidea: '',
  enfermedadCardiaca: '',
  enfermedadNeurologica: '',
  enfermedadMental: '',
  epilepsia: '',
  litiasisRenal: '',
  litiasisVesicular: '',
  hepatitis: '',
  nefritis: '',
  gastritis: '',
  ulcera: '',
  lepra: '',
  tbc: '',
  sifilis: '',
  blenorragia: '',
  otraVenerea: '',
  fiebreReumatica: '',
  artritis: '',
  enfermedadMuscular: '',
  gota: '',
  cancer: '',
});

export const TOOTH_NUMBER_BY_WORD = {
  primero: 1,
  segundo: 2,
  tercero: 3,
  cuarto: 4,
  quinto: 5,
  sexto: 6,
  septimo: 7,
  octavo: 8,
} as const;

export const DENTAL_FIELD_GROUPS = {
  superiorDerecha: {
    label: 'Superior derecha',
    code: 'SD',
    prefix: 'sd',
    order: [
      'octavo_sd',
      'septimo_sd',
      'sexto_sd',
      'quinto_sd',
      'cuarto_sd',
      'tercero_sd',
      'segundo_sd',
      'primero_sd',
    ] as const,
  },
  superiorIzquierda: {
    label: 'Superior izquierda',
    code: 'SI',
    prefix: 'si',
    order: [
      'primero_si',
      'segundo_si',
      'tercero_si',
      'cuarto_si',
      'quinto_si',
      'sexto_si',
      'septimo_si',
      'octavo_si',
    ] as const,
  },
  inferiorDerecha: {
    label: 'Inferior derecha',
    code: 'ID',
    prefix: 'id',
    order: [
      'octavo_id',
      'septimo_id',
      'sexto_id',
      'quinto_id',
      'cuarto_id',
      'tercero_id',
      'segundo_id',
      'primero_id',
    ] as const,
  },
  inferiorIzquierda: {
    label: 'Inferior izquierda',
    code: 'II',
    prefix: 'iiz',
    order: [
      'primero_iiz',
      'segundo_iiz',
      'tercero_iiz',
      'cuarto_iiz',
      'quinto_iiz',
      'sexto_iiz',
      'septimo_iiz',
      'octavo_iiz',
    ] as const,
  },
} as const;

export type DentalQuadrantKey = keyof typeof DENTAL_FIELD_GROUPS;
export type DentalField =
  (typeof DENTAL_FIELD_GROUPS)[DentalQuadrantKey]['order'][number];

export type DentalPresenceState = Record<DentalField, boolean | null>;
export type DentalFindingsState = Record<DentalField, string>;

export interface DentalFieldMeta {
  field: DentalField;
  quadrantKey: DentalQuadrantKey;
  quadrantLabel: string;
  prefix: string;
  displayCode: string;
  number: number;
}

export const DENTAL_FIELDS = (
  Object.values(DENTAL_FIELD_GROUPS) as Array<
    (typeof DENTAL_FIELD_GROUPS)[DentalQuadrantKey]
  >
).flatMap((group) => [...group.order]) as DentalField[];

export const DENTAL_FIELD_META = DENTAL_FIELDS.reduce<Record<DentalField, DentalFieldMeta>>(
  (acc, field) => {
    const [word] = field.split('_') as [keyof typeof TOOTH_NUMBER_BY_WORD, string];
    const quadrantEntry = Object.entries(DENTAL_FIELD_GROUPS).find(([, value]) =>
      value.order.includes(field as never),
    ) as [DentalQuadrantKey, (typeof DENTAL_FIELD_GROUPS)[DentalQuadrantKey]] | undefined;

    if (quadrantEntry) {
      const [quadrantKey, config] = quadrantEntry;
      acc[field] = {
        field,
        quadrantKey,
        quadrantLabel: config.label,
        prefix: config.prefix,
        displayCode: config.code,
        number: TOOTH_NUMBER_BY_WORD[word] ?? 0,
      };
    }

    return acc;
  },
  {} as Record<DentalField, DentalFieldMeta>,
);

export const createInitialDentalPresence = (): DentalPresenceState => {
  const state = {} as DentalPresenceState;
  DENTAL_FIELDS.forEach((field) => {
    state[field] = null;
  });
  return state;
};

export const createInitialDentalFindings = (): DentalFindingsState => {
  const state = {} as DentalFindingsState;
  DENTAL_FIELDS.forEach((field) => {
    state[field] = '';
  });
  return state;
};

export type DentalPresenceSelection = 'present' | 'absent' | 'unknown';

export const presenceSelectionFromBoolean = (
  value: boolean | null,
): DentalPresenceSelection => {
  if (value === true) {
    return 'present';
  }
  if (value === false) {
    return 'absent';
  }
  return 'unknown';
};

export const presenceSelectionToPayload = (
  value: DentalPresenceSelection,
): number | null => {
  if (value === 'present') {
    return 1;
  }
  if (value === 'absent') {
    return 0;
  }
  return null;
};

export const DENTAL_PRESENCE_OPTIONS: Array<{
  value: DentalPresenceSelection;
  label: string;
  helper: string;
}> = [
  { value: 'present', label: 'Presente', helper: 'Marcar como diente presente' },
  { value: 'absent', label: 'Ausente', helper: 'Marcar como diente ausente' },
  { value: 'unknown', label: 'No definido', helper: 'Sin información registrada' },
];

export interface OcularExamRow {
  id: number;
  dateLabel: string;
  reason: string;
  rightObservation: string;
  rightEye: string;
  rightEyeImageUrl: string | null;
  leftObservation: string;
  leftEye: string;
  leftEyeImageUrl: string | null;
  rightComment: string;
  leftComment: string;
}

type OcularExamRecordInput = Record<string, unknown>;

interface NormalizedOcularExamRow {
  sortKey: number;
  row: OcularExamRow;
}

export interface OcularFormState {
  date: string;
  reason: string;
  rightObservation: string;
  leftObservation: string;
  comment: string;
  rightEyeFile: File | null;
  leftEyeFile: File | null;
}

export const createInitialOcularForm = (): OcularFormState => ({
  date: '',
  reason: '',
  rightObservation: '',
  leftObservation: '',
  comment: '',
  rightEyeFile: null,
  leftEyeFile: null,
});

const consultationDateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
});

const formatConsultationDate = (value?: string | null): string => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return consultationDateFormatter.format(parsed);
};

const sanitizeConsultationString = (value: unknown): string => {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value).trim();
};

export interface ConsultationRow {
  id: number;
  dateLabel: string;
  reason: string;
  weight: string;
  bodyMassIndex: string;
  bodyFat: string;
  pulse: string;
  maxHeartRate: string;
  bloodPressure: string;
  waist: string;
  hip: string;
  recommendation: string;
  observation: string;
  diagnosis: string;
}

export interface ConsultationFormState {
  date: string;
  reason: string;
  weight: string;
  bodyMassIndex: string;
  bodyFat: string;
  pulse: string;
  maxHeartRate: string;
  bloodPressure: string;
  arm: string;
  thigh: string;
  waist: string;
  hip: string;
  chest: string;
  neck: string;
  finding: string;
  recommendation: string;
  observation: string;
  diagnosis: string;
  breathing: string;
  evolution: string;
  coachRecommendation: string;
  indications: string;
}

export const createInitialConsultationForm = (): ConsultationFormState => ({
  date: '',
  reason: '',
  weight: '',
  bodyMassIndex: '',
  bodyFat: '',
  pulse: '',
  maxHeartRate: '',
  bloodPressure: '',
  arm: '',
  thigh: '',
  waist: '',
  hip: '',
  chest: '',
  neck: '',
  finding: '',
  recommendation: '',
  observation: '',
  diagnosis: '',
  breathing: '',
  evolution: '',
  coachRecommendation: '',
  indications: '',
});

interface NormalizedConsultationRow {
  sortKey: number;
  row: ConsultationRow;
}

export const normalizeConsultationRecords = (
  records: unknown[],
): ConsultationRow[] => {
  const normalized: NormalizedConsultationRow[] = [];

  records.forEach((record, index) => {
    if (!record || typeof record !== 'object') {
      return;
    }

    const raw = record as Record<string, unknown>;
    const rawDate = typeof raw.date === 'string' ? raw.date : null;
    const legacyDate = typeof raw['fecha'] === 'string' ? raw['fecha'] : null;
    const dateValue = rawDate ?? legacyDate ?? null;
    const timestamp = dateValue ? new Date(dateValue).getTime() : Number.NaN;
    const sortKey = Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;

    const idCandidate = Number(raw.id);
    const id = Number.isFinite(idCandidate) ? idCandidate : -(index + 1);

    const reason = sanitizeConsultationString(raw.reason ?? raw['motivo']);
    const weight = sanitizeConsultationString(raw.weight ?? raw['peso']);
    const bodyMassIndex = sanitizeConsultationString(
      raw.bodyMassIndex ?? raw['imc'],
    );
    const bodyFat = sanitizeConsultationString(raw.bodyFat ?? raw['gc']);
    const pulse = sanitizeConsultationString(raw.pulse ?? raw['pulso']);
    const maxHeartRate = sanitizeConsultationString(raw.maxHeartRate ?? raw['fcm']);
    const bloodPressure = sanitizeConsultationString(
      raw.bloodPressure ?? raw['tension'],
    );
    const waist = sanitizeConsultationString(raw.waist ?? raw['cintura']);
    const hip = sanitizeConsultationString(raw.hip ?? raw['cadera']);
    const recommendation = sanitizeConsultationString(
      raw.recommendation ?? raw['recomendacion'],
    );
    const observation = sanitizeConsultationString(
      raw.observation ?? raw['observacion'],
    );
    const diagnosis = sanitizeConsultationString(raw.diagnosis ?? raw['diagnostico']);

    normalized.push({
      sortKey,
      row: {
        id,
        dateLabel: formatConsultationDate(dateValue),
        reason,
        weight,
        bodyMassIndex,
        bodyFat,
        pulse,
        maxHeartRate,
        bloodPressure,
        waist,
        hip,
        recommendation,
        observation,
        diagnosis,
      },
    });
  });

  return normalized
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ row }) => row);
};

export const createInitialMedicalHistory = (): MedicalHistoryData => ({
  personal: {
    birthPlace: '',
    birthTime: '',
    birthDate: '',
    maritalStatus: '',
    profession: '',
    occupation: '',
  },
  contacts: {
    phone: '',
    address: '',
    companyAddress: '',
    closeFamily: '',
    relationship: '',
    familyPhone: '',
    emergencyContact: '',
    emergencyEmail: '',
    emergencyPhone: '',
  },
  treatingDoctor: {
    treatingDoctor: '',
    specialty: '',
    currentMedication: '',
  },
  family: {
    pathologies: {
      cancer: '',
      tuberculosis: '',
      diabetes: '',
      asthma: '',
      highBloodPressure: '',
      epilepsy: '',
      mentalIllness: '',
      suicide: '',
      bloodDisease: '',
      vascularDisease: '',
      arthritis: '',
      syphilis: '',
      others: '',
    },
    context: {
      fatherAge: '',
      motherAge: '',
      fatherStatus: '',
      motherStatus: '',
      siblingsCount: '',
      siblingPosition: '',
      childrenCount: '',
      livesWith: '',
    },
  },
  immunizations: {
    bcg: false,
    polio: false,
    measles: false,
    typhoid: false,
    triple: false,
    tetanus: false,
    cholera: false,
    yellowFever: false,
    otherImmunization: '',
  },
  gynecological: {
    developmentAge: '',
    menstruation: '',
    menstrualCycle: '',
    flow: '',
    birthControlMethod: '',
    pregnancies: '',
    labors: '',
    cesareans: '',
    births: '',
    abortions: '',
    menopauseAge: '',
  },
  lifestyle: {
    sport: '',
    sportFrequency: '',
    workingHours: '',
    jobSatisfaction: '',
    jobStability: '',
    rest: '',
    freeTime: '',
    workSharing: '',
    leisure: '',
    pets: '',
    plants: '',
    technology: '',
    creed: '',
    consumption: '',
    friendships: '',
    partner: '',
    family: '',
    spirituality: '',
  },
  clinicalBackground: {
    otherDisease: '',
    surgeries: '',
    injuries: '',
    therapies: '',
    allergies: '',
    currentIllness: '',
    otherAlteration: '',
    breathing: '',
    appetite: '',
    aversions: '',
    intolerances: '',
    drinks: '',
    addictions: '',
    evacuation: '',
    vitality: '',
    sleep: '',
    skinManifestation: '',
    sweatingTemperature: '',
    urination: '',
    sexuality: '',
    psychiatricCondition: '',
    physicalCondition: '',
    bloodGroup: '',
    biotype: '',
  },
  alterations: createInitialAlterations(),
  diseases: createInitialDiseases(),
});

const mapAttachmentToMedicalFile = (attachment: NonNullable<RemotePatientMedicalHistory['attachments']>[number]): MedicalFile => {
  const createdAt = attachment?.createdAt ? new Date(attachment.createdAt) : new Date();
  const relativePath = sanitizeAttachmentPath(attachment?.file);
  const name = relativePath ? relativePath.split('/').pop() ?? relativePath : `Archivo_${attachment?.id ?? 'sin_id'}`;

  return {
    id: (attachment?.id ?? `attachment-${createdAt.getTime()}`).toString(),
    name,
    type: guessMimeTypeFromName(name),
    size: 0,
    uploadedAt: createdAt,
    category: 'other',
    attachmentId: typeof attachment?.id === 'number' ? attachment.id : null,
    downloadPath: relativePath,
  };
};

const toDateInputValue = (value?: string | null): string => {
  if (!value) return '';
  const [date] = value.split('T');
  return date ?? '';
};

const toTimeInputValue = (value?: string | null): string => {
  if (!value) return '';
  const parts = value.split(':');
  if (parts.length < 2) {
    return value;
  }
  const [hours, minutes] = parts;
  return `${hours}:${minutes}`;
};

const ocularDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const formatOcularDate = (value?: string | null): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return ocularDateFormatter.format(date);
};

const sanitizeOcularString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value).trim();
};

const encodePathSegments = (input: string): string =>
  input
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const computeOcularImageUrl = (value: string, baseUrl: string): string | null => {
  const sanitizedValue = value.replace(/\\/g, '/').trim();
  if (!sanitizedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(sanitizedValue)) {
    return sanitizedValue;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalized = sanitizedValue.replace(/^\/+/, '');
  const normalizedLower = normalized.toLowerCase();
  const looksLikeFileName = /\.[a-z0-9]{2,6}$/i.test(normalized);

  if (
    !looksLikeFileName &&
    !normalizedLower.startsWith('assets/') &&
    !normalizedLower.includes('foto_ocular')
  ) {
    return null;
  }

  const buildFromRelative = (relativePath: string): string => {
    const encodedRelative = encodePathSegments(relativePath);
    return normalizedBase ? `${normalizedBase}/${encodedRelative}` : `/${encodedRelative}`;
  };

  if (normalizedLower.startsWith('assets/')) {
    return buildFromRelative(normalized);
  }

  if (normalizedLower.startsWith('images/foto_ocular/')) {
    return buildFromRelative(`assets/${normalized}`);
  }

  if (normalizedLower.startsWith('foto_ocular/')) {
    return buildFromRelative(`assets/images/${normalized}`);
  }

  return buildFromRelative(`assets/images/foto_ocular/${normalized}`);
};

export const normalizeOcularExamRecords = (
  records: unknown[],
  assetsBase: string,
): OcularExamRow[] => {
  const normalized: NormalizedOcularExamRow[] = [];

  records.forEach((record, index) => {
    if (!record || typeof record !== 'object') {
      return;
    }

    const rawRecord = record as OcularExamRecordInput;
    const rawDate = typeof rawRecord.date === 'string' ? rawRecord.date : null;
    const timestamp = rawDate ? new Date(rawDate).getTime() : Number.NaN;
    const sortKey = Number.isFinite(timestamp)
      ? timestamp
      : Number.NEGATIVE_INFINITY;

    const rightEyeData =
      rawRecord.rightEye && typeof rawRecord.rightEye === 'object'
        ? (rawRecord.rightEye as Record<string, unknown>)
        : {};
    const leftEyeData =
      rawRecord.leftEye && typeof rawRecord.leftEye === 'object'
        ? (rawRecord.leftEye as Record<string, unknown>)
        : {};

    const reason = sanitizeOcularString(rawRecord.reason);
    const comment = sanitizeOcularString(rawRecord.comment);
    const rightObservation = sanitizeOcularString(rightEyeData['observation']);
    const rightEye = sanitizeOcularString(rightEyeData['eye']);
    const leftObservation = sanitizeOcularString(leftEyeData['observation']);
    const leftEye = sanitizeOcularString(leftEyeData['eye']);

    const rightEyeImageUrl = computeOcularImageUrl(rightEye, assetsBase);
    const leftEyeImageUrl = computeOcularImageUrl(leftEye, assetsBase);

    const numericIdCandidate = Number(rawRecord.id);
    const id = Number.isFinite(numericIdCandidate)
      ? numericIdCandidate
      : -(index + 1);

    normalized.push({
      sortKey,
      row: {
        id,
        dateLabel: formatOcularDate(rawDate),
        reason,
        rightObservation,
        rightEye,
        rightEyeImageUrl,
        leftObservation,
        leftEye,
        leftEyeImageUrl,
        rightComment: comment,
        leftComment: comment,
      },
    });
  });

  return normalized
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ row }) => row);
};

export const toDisplayText = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
};

const coerceToString = (value?: string | null): string => value ?? '';
const coerceToBoolean = (value?: boolean | string | null): boolean => Boolean(value);
const displayValue = (value?: string | null): string => {
  if (!value) {
    return '—';
  }
  const trimmed = value.toString().trim();
  return trimmed.length > 0 ? trimmed : '—';
};
const displayBoolean = (value: boolean): string => (value ? 'Sí' : 'No');

const guessMimeTypeFromName = (filename: string): string => {
  const extension = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')).toLowerCase() : '';
  switch (extension) {
    case '.pdf':
      return 'application/pdf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
};

const sanitizeAttachmentPath = (path: string | null | undefined): string | null => {
  if (!path) {
    return null;
  }
  return path.replace(/^\/+/, '').trim() || null;
};

export const familyPathologyLabels: Record<
  keyof MedicalHistoryData['family']['pathologies'],
  string
> = {
  cancer: 'Cáncer',
  tuberculosis: 'Tuberculosis',
  diabetes: 'Diabetes',
  asthma: 'Asma',
  highBloodPressure: 'Tensión alta',
  epilepsy: 'Epilepsia',
  mentalIllness: 'Enfermedad mental',
  suicide: 'Suicidio',
  bloodDisease: 'Enfermedad sangre',
  vascularDisease: 'Enfermedad vasos',
  arthritis: 'Artritis',
  syphilis: 'Sífilis',
  others: 'Otras',
};

export const immunizationOptions: Array<{
  key: Exclude<keyof MedicalHistoryData['immunizations'], 'otherImmunization'>;
  label: string;
}> = [
  { key: 'bcg', label: 'BCG' },
  { key: 'polio', label: 'Polio' },
  { key: 'measles', label: 'Sarampión' },
  { key: 'typhoid', label: 'Fiebre tifoidea' },
  { key: 'triple', label: 'Triple' },
  { key: 'tetanus', label: 'Tétanos' },
  { key: 'cholera', label: 'Cólera' },
  { key: 'yellowFever', label: 'Fiebre amarilla' },
];

export const diseaseOptions: Array<{
  key: DiseaseKey;
  label: string;
}> = [
  { key: 'sarampion', label: 'Sarampión' },
  { key: 'lechina', label: 'Lechina' },
  { key: 'escarlatina', label: 'Escarlatina' },
  { key: 'difteria', label: 'Difteria' },
  { key: 'tosferina', label: 'Tosferina' },
  { key: 'paperas', label: 'Paperas' },
  { key: 'polio', label: 'Polio' },
  { key: 'tetano', label: 'Tétano' },
  { key: 'disenteria', label: 'Disentería' },
  { key: 'parasitos', label: 'Parásitos' },
  { key: 'meningitis', label: 'Meningitis' },
  { key: 'asma', label: 'Asma' },
  { key: 'acne', label: 'Acné' },
  { key: 'forunculosis', label: 'Forunculosis' },
  { key: 'eczema', label: 'Eczema' },
  { key: 'psoriasis', label: 'Psoriasis' },
  { key: 'alergia', label: 'Alergia' },
  { key: 'sinusitis', label: 'Sinusitis' },
  { key: 'anginas', label: 'Anginas' },
  { key: 'bronquitis', label: 'Bronquitis' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'enfermedadTiroidea', label: 'Enfermedad tiroidea' },
  { key: 'enfermedadCardiaca', label: 'Enfermedad cardiaca' },
  { key: 'enfermedadNeurologica', label: 'Enfermedad neurológica' },
  { key: 'enfermedadMental', label: 'Enfermedad mental' },
  { key: 'epilepsia', label: 'Epilepsia' },
  { key: 'litiasisRenal', label: 'Litiasis renal' },
  { key: 'litiasisVesicular', label: 'Litiasis vesicular' },
  { key: 'hepatitis', label: 'Hepatitis' },
  { key: 'nefritis', label: 'Nefritis' },
  { key: 'gastritis', label: 'Gastritis' },
  { key: 'ulcera', label: 'Úlcera' },
  { key: 'lepra', label: 'Lepra' },
  { key: 'tbc', label: 'TBC' },
  { key: 'sifilis', label: 'Sífilis' },
  { key: 'blenorragia', label: 'Blenorragia' },
  { key: 'otraVenerea', label: 'Otra venérea' },
  { key: 'fiebreReumatica', label: 'Fiebre reumática' },
  { key: 'artritis', label: 'Artritis' },
  { key: 'enfermedadMuscular', label: 'Enfermedad muscular' },
  { key: 'gota', label: 'Gota' },
  { key: 'cancer', label: 'Cáncer' },
];

export const alterationOptions: Array<{
  key: AlterationKey;
  label: string;
}> = [
  { key: 'perdidaDePeso', label: 'Pérdida de peso' },
  { key: 'gananciaDePeso', label: 'Ganancia de peso' },
  { key: 'confusion', label: 'Confusión' },
  { key: 'nerviosismo', label: 'Nerviosismo' },
  { key: 'descontrolEmotivo', label: 'Descontrol emotivo' },
  { key: 'tensionMuscular', label: 'Tensión muscular' },
  { key: 'calambreMuscular', label: 'Calambre muscular' },
  { key: 'cambioColorPiel', label: 'Cambio de color en piel' },
  { key: 'picazon', label: 'Picazón' },
  { key: 'erupcionesCutaneas', label: 'Erupciones cutáneas' },
  { key: 'furunculos', label: 'Furúnculos' },
  { key: 'fiebres', label: 'Fiebres' },
  { key: 'pesadillas', label: 'Pesadillas' },
  { key: 'vertigoMareos', label: 'Vértigo o mareos' },
  { key: 'desmayos', label: 'Desmayos' },
  { key: 'ruidosOidos', label: 'Ruidos en los oídos' },
  { key: 'doloresOidos', label: 'Dolores en los oídos' },
  { key: 'secrecionesOidos', label: 'Secreciones en los oídos' },
  { key: 'visionBorrosaDoble', label: 'Visión borrosa o doble' },
  { key: 'secrecionesArdorOjos', label: 'Secreciones o ardor en los ojos' },
  { key: 'congestionNasal', label: 'Congestión nasal' },
  { key: 'hemorragiaNasal', label: 'Hemorragia nasal' },
  { key: 'llagasBoca', label: 'Llagas en la boca' },
  { key: 'malAliento', label: 'Mal aliento' },
  { key: 'problemasDientesEncias', label: 'Problemas en dientes y encías' },
  { key: 'gargantaDolorida', label: 'Garganta dolorida' },
  { key: 'tos', label: 'Tos' },
  { key: 'esputoConSangre', label: 'Esputo con sangre' },
  { key: 'dificultadesRespiratorias', label: 'Dificultades respiratorias' },
  { key: 'palpitaciones', label: 'Palpitaciones' },
  { key: 'doloresCuello', label: 'Dolores de cuello' },
  { key: 'doloresPecho', label: 'Dolores en el pecho' },
  { key: 'bultosDoloresSenos', label: 'Bultos o dolores en los senos' },
  { key: 'dolorAbdominal', label: 'Dolor abdominal' },
  { key: 'dificultadDigestiva', label: 'Dificultad digestiva' },
  { key: 'estrenimiento', label: 'Estreñimiento' },
  { key: 'diarrea', label: 'Diarrea' },
  { key: 'hecesNegrasSangre', label: 'Heces negras con sangre' },
  { key: 'colicos', label: 'Cólicos' },
  { key: 'acidez', label: 'Acidez' },
  { key: 'hemorroides', label: 'Hemorroides' },
  { key: 'orinaQuemante', label: 'Orina quemante' },
  { key: 'despiertaOrinar', label: 'Se despierta para orinar' },
  { key: 'sangreOrina', label: 'Sangre en la orina' },
  { key: 'doloresEspalda', label: 'Dolores de espalda' },
  { key: 'piernasHinchadas', label: 'Piernas hinchadas' },
  { key: 'doloresHuesos', label: 'Dolores en los huesos' },
  { key: 'doloresArticulaciones', label: 'Dolores en las articulaciones' },
  { key: 'problemasBrazos', label: 'Problemas en brazos' },
  { key: 'problemasHombros', label: 'Problemas en hombros' },
  { key: 'problemasPiernas', label: 'Problemas en piernas' },
  { key: 'paralisis', label: 'Parálisis' },
  { key: 'trastornosSensibilidad', label: 'Trastornos de la sensibilidad' },
  { key: 'dolorRectalRafagas', label: 'Dolor rectal ráfagas punzantes' },
  { key: 'miomasQuistesOvarios', label: 'Miomas y quistes en ovarios' },
];

export const gynecologicalFields: Array<{
  key: keyof MedicalHistoryData['gynecological'];
  label: string;
}> = [
  { key: 'developmentAge', label: 'Edad desarrollo' },
  { key: 'menstruation', label: 'Menstruación' },
  { key: 'menstrualCycle', label: 'Ciclo menstrual' },
  { key: 'flow', label: 'Flujo' },
  { key: 'birthControlMethod', label: 'Método anticonceptivo' },
  { key: 'pregnancies', label: 'Embarazos' },
  { key: 'labors', label: 'Partos' },
  { key: 'cesareans', label: 'Cesáreas' },
  { key: 'births', label: 'Nacidos vivos' },
  { key: 'abortions', label: 'Abortos' },
  { key: 'menopauseAge', label: 'Edad menopausia' },
];

export const lifestyleFields: Array<{
  key: keyof MedicalHistoryData['lifestyle'];
  label: string;
}> = [
  { key: 'sport', label: 'Deporte que practica' },
  { key: 'sportFrequency', label: 'Frecuencia deportiva' },
  { key: 'workingHours', label: 'Horas de trabajo diarias' },
  { key: 'jobSatisfaction', label: '¿Lo satisface su trabajo?' },
  { key: 'jobStability', label: '¿La remuneración le da estabilidad?' },
  { key: 'rest', label: '¿Descansa lo necesario?' },
  { key: 'freeTime', label: '¿Como emplea su tiempo libre?' },
  { key: 'workSharing', label: '¿Con quién lo comparte su tiempo libre?' },
  { key: 'leisure', label: 'Hobbies' },
  { key: 'pets', label: 'Mascotas' },
  { key: 'plants', label: 'Plantas' },
  { key: 'technology', label: 'Tecnología' },
  { key: 'creed', label: 'Creencias' },
  { key: 'consumption', label: 'Consumos' },
  { key: 'friendships', label: 'Amistades' },
  { key: 'partner', label: 'Pareja' },
  { key: 'family', label: 'Familia' },
  { key: 'spirituality', label: 'Espiritualidad' },
];

export const clinicalBackgroundFields: Array<{
  key: keyof MedicalHistoryData['clinicalBackground'];
  label: string;
  type?: 'textarea';
}> = [
  { key: 'otherDisease', label: 'Otras enfermedades', type: 'textarea' },
  { key: 'surgeries', label: 'Cirugías', type: 'textarea' },
  { key: 'injuries', label: 'Lesiones', type: 'textarea' },
  { key: 'therapies', label: 'Terapias', type: 'textarea' },
  { key: 'allergies', label: 'Alergias', type: 'textarea' },
  { key: 'currentIllness', label: 'Enfermedad actual', type: 'textarea' },
  { key: 'otherAlteration', label: 'Otras alteraciones', type: 'textarea' },
  { key: 'breathing', label: 'Respiración' },
  { key: 'appetite', label: 'Apetito' },
  { key: 'aversions', label: 'Aversión' },
  { key: 'intolerances', label: 'Intolerancias' },
  { key: 'drinks', label: 'Bebidas' },
  { key: 'addictions', label: 'Adicciones' },
  { key: 'evacuation', label: 'Evacuaciones' },
  { key: 'vitality', label: 'Vitalidad' },
  { key: 'sleep', label: 'Sueño' },
  { key: 'skinManifestation', label: 'Manifestaciones en piel' },
  { key: 'sweatingTemperature', label: 'Sudoración/Temperatura' },
  { key: 'urination', label: 'Orina' },
  { key: 'sexuality', label: 'Sexualidad' },
  { key: 'psychiatricCondition', label: 'Condición psiquiátrica', type: 'textarea' },
  { key: 'physicalCondition', label: 'Condición física', type: 'textarea' },
  { key: 'bloodGroup', label: 'Grupo sanguíneo' },
  { key: 'biotype', label: 'Biotipo' },
];

const mapRemoteDiseasesToState = (
  diseases?: RemotePatientMedicalHistory['diseases'],
): Record<DiseaseKey, string> => {
  const mapped = createInitialDiseases();
  if (!Array.isArray(diseases)) {
    return mapped;
  }

  diseases.forEach((entry) => {
    const label = coerceToString(entry?.disease).trim();
    if (!label) {
      return;
    }

    const normalized = normalizeLabelKey(label);
    const key = DISEASE_NAME_TO_KEY[normalized];
    if (!key) {
      return;
    }

    const detail = coerceToString(entry?.status ?? entry?.onset);
    mapped[key] = detail;
  });

  return mapped;
};

export const mapRemoteMedicalHistoryToState = (
  remoteHistory?: RemotePatientMedicalHistory | null,
): MedicalHistoryData => {
  const history = createInitialMedicalHistory();

  if (!remoteHistory) {
    return history;
  }

  if (remoteHistory.personal) {
    history.personal = {
      birthPlace: coerceToString(remoteHistory.personal.birthPlace),
      birthTime: toTimeInputValue(remoteHistory.personal.birthTime),
      birthDate: toDateInputValue(remoteHistory.personal.birthDate),
      maritalStatus: coerceToString(remoteHistory.personal.maritalStatus),
      profession: coerceToString(remoteHistory.personal.profession),
      occupation: coerceToString(remoteHistory.personal.occupation),
    };
  }

  if (remoteHistory.contacts) {
    history.contacts = {
      phone: coerceToString(remoteHistory.contacts.phone),
      address: coerceToString(remoteHistory.contacts.address),
      companyAddress: coerceToString(remoteHistory.contacts.companyAddress),
      closeFamily: coerceToString(remoteHistory.contacts.closeFamily),
      relationship: coerceToString(remoteHistory.contacts.relationship),
      familyPhone: coerceToString(remoteHistory.contacts.familyPhone),
      emergencyContact: coerceToString(remoteHistory.contacts.emergencyContact),
      emergencyEmail: coerceToString(remoteHistory.contacts.emergencyEmail),
      emergencyPhone: coerceToString(remoteHistory.contacts.emergencyPhone),
    };
  }

  if (remoteHistory.treatingDoctor) {
    history.treatingDoctor = {
      treatingDoctor: coerceToString(remoteHistory.treatingDoctor.treatingDoctor),
      specialty: coerceToString(remoteHistory.treatingDoctor.specialty),
      currentMedication: coerceToString(remoteHistory.treatingDoctor.currentMedication),
    };
  }

  if (remoteHistory.family) {
    if (remoteHistory.family.pathologies) {
      history.family.pathologies = {
        cancer: coerceToString(remoteHistory.family.pathologies.cancer),
        tuberculosis: coerceToString(remoteHistory.family.pathologies.tuberculosis),
        diabetes: coerceToString(remoteHistory.family.pathologies.diabetes),
        asthma: coerceToString(remoteHistory.family.pathologies.asthma),
        highBloodPressure: coerceToString(remoteHistory.family.pathologies.highBloodPressure),
        epilepsy: coerceToString(remoteHistory.family.pathologies.epilepsy),
        mentalIllness: coerceToString(remoteHistory.family.pathologies.mentalIllness),
        suicide: coerceToString(remoteHistory.family.pathologies.suicide),
        bloodDisease: coerceToString(remoteHistory.family.pathologies.bloodDisease),
        vascularDisease: coerceToString(remoteHistory.family.pathologies.vascularDisease),
        arthritis: coerceToString(remoteHistory.family.pathologies.arthritis),
        syphilis: coerceToString(remoteHistory.family.pathologies.syphilis),
        others: coerceToString(remoteHistory.family.pathologies.others),
      };
    }

    if (remoteHistory.family.context) {
      history.family.context = {
        fatherAge: coerceToString(remoteHistory.family.context.fatherAge),
        motherAge: coerceToString(remoteHistory.family.context.motherAge),
        fatherStatus: coerceToString(remoteHistory.family.context.fatherStatus),
        motherStatus: coerceToString(remoteHistory.family.context.motherStatus),
        siblingsCount: coerceToString(remoteHistory.family.context.siblingsCount),
        siblingPosition: coerceToString(remoteHistory.family.context.siblingPosition),
        childrenCount: coerceToString(remoteHistory.family.context.childrenCount),
        livesWith: coerceToString(remoteHistory.family.context.livesWith),
      };
    }
  }

  if (remoteHistory.immunizations) {
    history.immunizations = {
      bcg: coerceToBoolean(remoteHistory.immunizations.bcg),
      polio: coerceToBoolean(remoteHistory.immunizations.polio),
      measles: coerceToBoolean(remoteHistory.immunizations.measles),
      typhoid: coerceToBoolean(remoteHistory.immunizations.typhoid),
      triple: coerceToBoolean(remoteHistory.immunizations.triple),
      tetanus: coerceToBoolean(remoteHistory.immunizations.tetanus),
      cholera: coerceToBoolean(remoteHistory.immunizations.cholera),
      yellowFever: coerceToBoolean(remoteHistory.immunizations.yellowFever),
      otherImmunization:
        typeof remoteHistory.immunizations.otherImmunization === 'string'
          ? remoteHistory.immunizations.otherImmunization
          : '',
    };
  }

  if (remoteHistory.gynecological) {
    history.gynecological = {
      developmentAge: coerceToString(remoteHistory.gynecological.developmentAge),
      menstruation: coerceToString(remoteHistory.gynecological.menstruation),
      menstrualCycle: coerceToString(remoteHistory.gynecological.menstrualCycle),
      flow: coerceToString(remoteHistory.gynecological.flow),
      birthControlMethod: coerceToString(remoteHistory.gynecological.birthControlMethod),
      pregnancies: coerceToString(remoteHistory.gynecological.pregnancies),
      labors: coerceToString(remoteHistory.gynecological.labors),
      cesareans: coerceToString(remoteHistory.gynecological.cesareans),
      births: coerceToString(remoteHistory.gynecological.births),
      abortions: coerceToString(remoteHistory.gynecological.abortions),
      menopauseAge: coerceToString(remoteHistory.gynecological.menopauseAge),
    };
  }

  if (remoteHistory.lifestyle) {
    history.lifestyle = {
      sport: coerceToString(remoteHistory.lifestyle.sport),
      sportFrequency: coerceToString(remoteHistory.lifestyle.sportFrequency),
      workingHours: coerceToString(remoteHistory.lifestyle.workingHours),
      jobSatisfaction: coerceToString(remoteHistory.lifestyle.jobSatisfaction),
      jobStability: coerceToString(remoteHistory.lifestyle.jobStability),
      rest: coerceToString(remoteHistory.lifestyle.rest),
      freeTime: coerceToString(remoteHistory.lifestyle.freeTime),
      workSharing: coerceToString(remoteHistory.lifestyle.workSharing),
      leisure: coerceToString(remoteHistory.lifestyle.leisure),
      pets: coerceToString(remoteHistory.lifestyle.pets),
      plants: coerceToString(remoteHistory.lifestyle.plants),
      technology: coerceToString(remoteHistory.lifestyle.technology),
      creed: coerceToString(remoteHistory.lifestyle.creed),
      consumption: coerceToString(remoteHistory.lifestyle.consumption),
      friendships: coerceToString(remoteHistory.lifestyle.friendships),
      partner: coerceToString(remoteHistory.lifestyle.partner),
      family: coerceToString(remoteHistory.lifestyle.family),
      spirituality: coerceToString(remoteHistory.lifestyle.spirituality),
    };
  }

  if (remoteHistory.clinicalBackground) {
    history.clinicalBackground = {
      otherDisease: coerceToString(remoteHistory.clinicalBackground.otherDisease),
      surgeries: coerceToString(remoteHistory.clinicalBackground.surgeries),
      injuries: coerceToString(remoteHistory.clinicalBackground.injuries),
      therapies: coerceToString(remoteHistory.clinicalBackground.therapies),
      allergies: coerceToString(remoteHistory.clinicalBackground.allergies),
      currentIllness: coerceToString(remoteHistory.clinicalBackground.currentIllness),
      otherAlteration: coerceToString(remoteHistory.clinicalBackground.otherAlteration),
      breathing: coerceToString(remoteHistory.clinicalBackground.breathing),
      appetite: coerceToString(remoteHistory.clinicalBackground.appetite),
      aversions: coerceToString(remoteHistory.clinicalBackground.aversions),
      intolerances: coerceToString(remoteHistory.clinicalBackground.intolerances),
      drinks: coerceToString(remoteHistory.clinicalBackground.drinks),
      addictions: coerceToString(remoteHistory.clinicalBackground.addictions),
      evacuation: coerceToString(remoteHistory.clinicalBackground.evacuation),
      vitality: coerceToString(remoteHistory.clinicalBackground.vitality),
      sleep: coerceToString(remoteHistory.clinicalBackground.sleep),
      skinManifestation: coerceToString(remoteHistory.clinicalBackground.skinManifestation),
      sweatingTemperature: coerceToString(remoteHistory.clinicalBackground.sweatingTemperature),
      urination: coerceToString(remoteHistory.clinicalBackground.urination),
      sexuality: coerceToString(remoteHistory.clinicalBackground.sexuality),
      psychiatricCondition: coerceToString(remoteHistory.clinicalBackground.psychiatricCondition),
      physicalCondition: coerceToString(remoteHistory.clinicalBackground.physicalCondition),
      bloodGroup: coerceToString(remoteHistory.clinicalBackground.bloodGroup),
      biotype: coerceToString(remoteHistory.clinicalBackground.biotype),
    };
  }

  history.diseases = mapRemoteDiseasesToState(remoteHistory.diseases);

  return history;
};

export const mapRemoteAttachmentsToFiles = (
  attachments?: RemotePatientMedicalHistory['attachments'],
): MedicalFile[] => {
  if (!Array.isArray(attachments)) {
    return [];
  }
  return attachments
    .filter((attachment): attachment is NonNullable<typeof attachment> => Boolean(attachment))
    .filter(attachment => Boolean(attachment.file))
    .map(mapAttachmentToMedicalFile);
};

type NullableStringSection<T extends Record<string, string>> = {
  [K in keyof T]: string | null;
};

interface UpdateHistoryPayload {
  personal: NullableStringSection<MedicalHistoryData['personal']>;
  contacts: NullableStringSection<MedicalHistoryData['contacts']>;
  treatingDoctor: NullableStringSection<MedicalHistoryData['treatingDoctor']>;
  family: {
    pathologies: NullableStringSection<MedicalHistoryData['family']['pathologies']>;
    context: NullableStringSection<MedicalHistoryData['family']['context']>;
  };
  immunizations: {
    bcg: boolean;
    polio: boolean;
    measles: boolean;
    typhoid: boolean;
    triple: boolean;
    tetanus: boolean;
    cholera: boolean;
    yellowFever: boolean;
    otherImmunization: string | null;
  };
  gynecological: NullableStringSection<MedicalHistoryData['gynecological']>;
  lifestyle: NullableStringSection<MedicalHistoryData['lifestyle']>;
  clinicalBackground: NullableStringSection<MedicalHistoryData['clinicalBackground']>;
  diseases: Record<DiseaseKey, string | null>;
  alterations: Record<AlterationKey, boolean>;
}

const toNullableString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mapStringSection = <T extends Record<string, string>>(section: T): NullableStringSection<T> => {
  return Object.keys(section).reduce((acc, key) => {
    const typedKey = key as keyof T;
    acc[typedKey] = toNullableString(section[typedKey]);
    return acc;
  }, {} as NullableStringSection<T>);
};

export const buildUpdatePayload = (data: MedicalHistoryData): UpdateHistoryPayload => {
  const diseases = Object.keys(data.diseases).reduce((acc, key) => {
    const diseaseKey = key as DiseaseKey;
    acc[diseaseKey] = toNullableString(data.diseases[diseaseKey]);
    return acc;
  }, {} as Record<DiseaseKey, string | null>);

  return {
    personal: mapStringSection(data.personal),
    contacts: mapStringSection(data.contacts),
    treatingDoctor: mapStringSection(data.treatingDoctor),
    family: {
      pathologies: mapStringSection(data.family.pathologies),
      context: mapStringSection(data.family.context),
    },
    immunizations: {
      bcg: data.immunizations.bcg,
      polio: data.immunizations.polio,
      measles: data.immunizations.measles,
      typhoid: data.immunizations.typhoid,
      triple: data.immunizations.triple,
      tetanus: data.immunizations.tetanus,
      cholera: data.immunizations.cholera,
      yellowFever: data.immunizations.yellowFever,
      otherImmunization: toNullableString(data.immunizations.otherImmunization),
    },
    gynecological: mapStringSection(data.gynecological),
    lifestyle: mapStringSection(data.lifestyle),
    clinicalBackground: mapStringSection(data.clinicalBackground),
    diseases,
    alterations: { ...data.alterations },
  };
};

interface MedicalHistoryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MedicalHistoryData;
  isLoading?: boolean;
  errorMessage?: string | null;
  title?: string;
}

export const MedicalHistoryViewModal: React.FC<MedicalHistoryViewModalProps> = ({
  isOpen,
  onClose,
  data,
  isLoading = false,
  errorMessage = null,
  title = 'Historia médica',
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportPdf = async () => {
    const contentElement = contentRef.current;
    if (!contentElement) {
      return;
    }

    setExportError(null);
    setIsExporting(true);

    const previousStyles = {
      maxHeight: contentElement.style.maxHeight,
      height: contentElement.style.height,
      overflow: contentElement.style.overflow,
      overflowY: contentElement.style.overflowY,
    };

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      contentElement.style.maxHeight = 'none';
      contentElement.style.height = 'auto';
      contentElement.style.overflow = 'visible';
      contentElement.style.overflowY = 'visible';

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(contentElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usablePageHeight = pageHeight - margin * 2;

      let heightLeft = pdfHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, pdfHeight);
      heightLeft -= usablePageHeight;

      while (heightLeft > 0) {
        position = margin - (pdfHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, pdfHeight);
        heightLeft -= usablePageHeight;
      }

      const safeTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const filename = safeTitle ? `${safeTitle}.pdf` : 'historia-medica.pdf';

      pdf.save(filename);
    } catch (error) {
      console.error('Failed to export medical history PDF', error);
      setExportError('No se pudo exportar la historia médica. Intenta nuevamente.');
    } finally {
      if (contentElement) {
        contentElement.style.maxHeight = previousStyles.maxHeight;
        contentElement.style.height = previousStyles.height;
        contentElement.style.overflow = previousStyles.overflow;
        contentElement.style.overflowY = previousStyles.overflowY;
      }

      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <div className="medical-history-view space-y-5">
        {exportError && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {exportError}
          </div>
        )}

        <div
          ref={contentRef}
          className="space-y-6 max-h-[70vh] overflow-y-auto pr-2"
        >
          {isLoading && (
            <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Cargando historia médica...
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {!isLoading && !errorMessage && (
            <>
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Identificación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Lugar de nacimiento', value: data.personal.birthPlace },
                { label: 'Hora de nacimiento', value: data.personal.birthTime },
                { label: 'Fecha de nacimiento', value: data.personal.birthDate },
                { label: 'Estado civil', value: data.personal.maritalStatus },
                { label: 'Profesión', value: data.personal.profession },
                { label: 'Ocupación', value: data.personal.occupation },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-900">{displayValue(value)}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contacto y Emergencias</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Teléfono', value: data.contacts.phone },
                { label: 'Familiar cercano', value: data.contacts.closeFamily },
                { label: 'Parentesco', value: data.contacts.relationship },
                { label: 'Teléfono del familiar', value: data.contacts.familyPhone },
                { label: 'Contacto de emergencia', value: data.contacts.emergencyContact },
                { label: 'Correo de emergencia', value: data.contacts.emergencyEmail },
                { label: 'Teléfono de emergencia', value: data.contacts.emergencyPhone },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-900">{displayValue(value)}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dirección</p>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{displayValue(data.contacts.address)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Empresa y dirección laboral</p>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{displayValue(data.contacts.companyAddress)}</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Médico Tratante</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Médico tratante', value: data.treatingDoctor.treatingDoctor },
                { label: 'Especialidad', value: data.treatingDoctor.specialty },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-900">{displayValue(value)}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Medicación que recibe</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{displayValue(data.treatingDoctor.currentMedication)}</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Antecedentes Familiares</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(familyPathologyLabels) as Array<keyof MedicalHistoryData['family']['pathologies']>).map((key) => (
                <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{familyPathologyLabels[key]}</p>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{displayValue(data.family.pathologies[key])}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                { label: 'Edad del padre', value: data.family.context.fatherAge },
                { label: 'Estado del padre', value: data.family.context.fatherStatus },
                { label: 'Edad de la madre', value: data.family.context.motherAge },
                { label: 'Estado de la madre', value: data.family.context.motherStatus },
                { label: 'Número de hermanos', value: data.family.context.siblingsCount },
                { label: 'Posición entre hermanos', value: data.family.context.siblingPosition },
                { label: 'Número de hijos', value: data.family.context.childrenCount },
                { label: '¿Con quién vive?', value: data.family.context.livesWith },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-900">{displayValue(value)}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Esquema de Vacunación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {immunizationOptions.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className="text-sm font-medium text-gray-900">{displayBoolean(data.immunizations[key])}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Otras vacunas</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{displayValue(data.immunizations.otherImmunization)}</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Historia Ginecológica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gynecologicalFields.map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-900">{displayValue(data.gynecological[key])}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estilo de Vida</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lifestyleFields.map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-900">{displayValue(data.lifestyle[key])}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Antecedentes Clínicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinicalBackgroundFields.map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{displayValue(data.clinicalBackground[key])}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Alteraciones</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alterationOptions.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className="text-sm font-medium text-gray-900">{displayBoolean(data.alterations[key])}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enfermedades</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diseaseOptions.map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{displayValue(data.diseases[key])}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting || Boolean(isLoading) || Boolean(errorMessage)}
          >
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const MedicalHistory: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';
  const assetsBase = useMemo(() => {
    const rawEnv = (import.meta as any).env?.VITE_ASSETS_BASE;
    const normalizedEnv = typeof rawEnv === 'string' ? rawEnv.trim() : '';
    if (normalizedEnv.length > 0) {
      return normalizedEnv.replace(/\/+$/, '');
    }

    return apiBase.replace(/\/+$/, '');
  }, [apiBase]);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isViewHistoryModalOpen, setIsViewHistoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<MedicalFile['category']>('other');
  const [medicalHistoryData, setMedicalHistoryData] = useState<MedicalHistoryData>(createInitialMedicalHistory());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(false);
  const [consultationsError, setConsultationsError] = useState<string | null>(null);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [consultationForm, setConsultationForm] = useState<ConsultationFormState>(
    createInitialConsultationForm(),
  );
  const [isSavingConsultation, setIsSavingConsultation] = useState(false);
  const [consultationModalError, setConsultationModalError] =
    useState<string | null>(null);
  const [consultationSuccess, setConsultationSuccess] = useState<string | null>(null);
  const [consultationsRefreshKey, setConsultationsRefreshKey] = useState(0);
  const [dentalPresence, setDentalPresence] = useState<DentalPresenceState>(
    createInitialDentalPresence(),
  );
  const [dentalFindings, setDentalFindings] = useState<DentalFindingsState>(
    createInitialDentalFindings(),
  );
  const [dentalPresenceRecordId, setDentalPresenceRecordId] =
    useState<number | null>(null);
  const [dentalExamRecordId, setDentalExamRecordId] =
    useState<number | null>(null);
  const [isDentalModalOpen, setIsDentalModalOpen] = useState(false);
  const [selectedTooth, setSelectedTooth] =
    useState<DentalField | null>(null);
  const [pendingPresence, setPendingPresence] =
    useState<DentalPresenceSelection>('unknown');
  const [pendingFinding, setPendingFinding] = useState('');
  const [isSavingTooth, setIsSavingTooth] = useState(false);
  const [dentalLoadError, setDentalLoadError] = useState<string | null>(null);
  const [dentalModalError, setDentalModalError] = useState<string | null>(null);
  const [isLoadingDental, setIsLoadingDental] = useState(false);
  const [ocularExams, setOcularExams] = useState<OcularExamRow[]>([]);
  const [isLoadingOcular, setIsLoadingOcular] = useState(false);
  const [ocularLoadError, setOcularLoadError] = useState<string | null>(null);
  const [ocularRefreshKey, setOcularRefreshKey] = useState(0);
  const [isOcularModalOpen, setIsOcularModalOpen] = useState(false);
  const [ocularForm, setOcularForm] = useState<OcularFormState>(createInitialOcularForm());
  const [isSavingOcularExam, setIsSavingOcularExam] = useState(false);
  const [ocularModalError, setOcularModalError] = useState<string | null>(null);
  const [ocularFormResetKey, setOcularFormResetKey] = useState(0);
  const fetchAttachments = useCallback(
    async (abortSignal?: AbortSignal): Promise<RemotePatientMedicalHistory['attachments']> => {
      if (!user?.id || !token) {
        return [];
      }

      try {
        const res = await fetch(`${apiBase}/patient/user/${user.id}/attachments`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: abortSignal,
        });

        if (res.status === 204 || res.status === 404) {
          return [];
        }

        if (!res.ok) {
          throw new Error(`Failed to fetch medical attachments (${res.status})`);
        }

        let payload: unknown;

        try {
          payload = await res.json();
        } catch (parseError) {
          throw new Error('Failed to parse medical attachments response');
        }

        if (Array.isArray(payload)) {
          return payload as RemotePatientMedicalHistory['attachments'];
        }

        if (
          payload &&
          typeof payload === 'object' &&
          Array.isArray((payload as { attachments?: unknown }).attachments)
        ) {
          return (payload as { attachments: RemotePatientMedicalHistory['attachments'] }).attachments;
        }

        return [];
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return [];
        }

        throw error;
      }
    },
    [apiBase, token, user?.id],
  );

  useEffect(() => {
    if (!user?.id || !token) {
      setPatientId(null);
      return;
    }

    const numericUserId = Number(user.id);
    if (!Number.isFinite(numericUserId)) {
      setPatientId(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const resolvePatientId = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`${apiBase}/patient`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch patients (${res.status})`);
        }

        const payload = await res.json().catch(() => null);
        if (cancelled) {
          return;
        }

        if (Array.isArray(payload)) {
          const match = payload.find((entry: any) => {
            const rawUserId =
              entry?.id_usuario ?? entry?.userId ?? entry?.idUsuario ?? entry?.user_id;
            if (rawUserId === null || typeof rawUserId === 'undefined') {
              return false;
            }
            const numeric = Number(String(rawUserId).trim());
            return Number.isFinite(numeric) && numeric === numericUserId;
          });

          if (match && typeof match.id !== 'undefined' && match.id !== null) {
            const numericPatientId = Number(String(match.id).trim());
            setPatientId(Number.isFinite(numericPatientId) ? numericPatientId : null);
            return;
          }
        }

        setPatientId(null);
      } catch (error: any) {
        if (cancelled || error?.name === 'AbortError') {
          return;
        }
        console.error('Failed to resolve patient identifier', error);
        setPatientId(null);
      }
    };

    resolvePatientId();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBase, token, user?.id]);

  useEffect(() => {
    if (!user?.id || !token) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchMedicalHistory = async () => {
      setIsLoadingHistory(true);
      setHistoryError(null);

      try {
        const res = await fetch(`${apiBase}/patient/user/${user.id}/history`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const attachments = await fetchAttachments(controller.signal);
        const mappedAttachments = mapRemoteAttachmentsToFiles(attachments);

        if (res.status === 404) {
          if (!cancelled) {
            setMedicalHistoryData(createInitialMedicalHistory());
            setFiles(mappedAttachments);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to fetch medical history (${res.status})`);
        }

        const payload = (await res.json()) as RemotePatientMedicalHistory | null;

        if (!cancelled) {
          const mappedHistory = mapRemoteMedicalHistoryToState(payload);
          setMedicalHistoryData(mappedHistory);
          setFiles(mappedAttachments);
        }
      } catch (error: any) {
        if (cancelled) {
          return;
        }

        if (error?.name === 'AbortError') {
          return;
        }

        console.error('Failed to load medical history', error);
        setHistoryError('No se pudo cargar la historia médica. Intenta nuevamente.');
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchMedicalHistory();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBase, fetchAttachments, token, user?.id]);

  useEffect(() => {
    if (!patientId || !token) {
      setConsultations([]);
      setConsultationsError(null);
      setIsLoadingConsultations(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadConsultations = async () => {
      setIsLoadingConsultations(true);
      setConsultationsError(null);

      try {
        const url = new URL(`${apiBase}/consultation`);
        url.searchParams.set('patientId', String(patientId));

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (res.status === 404 || res.status === 204) {
          if (!cancelled) {
            setConsultations([]);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to fetch consultations (${res.status})`);
        }

        const payload = await res.json().catch(() => null);
        if (cancelled) {
          return;
        }

        const records = Array.isArray(payload)
          ? payload
          : payload && typeof payload === 'object'
          ? [payload]
          : [];

        const normalized = normalizeConsultationRecords(records);
        setConsultations(normalized);
      } catch (error: any) {
        if (cancelled || error?.name === 'AbortError') {
          return;
        }

        console.error('Failed to load consultations', error);
        setConsultationsError(
          'No se pudo cargar el historial de consultas. Intenta nuevamente.',
        );
        setConsultations([]);
      } finally {
        if (!cancelled) {
          setIsLoadingConsultations(false);
        }
      }
    };

    void loadConsultations();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBase, consultationsRefreshKey, patientId, token]);

  useEffect(() => {
    if (!patientId || !token) {
      setDentalPresence(createInitialDentalPresence());
      setDentalFindings(createInitialDentalFindings());
      setDentalPresenceRecordId(null);
      setDentalExamRecordId(null);
      setDentalLoadError(null);
      setIsLoadingDental(false);
      setOcularExams([]);
      setOcularLoadError(null);
      setIsLoadingOcular(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadDentalData = async () => {
      setIsLoadingDental(true);
      setDentalLoadError(null);

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        const presenceRes = await fetch(
          `${apiBase}/patients/history/${patientId}/dental-exams/presence`,
          {
            method: 'GET',
            headers,
            signal: controller.signal,
          },
        );

        let presenceRecord: any = null;
        if (presenceRes.status === 404 || presenceRes.status === 204) {
          presenceRecord = null;
        } else if (!presenceRes.ok) {
          throw new Error(`Failed to fetch dental presence (${presenceRes.status})`);
        } else {
          const payload = await presenceRes.json().catch(() => null);
          if (Array.isArray(payload)) {
            presenceRecord = payload[0] ?? null;
          } else {
            presenceRecord = payload;
          }
        }

        const examRes = await fetch(
          `${apiBase}/patients/history/${patientId}/dental-exams`,
          {
            method: 'GET',
            headers,
            signal: controller.signal,
          },
        );

        let examRecord: any = null;
        if (examRes.status === 404 || examRes.status === 204) {
          examRecord = null;
        } else if (!examRes.ok) {
          throw new Error(`Failed to fetch dental findings (${examRes.status})`);
        } else {
          const payload = await examRes.json().catch(() => null);
          if (Array.isArray(payload)) {
            examRecord = payload[0] ?? null;
          } else {
            examRecord = payload;
          }
        }

        if (cancelled) {
          return;
        }

        if (presenceRecord && typeof presenceRecord === 'object') {
          const nextPresence = createInitialDentalPresence();
          if (presenceRecord.presence && typeof presenceRecord.presence === 'object') {
            DENTAL_FIELDS.forEach((field) => {
              const raw = presenceRecord.presence[field];
              if (typeof raw === 'boolean') {
                nextPresence[field] = raw;
              } else if (typeof raw === 'number') {
                nextPresence[field] = raw === 1;
              } else if (raw === null) {
                nextPresence[field] = null;
              } else {
                nextPresence[field] = null;
              }
            });
          }

          setDentalPresenceRecordId(
            typeof presenceRecord.id === 'number' ? presenceRecord.id : null,
          );
          setDentalPresence(nextPresence);
        } else {
          setDentalPresenceRecordId(null);
          setDentalPresence(createInitialDentalPresence());
        }

        if (examRecord && typeof examRecord === 'object') {
          const nextFindings = createInitialDentalFindings();
          if (examRecord.details && typeof examRecord.details === 'object') {
            DENTAL_FIELDS.forEach((field) => {
              const raw = examRecord.details[field];
              if (typeof raw === 'string') {
                nextFindings[field] = raw;
              } else if (raw === null || typeof raw === 'undefined') {
                nextFindings[field] = '';
              } else {
                nextFindings[field] = String(raw ?? '');
              }
            });
          }

          setDentalExamRecordId(
            typeof examRecord.id === 'number' ? examRecord.id : null,
          );
          setDentalFindings(nextFindings);
        } else {
          setDentalExamRecordId(null);
          setDentalFindings(createInitialDentalFindings());
        }
      } catch (error: any) {
        if (cancelled || error?.name === 'AbortError') {
          return;
        }

        console.error('Failed to load dental exam data', error);
        setDentalLoadError('No se pudo cargar el examen dental. Intenta nuevamente.');
        setDentalPresence(createInitialDentalPresence());
        setDentalFindings(createInitialDentalFindings());
        setDentalPresenceRecordId(null);
        setDentalExamRecordId(null);
      } finally {
        if (!cancelled) {
          setIsLoadingDental(false);
        }
      }
    };

    loadDentalData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBase, assetsBase, patientId, token]);

  useEffect(() => {
    if (!patientId || !token) {
      setOcularExams([]);
      setOcularLoadError(null);
      setIsLoadingOcular(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadOcularData = async () => {
      setIsLoadingOcular(true);
      setOcularLoadError(null);

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      try {
        const res = await fetch(
          `${apiBase}/patients/history/${patientId}/ocular-exams`,
          {
            method: 'GET',
            headers,
            signal: controller.signal,
          },
        );

        if (res.status === 404 || res.status === 204) {
          if (!cancelled) {
            setOcularExams([]);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to fetch ocular exams (${res.status})`);
        }

        const payload = await res.json().catch(() => null);
        if (cancelled) {
          return;
        }

        const records = Array.isArray(payload)
          ? payload
          : payload && typeof payload === 'object'
          ? [payload]
          : [];

        const normalized = normalizeOcularExamRecords(records, assetsBase);
        setOcularExams(normalized);
      } catch (error: any) {
        if (cancelled || error?.name === 'AbortError') {
          return;
        }

        console.error('Failed to load ocular exam data', error);
        setOcularLoadError('No se pudo cargar el examen ocular. Intenta nuevamente.');
        setOcularExams([]);
      } finally {
        if (!cancelled) {
          setIsLoadingOcular(false);
        }
      }
    };

    void loadOcularData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBase, assetsBase, ocularRefreshKey, patientId, token]);

  useEffect(() => {
    if (!saveSuccess) {
      return;
    }
    const timer = window.setTimeout(() => setSaveSuccess(null), 5000);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  useEffect(() => {
    if (!consultationSuccess) {
      return;
    }
    const timer = window.setTimeout(() => setConsultationSuccess(null), 5000);
    return () => window.clearTimeout(timer);
  }, [consultationSuccess]);

  const filteredFiles = files.filter(file => 
    selectedCategory === 'all' || file.category === selectedCategory
  );


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingFile(file);
      setIsModalOpen(true);
    }
  };

  const handleDownload = async (file: MedicalFile) => {
    const fallbackToStaticAsset = () => {
      if (!file.downloadPath) {
        alert('El archivo aún no está disponible para descargar.');
        return;
      }
      const sanitizedPath = file.downloadPath.replace(/^\/+/, '');
      const normalizedBase = apiBase.replace(/\/+$/, '');
      const assetUrl = `${normalizedBase}/assets/historia/${sanitizedPath}`;
      window.open(assetUrl, '_blank', 'noopener');
    };

    if (!file.attachmentId) {
      fallbackToStaticAsset();
      return;
    }

    if (!token) {
      alert('Inicia sesión nuevamente para descargar el archivo.');
      return;
    }

    const normalizedBase = apiBase.replace(/\/+$/, '');
    const downloadUrl = `${normalizedBase}/patient/attachments/${file.attachmentId}/download`;

    setDownloadingFileId(file.id);
    let shouldFallback = false;

    try {
      const res = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to download file (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download medical attachment', error);
      shouldFallback = Boolean(file.downloadPath);
      if (!shouldFallback) {
        alert('No se pudo descargar el archivo. Intenta nuevamente.');
      }
    } finally {
      setDownloadingFileId(null);
      if (shouldFallback) {
        fallbackToStaticAsset();
      }
    }
  };

  const handleOpenHistoryModal = () => {
    setSaveError(null);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    if (isSavingHistory) {
      return;
    }
    setIsHistoryModalOpen(false);
    setSaveError(null);
  };

  const handleOpenOcularModal = () => {
    setOcularModalError(null);
    setOcularForm(createInitialOcularForm());
    setOcularFormResetKey((value) => value + 1);
    setIsOcularModalOpen(true);
  };

  const handleCloseOcularModal = () => {
    if (isSavingOcularExam) {
      return;
    }
    setIsOcularModalOpen(false);
    setOcularModalError(null);
  };

  type OcularTextField =
    | 'date'
    | 'reason'
    | 'rightObservation'
    | 'leftObservation'
    | 'comment';

  const handleOcularFieldChange = (field: OcularTextField, value: string) => {
    setOcularForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  type OcularFileField = 'rightEyeFile' | 'leftEyeFile';

  const handleOcularFileChange = (field: OcularFileField, file: File | null) => {
    setOcularForm((prev) => ({
      ...prev,
      [field]: file,
    }));
  };

  const toNullable = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const handleSubmitOcularExam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!patientId || !token) {
      setOcularModalError('No se pudo identificar al paciente autenticado. Intenta nuevamente.');
      return;
    }

    setIsSavingOcularExam(true);
    setOcularModalError(null);

    const normalizedDate = ocularForm.date.trim();
    const formData = new FormData();

    if (normalizedDate) {
      formData.append('fecha', normalizedDate);
    }

    const motivo = toNullable(ocularForm.reason);
    if (motivo) {
      formData.append('motivo', motivo);
    }

    const observacionDerecho = toNullable(ocularForm.rightObservation);
    if (observacionDerecho) {
      formData.append('observacion_derecho', observacionDerecho);
    }

    const observacionIzquierdo = toNullable(ocularForm.leftObservation);
    if (observacionIzquierdo) {
      formData.append('observacion_izquierdo', observacionIzquierdo);
    }

    const comentario = toNullable(ocularForm.comment);
    if (comentario) {
      formData.append('comentario', comentario);
    }

    if (ocularForm.rightEyeFile) {
      formData.append('rightEyeImage', ocularForm.rightEyeFile);
    }

    if (ocularForm.leftEyeFile) {
      formData.append('leftEyeImage', ocularForm.leftEyeFile);
    }

    try {
      const res = await fetch(
        `${apiBase}/patients/history/${patientId}/ocular-exams`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!res.ok) {
        throw new Error(`Failed to create ocular exam (${res.status})`);
      }

      setIsOcularModalOpen(false);
      setOcularForm(createInitialOcularForm());
      setOcularFormResetKey((value) => value + 1);
      setOcularModalError(null);
      setOcularRefreshKey((value) => value + 1);
    } catch (error) {
      console.error('Failed to create ocular exam', error);
      setOcularModalError('No se pudo registrar el examen ocular. Intenta nuevamente.');
    } finally {
      setIsSavingOcularExam(false);
    }
  };

  const handleUploadSubmit = () => {
    if (uploadingFile) {
      const newFile: MedicalFile = {
        id: Date.now().toString(),
        name: uploadingFile.name,
        type: uploadingFile.type,
        size: uploadingFile.size,
        uploadedAt: new Date(),
        category: uploadCategory,
        attachmentId: null,
        downloadPath: null,
      };
      
      setFiles(prev => [...prev, newFile]);
      setUploadingFile(null);
      setIsModalOpen(false);
    }
  };

  const handleDelete = (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  const handleHistorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user?.id || !token) {
      setSaveError('No se pudo identificar al usuario autenticado. Vuelve a iniciar sesión.');
      return;
    }

    setIsSavingHistory(true);
    setSaveError(null);

    try {
      const payload = buildUpdatePayload(medicalHistoryData);
      const res = await fetch(`${apiBase}/patient/user/${user.id}/history`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to update medical history (${res.status})`);
      }

      const updated = (await res.json()) as RemotePatientMedicalHistory | null;
      const mappedHistory = mapRemoteMedicalHistoryToState(updated);
      let mappedFiles = mapRemoteAttachmentsToFiles(updated?.attachments);

      try {
        const refreshedAttachments = await fetchAttachments();
        const refreshedFiles = mapRemoteAttachmentsToFiles(refreshedAttachments);
        if (refreshedFiles.length > 0 || mappedFiles.length === 0) {
          mappedFiles = refreshedFiles;
        }
      } catch (attachmentError) {
        console.error('Failed to refresh medical attachments after saving history', attachmentError);
      }

      setMedicalHistoryData(mappedHistory);
      setFiles(mappedFiles);
      setSaveError(null);
      setSaveSuccess('Historia médica guardada correctamente.');
      setIsHistoryModalOpen(false);
    } catch (error) {
      console.error('Failed to save medical history', error);
      setSaveError('No se pudo guardar la historia médica. Intenta nuevamente.');
    } finally {
      setIsSavingHistory(false);
    }
  };

  const presenceOptionClass = (value: DentalPresenceSelection): string =>
    `rounded-full border px-4 py-2 text-sm font-medium transition ${
      value === pendingPresence
        ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
    }`;

  const getToothStatusClasses = (value: boolean | null): string => {
    if (value === true) {
      return 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600';
    }
    if (value === false) {
      return 'bg-rose-500 border-rose-500 text-white hover:bg-rose-600 hover:border-rose-600';
    }
    return 'bg-white border-slate-200 text-slate-500 hover:border-slate-400';
  };

  const formatToothTooltip = (field: DentalField): string => {
    const meta = DENTAL_FIELD_META[field];
    const presenceValue = dentalPresence[field];
    const presenceLabel =
      presenceValue === true
        ? 'Presente'
        : presenceValue === false
        ? 'Ausente'
        : 'Sin registro';
    const finding = dentalFindings[field].trim();
    return `${meta.quadrantLabel} ${meta.number} - ${presenceLabel}${finding ? ` - ${finding}` : ''}`;
  };

  const handleToothClick = (field: DentalField) => {
    setSelectedTooth(field);
    setPendingPresence(presenceSelectionFromBoolean(dentalPresence[field]));
    setPendingFinding(dentalFindings[field] ?? '');
    setDentalModalError(null);
    setIsDentalModalOpen(true);
  };

  const handleDentalModalClose = () => {
    if (isSavingTooth) {
      return;
    }

    setIsDentalModalOpen(false);
    setSelectedTooth(null);
    setPendingPresence('unknown');
    setPendingFinding('');
    setDentalModalError(null);
  };

  const handleDentalSave = async () => {
    if (!selectedTooth || !patientId || !token) {
      setDentalModalError('No se pudo identificar la pieza o el paciente.');
      return;
    }

    setIsSavingTooth(true);
    setDentalModalError(null);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const payloadPresenceValue = presenceSelectionToPayload(pendingPresence);
    const sanitizedFinding = pendingFinding.trim();

    let nextPresenceState = { ...dentalPresence };
    let nextFindingsState = { ...dentalFindings };
    let nextPresenceId = dentalPresenceRecordId;
    let nextExamId = dentalExamRecordId;

    try {
      if (payloadPresenceValue !== null || dentalPresenceRecordId !== null) {
        const presencePayload: Record<string, number | null> = {
          [selectedTooth]: payloadPresenceValue,
        };
        const presenceUrl =
          dentalPresenceRecordId !== null
            ? `${apiBase}/patients/history/${patientId}/dental-exams/presence/${dentalPresenceRecordId}`
            : `${apiBase}/patients/history/${patientId}/dental-exams/presence`;
        const presenceMethod = dentalPresenceRecordId !== null ? 'PUT' : 'POST';
        const res = await fetch(presenceUrl, {
          method: presenceMethod,
          headers,
          body: JSON.stringify(presencePayload),
        });

        if (!res.ok) {
          throw new Error(`Failed to save dental presence (${res.status})`);
        }

        const payload = await res.json().catch(() => null);
        if (payload && typeof payload === 'object') {
          if (typeof payload.id === 'number') {
            nextPresenceId = payload.id;
          }

          if (payload.presence && typeof payload.presence === 'object') {
            const updatedPresence = createInitialDentalPresence();
            DENTAL_FIELDS.forEach((field) => {
              const raw = payload.presence[field];
              if (typeof raw === 'boolean') {
                updatedPresence[field] = raw;
              } else if (typeof raw === 'number') {
                updatedPresence[field] = raw === 1;
              } else if (raw === null) {
                updatedPresence[field] = null;
              } else {
                updatedPresence[field] = null;
              }
            });
            nextPresenceState = updatedPresence;
          } else {
            nextPresenceState = {
              ...dentalPresence,
              [selectedTooth]:
                payloadPresenceValue === null ? null : payloadPresenceValue === 1,
            };
          }
        }
      } else {
        nextPresenceState = {
          ...dentalPresence,
          [selectedTooth]: null,
        };
      }

      const hasExistingExam = dentalExamRecordId !== null;
      if (hasExistingExam || sanitizedFinding.length > 0) {
        const examPayload: Record<string, string | null> = {
          [selectedTooth]: sanitizedFinding.length > 0 ? sanitizedFinding : null,
        };
        const examUrl =
          hasExistingExam
            ? `${apiBase}/patients/history/${patientId}/dental-exams/${dentalExamRecordId}`
            : `${apiBase}/patients/history/${patientId}/dental-exams`;
        const examMethod = hasExistingExam ? 'PUT' : 'POST';
        const res = await fetch(examUrl, {
          method: examMethod,
          headers,
          body: JSON.stringify(examPayload),
        });

        if (!res.ok) {
          throw new Error(`Failed to save dental finding (${res.status})`);
        }

        const payload = await res.json().catch(() => null);
        if (payload && typeof payload === 'object') {
          if (typeof payload.id === 'number') {
            nextExamId = payload.id;
          }

          if (payload.details && typeof payload.details === 'object') {
            const updatedFindings = createInitialDentalFindings();
            DENTAL_FIELDS.forEach((field) => {
              const raw = payload.details[field];
              if (typeof raw === 'string') {
                updatedFindings[field] = raw;
              } else if (raw === null || typeof raw === 'undefined') {
                updatedFindings[field] = '';
              } else {
                updatedFindings[field] = String(raw ?? '');
              }
            });
            nextFindingsState = updatedFindings;
          } else {
            nextFindingsState = {
              ...dentalFindings,
              [selectedTooth]: sanitizedFinding,
            };
          }
        }
      } else {
        nextFindingsState = {
          ...dentalFindings,
          [selectedTooth]: '',
        };
      }

      setDentalPresence(nextPresenceState);
      setDentalFindings(nextFindingsState);
      setDentalPresenceRecordId(nextPresenceId);
      setDentalExamRecordId(nextExamId);
      setIsDentalModalOpen(false);
      setSelectedTooth(null);
      setPendingPresence('unknown');
      setPendingFinding('');
    } catch (error) {
      console.error('Failed to save dental exam data', error);
      setDentalModalError('No se pudo guardar la información dental. Intenta nuevamente.');
    } finally {
      setIsSavingTooth(false);
    }
  };

  const handleOpenConsultationModal = () => {
    if (!patientId || !token) {
      return;
    }

    setConsultationForm(createInitialConsultationForm());
    setConsultationModalError(null);
    setIsConsultationModalOpen(true);
  };

  const handleCloseConsultationModal = () => {
    if (isSavingConsultation) {
      return;
    }

    setIsConsultationModalOpen(false);
    setConsultationModalError(null);
    setConsultationForm(createInitialConsultationForm());
  };

  const handleConsultationFieldChange = (
    field: keyof ConsultationFormState,
    value: string,
  ) => {
    setConsultationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitConsultation = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!patientId || !token) {
      setConsultationModalError('No se pudo identificar al paciente.');
      return;
    }

    setIsSavingConsultation(true);
    setConsultationModalError(null);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const normalizeInput = (value: string): string | null => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const payload = {
      id_paciente: patientId,
      motivo: normalizeInput(consultationForm.reason),
      fecha: normalizeInput(consultationForm.date),
      peso: normalizeInput(consultationForm.weight),
      imc: normalizeInput(consultationForm.bodyMassIndex),
      gc: normalizeInput(consultationForm.bodyFat),
      pulso: normalizeInput(consultationForm.pulse),
      fcm: normalizeInput(consultationForm.maxHeartRate),
      tension: normalizeInput(consultationForm.bloodPressure),
      brazo: normalizeInput(consultationForm.arm),
      muslo: normalizeInput(consultationForm.thigh),
      cintura: normalizeInput(consultationForm.waist),
      cadera: normalizeInput(consultationForm.hip),
      busto_pecho: normalizeInput(consultationForm.chest),
      cuello: normalizeInput(consultationForm.neck),
      hallazgo: normalizeInput(consultationForm.finding),
      recomendacion: normalizeInput(consultationForm.recommendation),
      observacion: normalizeInput(consultationForm.observation),
      diagnostico: normalizeInput(consultationForm.diagnosis),
      respiracion: normalizeInput(consultationForm.breathing),
      evolucion: normalizeInput(consultationForm.evolution),
      recomendacion_coach: normalizeInput(consultationForm.coachRecommendation),
      indicaciones: normalizeInput(consultationForm.indications),
    };

    try {
      const res = await fetch(`${apiBase}/consultation`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to create consultation (${res.status})`);
      }

      setConsultationSuccess('Consulta registrada correctamente.');
      setConsultationsError(null);
      setIsConsultationModalOpen(false);
      setConsultationForm(createInitialConsultationForm());
      setConsultationsRefreshKey((key) => key + 1);
    } catch (error) {
      console.error('Failed to save consultation', error);
      setConsultationModalError('No se pudo guardar la consulta. Intenta nuevamente.');
    } finally {
      setIsSavingConsultation(false);
    }
  };

  const renderQuadrant = (key: DentalQuadrantKey) => {
    const config = DENTAL_FIELD_GROUPS[key];

    return (
      <div key={key} className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-[0.2em]">
          {config.label}
        </h4>
        <div className="flex flex-wrap gap-2">
          {config.order.map((field) => {
            const meta = DENTAL_FIELD_META[field];
            const status = dentalPresence[field];
            const finding = dentalFindings[field].trim();
            return (
              <button
                key={field}
                type="button"
                onClick={() => handleToothClick(field)}
                title={formatToothTooltip(field)}
                className={`relative h-10 w-10 rounded-full border text-sm font-semibold transition ${getToothStatusClasses(status)} focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2`}
              >
                {meta.number}
                {finding && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'lab_results': return 'Lab Results';
      case 'imaging': return 'Medical Imaging';
      case 'prescription': return 'Prescriptions';
      case 'consultation': return 'Consultations';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lab_results': return 'bg-blue-100 text-blue-800';
      case 'imaging': return 'bg-green-100 text-green-800';
      case 'prescription': return 'bg-purple-100 text-purple-800';
      case 'consultation': return 'bg-yellow-100 text-yellow-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <section className="relative space-y-8 px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white via-white/80 to-transparent" />
        <div className="absolute -left-10 top-16 h-72 w-72 rounded-full bg-[#c7d2fe]/40 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[#e0f2fe]/70 blur-[140px]" />
      </div>
      <div className="relative space-y-6">
      {isLoadingHistory && (
        <div className="rounded-2xl border border-slate-100/80 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-lg shadow-slate-200/60 backdrop-blur">
          Cargando historia médica...
        </div>
      )}

      {historyError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-lg shadow-rose-100/60">
          {historyError}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700 shadow-lg shadow-emerald-100/60">
          {saveSuccess}
        </div>
      )}

      {consultationSuccess && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700 shadow-lg shadow-emerald-100/60">
          {consultationSuccess}
        </div>
      )}

      <div className="flex flex-col gap-5 rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-2xl shadow-slate-200/80 backdrop-blur-xl ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">Historia clínica</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Medical History Hub</h1>
          <p className="mt-2 text-sm text-slate-500">
            Centraliza tus documentos, antecedentes y respaldos médicos en un espacio seguro y elegante.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => setIsViewHistoryModalOpen(true)}
            className="bg-white/70 text-slate-700 shadow-sm hover:bg-white"
          >
            <Eye className="w-4 h-4" />
            <span className="ml-2">Visualizar historia</span>
          </Button>
          <Button 
            variant="secondary"
            onClick={handleOpenHistoryModal}
            className="bg-gradient-to-r from-[#c084fc] to-[#818cf8] text-white"
          >
            <Edit className="w-4 h-4" />
            <span className="ml-2">Editar historia</span>
          </Button>
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <Button 
              onClick={() => document.getElementById('file-upload')?.click()}
              className="bg-white/80 text-slate-700 shadow-sm hover:bg-white"
            >
              <Plus className="w-4 h-4" />
              <span className="ml-2">Subir archivo</span>
            </Button>
          </div>
        </div>
      </div>
      </div>

      <Card className="rounded-[24px] border-white/60 bg-white/80 shadow-xl shadow-slate-200/70 backdrop-blur">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Examen dental</h2>
              <p className="text-sm text-slate-500">
                Marca la presencia de cada pieza dental y registra los hallazgos detectados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                Presente
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                Ausente
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />
                Sin dato
              </span>
            </div>
          </div>

          {dentalLoadError && (
            <div className="rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
              {dentalLoadError}
            </div>
          )}

          {isLoadingDental ? (
            <div className="rounded-xl border border-slate-100 bg-white/70 px-4 py-6 text-sm text-slate-600">
              Cargando información dental...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {renderQuadrant('superiorDerecha')}
                {renderQuadrant('superiorIzquierda')}
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {renderQuadrant('inferiorDerecha')}
                {renderQuadrant('inferiorIzquierda')}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
              Detalle de los hallazgos
            </h3>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {(Object.entries(DENTAL_FIELD_GROUPS) as Array<[
                DentalQuadrantKey,
                (typeof DENTAL_FIELD_GROUPS)[DentalQuadrantKey],
              ]>).map(([key, config]) => (
                <div key={key} className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-600">{config.label}</h4>
                  <div className="space-y-1 rounded-xl bg-slate-50/70 p-3">
                    {config.order.map((field) => {
                      const meta = DENTAL_FIELD_META[field];
                      const rawFinding = dentalFindings[field];
                      const trimmedFinding = rawFinding.trim();
                      return (
                        <div
                          key={field}
                          className="flex items-start gap-2 text-sm text-slate-600"
                        >
                          <span className="w-14 font-semibold text-slate-500">
                            {`${meta.displayCode}${meta.number}:`}
                          </span>
                          <span className="flex-1 text-slate-500">
                            {trimmedFinding ? trimmedFinding : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[24px] border-white/60 bg-white/80 shadow-xl shadow-slate-200/70 backdrop-blur">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Examen ocular</h2>
              <p className="text-sm text-slate-500">
                Consulta el historial de evaluaciones oculares registradas por el equipo médico.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={handleOpenOcularModal}
              className="inline-flex items-center gap-2 self-start md:self-auto"
              disabled={!patientId || !token}
              title={!patientId || !token ? 'Selecciona un paciente para registrar un examen ocular' : 'Registrar examen ocular'}
            >
              <Plus className="h-4 w-4" />
              Registrar examen ocular
            </Button>
          </div>

          {ocularLoadError && (
            <div className="rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
              {ocularLoadError}
            </div>
          )}

          {isLoadingOcular ? (
            <div className="rounded-xl border border-slate-100 bg-white/70 px-4 py-6 text-sm text-slate-600">
              Cargando historial ocular...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white/80">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/80">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Observación ojo derecho</th>
                    <th className="px-4 py-3">Imagen ojo derecho</th>
                    <th className="px-4 py-3">Observación ojo izquierdo</th>
                    <th className="px-4 py-3">Imagen ojo izquierdo</th>
                    <th className="px-4 py-3">Comentario ojo izquierdo</th>
                    <th className="px-4 py-3">Comentario ojo derecho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ocularExams.length > 0 ? (
                    ocularExams.map((exam) => {
                      const rightEyeDisplay = toDisplayText(exam.rightEye);
                      const leftEyeDisplay = toDisplayText(exam.leftEye);
                      return (
                        <tr key={exam.id} className="text-sm text-slate-600">
                          <td className="whitespace-nowrap px-4 py-3">{exam.dateLabel}</td>
                          <td className="min-w-[10rem] px-4 py-3">{toDisplayText(exam.reason)}</td>
                          <td className="min-w-[12rem] px-4 py-3">{toDisplayText(exam.rightObservation)}</td>
                          <td className="min-w-[10rem] px-4 py-3">
                            {exam.rightEyeImageUrl ? (
                              <div className="flex flex-col items-center gap-2">
                                <a
                                  href={exam.rightEyeImageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center"
                                  title="Abrir imagen del ojo derecho"
                                >
                                  <img
                                    src={exam.rightEyeImageUrl}
                                    alt="Imagen del ojo derecho"
                                    loading="lazy"
                                    className="h-24 w-24 rounded-lg border border-slate-200 object-cover shadow-sm"
                                  />
                                </a>
                              </div>
                            ) : (
                              <span>{rightEyeDisplay}</span>
                            )}
                          </td>
                          <td className="min-w-[12rem] px-4 py-3">{toDisplayText(exam.leftObservation)}</td>
                          <td className="min-w-[10rem] px-4 py-3">
                            {exam.leftEyeImageUrl ? (
                              <div className="flex flex-col items-center gap-2">
                                <a
                                  href={exam.leftEyeImageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center"
                                  title="Abrir imagen del ojo izquierdo"
                                >
                                  <img
                                    src={exam.leftEyeImageUrl}
                                    alt="Imagen del ojo izquierdo"
                                    loading="lazy"
                                    className="h-24 w-24 rounded-lg border border-slate-200 object-cover shadow-sm"
                                  />
                                </a>
                              </div>
                            ) : (
                              <span>{leftEyeDisplay}</span>
                            )}
                          </td>
                          <td className="min-w-[12rem] px-4 py-3">{toDisplayText(exam.leftComment)}</td>
                          <td className="min-w-[12rem] px-4 py-3">{toDisplayText(exam.rightComment)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-sm text-slate-500"
                      >
                        No hay registros oculares disponibles.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-[24px] border-white/60 bg-white/80 shadow-xl shadow-slate-200/70 backdrop-blur">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Consultas médicas</h2>
              <p className="text-sm text-slate-500">
                Revisa las consultas registradas y añade nuevas evaluaciones clínicas.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={handleOpenConsultationModal}
              className="inline-flex items-center gap-2 self-start md:self-auto"
              disabled={!patientId || !token}
              title={
                !patientId || !token
                  ? 'Selecciona un paciente para registrar una consulta'
                  : 'Registrar una nueva consulta'
              }
            >
              <Plus className="h-4 w-4" />
              Registrar consulta
            </Button>
          </div>

          {consultationsError && (
            <div className="rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
              {consultationsError}
            </div>
          )}

          {isLoadingConsultations ? (
            <div className="rounded-xl border border-slate-100 bg-white/70 px-4 py-6 text-sm text-slate-600">
              Cargando historial de consultas...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white/80">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/80">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Peso</th>
                    <th className="px-4 py-3">IMC</th>
                    <th className="px-4 py-3">Pulso</th>
                    <th className="px-4 py-3">Tensión</th>
                    <th className="px-4 py-3">Diagnóstico</th>
                    <th className="px-4 py-3">Recomendación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consultations.length > 0 ? (
                    consultations.map((consultation) => (
                      <tr
                        key={consultation.id}
                        className="cursor-pointer text-sm text-slate-600 transition hover:bg-slate-50 focus-within:bg-slate-100"
                        onClick={() => navigate(`/medical-history/consultations/${consultation.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/medical-history/consultations/${consultation.id}`);
                          }
                        }}
                      >
                        <td className="whitespace-nowrap px-4 py-3">{consultation.dateLabel}</td>
                        <td className="min-w-[12rem] px-4 py-3">{toDisplayText(consultation.reason)}</td>
                        <td className="px-4 py-3">{toDisplayText(consultation.weight)}</td>
                        <td className="px-4 py-3">{toDisplayText(consultation.bodyMassIndex)}</td>
                        <td className="px-4 py-3">{toDisplayText(consultation.pulse)}</td>
                        <td className="px-4 py-3">{toDisplayText(consultation.bloodPressure)}</td>
                        <td className="min-w-[12rem] px-4 py-3">{toDisplayText(consultation.diagnosis)}</td>
                        <td className="min-w-[12rem] px-4 py-3">{toDisplayText(consultation.recommendation)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-sm text-slate-500"
                      >
                        No hay consultas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Upload Area */}
      <Card className="rounded-[24px] border-white/60 bg-white/80 shadow-xl shadow-slate-200/70 backdrop-blur">
        <div
          className="rounded-[22px] border-2 border-dashed border-slate-200/70 bg-gradient-to-br from-white via-white/70 to-slate-50/70 p-8 text-center transition-all hover:border-[#c4b5fd] hover:shadow-lg hover:shadow-slate-200/80 cursor-pointer"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c084fc]/20 to-[#818cf8]/20 text-[#7c3aed]">
            <Upload className="h-7 w-7" />
          </span>
          <h3 className="text-xl font-semibold text-slate-900">Carga tus documentos médicos</h3>
          <p className="mt-2 text-sm text-slate-500">
            Arrastra y suelta archivos o haz clic para buscarlos en tu dispositivo.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            PDF · JPG · PNG · DOC · DOCX · Máx 10MB
          </p>
        </div>
      </Card>

      {/* Filters */}
      <Card
        padding="sm"
        className="rounded-[22px] border-white/60 bg-white/75 shadow-lg shadow-slate-200/60 backdrop-blur"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Filtrar archivos</p>
          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-2.5 text-sm text-slate-600 shadow-inner shadow-white/40 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#c084fc]"
            >
              <option value="all">Todas las categorías</option>
              <option value="lab_results">Resultados de laboratorio</option>
              <option value="imaging">Imágenes médicas</option>
              <option value="prescription">Recetas</option>
              <option value="consultation">Consultas</option>
              <option value="other">Otros</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Files List */}
      <div className="space-y-4">
        {filteredFiles.map((file) => (
          <Card
            key={file.id}
            padding="sm"
            className="rounded-[20px] border-white/60 bg-white/80 shadow-lg shadow-slate-200/70 backdrop-blur"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-white text-slate-500">
                  <File className="h-6 w-6" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{file.name}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.uploadedAt.toLocaleDateString()}</span>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getCategoryColor(file.category)}`}>
                      {getCategoryLabel(file.category)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  disabled={
                    Boolean(downloadingFileId && downloadingFileId === file.id) ||
                    (!file.attachmentId && !file.downloadPath)
                  }
                  title={
                    !file.attachmentId && !file.downloadPath
                      ? 'El archivo aún no está disponible para descargar'
                      : 'Descargar archivo'
                  }
                  className="border-slate-200/80 text-slate-600 hover:border-[#c084fc] hover:text-[#6d28d9]"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => handleDelete(file.id)}
                  className="bg-gradient-to-r from-rose-500 to-rose-600 text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <Card className="rounded-[24px] border-white/60 bg-white/80 py-12 text-center shadow-xl shadow-slate-200/70">
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-white text-slate-400">
            <File className="h-8 w-8" />
          </span>
          <h3 className="text-lg font-semibold text-slate-900">No encontramos archivos</h3>
          <p className="mt-2 text-sm text-slate-500">
            {selectedCategory === 'all' 
              ? 'Carga tu primer documento médico para comenzar a organizar tu historial.'
              : `Sin resultados en la categoría ${getCategoryLabel(selectedCategory)}.`
            }
          </p>
        </Card>
      )}
      </section>

      {/* Upload Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Medical File"
      >
        {uploadingFile && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">File to upload:</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{uploadingFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(uploadingFile.size)} • {uploadingFile.type}
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as MedicalFile['category'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="lab_results">Lab Results</option>
                <option value="imaging">Medical Imaging</option>
                <option value="prescription">Prescriptions</option>
                <option value="consultation">Consultations</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUploadSubmit}>
                Upload File
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isConsultationModalOpen}
        onClose={handleCloseConsultationModal}
        title="Registrar consulta médica"
      >
        <form className="space-y-5" onSubmit={handleSubmitConsultation}>
          {consultationModalError && (
            <div className="rounded-md border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
              {consultationModalError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Fecha de la consulta
              </label>
              <input
                type="date"
                value={consultationForm.date}
                onChange={(event) =>
                  handleConsultationFieldChange('date', event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Motivo
              </label>
              <input
                type="text"
                value={consultationForm.reason}
                onChange={(event) =>
                  handleConsultationFieldChange('reason', event.target.value)
                }
                placeholder="Describe brevemente el motivo"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Peso
              </label>
              <input
                type="text"
                value={consultationForm.weight}
                onChange={(event) =>
                  handleConsultationFieldChange('weight', event.target.value)
                }
                placeholder="Ej. 72 kg"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                IMC
              </label>
              <input
                type="text"
                value={consultationForm.bodyMassIndex}
                onChange={(event) =>
                  handleConsultationFieldChange('bodyMassIndex', event.target.value)
                }
                placeholder="Ej. 24.5"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                % Grasa corporal
              </label>
              <input
                type="text"
                value={consultationForm.bodyFat}
                onChange={(event) =>
                  handleConsultationFieldChange('bodyFat', event.target.value)
                }
                placeholder="Ej. 18%"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Pulso
              </label>
              <input
                type="text"
                value={consultationForm.pulse}
                onChange={(event) =>
                  handleConsultationFieldChange('pulse', event.target.value)
                }
                placeholder="Ej. 72 bpm"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Frecuencia cardíaca máxima
              </label>
              <input
                type="text"
                value={consultationForm.maxHeartRate}
                onChange={(event) =>
                  handleConsultationFieldChange('maxHeartRate', event.target.value)
                }
                placeholder="Ej. 160 bpm"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Tensión arterial
              </label>
              <input
                type="text"
                value={consultationForm.bloodPressure}
                onChange={(event) =>
                  handleConsultationFieldChange('bloodPressure', event.target.value)
                }
                placeholder="Ej. 120/80"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Cintura
              </label>
              <input
                type="text"
                value={consultationForm.waist}
                onChange={(event) =>
                  handleConsultationFieldChange('waist', event.target.value)
                }
                placeholder="Ej. 82 cm"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Cadera
              </label>
              <input
                type="text"
                value={consultationForm.hip}
                onChange={(event) =>
                  handleConsultationFieldChange('hip', event.target.value)
                }
                placeholder="Ej. 95 cm"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Circunferencia brazo
              </label>
              <input
                type="text"
                value={consultationForm.arm}
                onChange={(event) =>
                  handleConsultationFieldChange('arm', event.target.value)
                }
                placeholder="Ej. 32 cm"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Circunferencia muslo
              </label>
              <input
                type="text"
                value={consultationForm.thigh}
                onChange={(event) =>
                  handleConsultationFieldChange('thigh', event.target.value)
                }
                placeholder="Ej. 55 cm"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Busto/pecho
              </label>
              <input
                type="text"
                value={consultationForm.chest}
                onChange={(event) =>
                  handleConsultationFieldChange('chest', event.target.value)
                }
                placeholder="Ej. 98 cm"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Cuello
              </label>
              <input
                type="text"
                value={consultationForm.neck}
                onChange={(event) =>
                  handleConsultationFieldChange('neck', event.target.value)
                }
                placeholder="Ej. 36 cm"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Hallazgo
            </label>
            <textarea
              value={consultationForm.finding}
              onChange={(event) =>
                handleConsultationFieldChange('finding', event.target.value)
              }
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Resume los hallazgos principales"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Diagnóstico
            </label>
            <textarea
              value={consultationForm.diagnosis}
              onChange={(event) =>
                handleConsultationFieldChange('diagnosis', event.target.value)
              }
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Describe el diagnóstico principal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Recomendación
            </label>
            <textarea
              value={consultationForm.recommendation}
              onChange={(event) =>
                handleConsultationFieldChange('recommendation', event.target.value)
              }
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Incluye indicaciones o recomendaciones"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Observaciones
            </label>
            <textarea
              value={consultationForm.observation}
              onChange={(event) =>
                handleConsultationFieldChange('observation', event.target.value)
              }
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Notas adicionales (opcional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Respiración
            </label>
            <textarea
              value={consultationForm.breathing}
              onChange={(event) =>
                handleConsultationFieldChange('breathing', event.target.value)
              }
              rows={2}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Observaciones sobre la respiración"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Evolución
            </label>
            <textarea
              value={consultationForm.evolution}
              onChange={(event) =>
                handleConsultationFieldChange('evolution', event.target.value)
              }
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Registra la evolución del paciente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Recomendación del coach
            </label>
            <textarea
              value={consultationForm.coachRecommendation}
              onChange={(event) =>
                handleConsultationFieldChange('coachRecommendation', event.target.value)
              }
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Notas o recomendaciones del coach"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Indicaciones
            </label>
            <textarea
              value={consultationForm.indications}
              onChange={(event) =>
                handleConsultationFieldChange('indications', event.target.value)
              }
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Indicaciones adicionales para el paciente"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseConsultationModal}
              disabled={isSavingConsultation}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingConsultation}>
              {isSavingConsultation ? 'Guardando...' : 'Guardar consulta'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isOcularModalOpen}
        onClose={handleCloseOcularModal}
        title="Registrar examen ocular"
      >
        <form className="space-y-5" onSubmit={handleSubmitOcularExam}>
          {ocularModalError && (
            <div className="rounded-md border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
              {ocularModalError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Fecha del examen
              </label>
              <input
                type="date"
                value={ocularForm.date}
                onChange={(event) => handleOcularFieldChange('date', event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Motivo de consulta
              </label>
              <input
                type="text"
                value={ocularForm.reason}
                onChange={(event) => handleOcularFieldChange('reason', event.target.value)}
                placeholder="Describe brevemente el motivo"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-[0.2em]">
                Ojo derecho
              </h4>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Observación
                </label>
                <textarea
                  value={ocularForm.rightObservation}
                  onChange={(event) => handleOcularFieldChange('rightObservation', event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Anota los hallazgos del ojo derecho"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Imagen del ojo derecho
                </label>
                <input
                  key={`right-eye-upload-${ocularFormResetKey}`}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) =>
                    handleOcularFileChange(
                      'rightEyeFile',
                      event.target.files && event.target.files.length > 0
                        ? event.target.files[0]
                        : null,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Admite JPG o PNG de hasta 10&nbsp;MB.
                </p>
                {ocularForm.rightEyeFile && (
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {ocularForm.rightEyeFile.name}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-[0.2em]">
                Ojo izquierdo
              </h4>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Observación
                </label>
                <textarea
                  value={ocularForm.leftObservation}
                  onChange={(event) => handleOcularFieldChange('leftObservation', event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Anota los hallazgos del ojo izquierdo"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Imagen del ojo izquierdo
                </label>
                <input
                  key={`left-eye-upload-${ocularFormResetKey}`}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) =>
                    handleOcularFileChange(
                      'leftEyeFile',
                      event.target.files && event.target.files.length > 0
                        ? event.target.files[0]
                        : null,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Admite JPG o PNG de hasta 10&nbsp;MB.
                </p>
                {ocularForm.leftEyeFile && (
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {ocularForm.leftEyeFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Comentarios adicionales
            </label>
            <textarea
              value={ocularForm.comment}
              onChange={(event) => handleOcularFieldChange('comment', event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Registra notas complementarias (opcional)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseOcularModal}
              disabled={isSavingOcularExam}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingOcularExam}>
              {isSavingOcularExam ? 'Guardando...' : 'Guardar examen'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDentalModalOpen}
        onClose={handleDentalModalClose}
        title={
          selectedTooth
            ? `Actualizar pieza ${DENTAL_FIELD_META[selectedTooth].displayCode}${DENTAL_FIELD_META[selectedTooth].number}`
            : 'Actualizar pieza dental'
        }
      >
        {selectedTooth ? (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleDentalSave();
            }}
          >
            <p className="text-sm text-slate-600">
              {DENTAL_FIELD_META[selectedTooth].quadrantLabel} -{' '}
              {DENTAL_FIELD_META[selectedTooth].number}
            </p>

            {dentalModalError && (
              <div className="rounded-md border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
                {dentalModalError}
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-slate-700">Presencia</span>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DENTAL_PRESENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={presenceOptionClass(option.value)}
                    onClick={() => setPendingPresence(option.value)}
                    title={option.helper}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Hallazgo
              </label>
              <textarea
                value={pendingFinding}
                onChange={(event) => setPendingFinding(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Describe el hallazgo para esta pieza (opcional)"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDentalModalClose}
                disabled={isSavingTooth}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingTooth}>
                {isSavingTooth ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-600">
            Selecciona una pieza dental para actualizar su información.
          </p>
        )}
      </Modal>

      <MedicalHistoryViewModal
        isOpen={isViewHistoryModalOpen}
        onClose={() => setIsViewHistoryModalOpen(false)}
        data={medicalHistoryData}
        isLoading={isLoadingHistory}
        errorMessage={historyError}
      />

      {/* Medical History Update Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        title="Update Medical History"
        size="xl"
      >
        <PatientMedicalHistoryForm
          data={medicalHistoryData}
          setData={setMedicalHistoryData}
          onSubmit={handleHistorySubmit}
          isSaving={isSavingHistory}
          errorMessage={saveError}
          successMessage={saveSuccess}
          isLoading={isLoadingHistory}
        />
      </Modal>
    </>
  );
};