import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, File, Download, Trash2, Plus, Edit, Eye } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
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
  { key: 'workSharing', label: '¿Con quién lo comparte?' },
  { key: 'leisure', label: 'hobbies' },
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

const buildUpdatePayload = (data: MedicalHistoryData): UpdateHistoryPayload => {
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
      <div className="space-y-4">
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
  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';
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
    if (!saveSuccess) {
      return;
    }
    const timer = window.setTimeout(() => setSaveSuccess(null), 5000);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

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

  const updatePersonalField = (
    field: keyof MedicalHistoryData['personal'],
    value: string
  ) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      personal: {
        ...prev.personal,
        [field]: value,
      },
    }));
  };

  const updateContactField = (
    field: keyof MedicalHistoryData['contacts'],
    value: string
  ) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      contacts: {
        ...prev.contacts,
        [field]: value,
      },
    }));
  };

  const updateTreatingDoctorField = (
    field: keyof MedicalHistoryData['treatingDoctor'],
    value: string
  ) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      treatingDoctor: {
        ...prev.treatingDoctor,
        [field]: value,
      },
    }));
  };

  const updateFamilyPathologyField = (
    field: keyof MedicalHistoryData['family']['pathologies'],
    value: string
  ) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      family: {
        ...prev.family,
        pathologies: {
          ...prev.family.pathologies,
          [field]: value,
        },
      },
    }));
  };

  const updateFamilyContextField = (
    field: keyof MedicalHistoryData['family']['context'],
    value: string
  ) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      family: {
        ...prev.family,
        context: {
          ...prev.family.context,
          [field]: value,
        },
      },
    }));
  };

  const updateImmunizationField = (
    field: keyof MedicalHistoryData['immunizations'],
    value: boolean | string
  ) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      immunizations: {
        ...prev.immunizations,
        [field]: value,
      },
    }));
  };

  const updateGynecologicalField = (
    field: keyof MedicalHistoryData['gynecological'],
    value: string
  ) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      gynecological: {
        ...prev.gynecological,
        [field]: value,
      },
    }));
  };

  const updateLifestyleField = (
    field: keyof MedicalHistoryData['lifestyle'],
    value: string
  ) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      lifestyle: {
        ...prev.lifestyle,
        [field]: value,
      },
    }));
  };

  const updateClinicalBackgroundField = (
    field: keyof MedicalHistoryData['clinicalBackground'],
    value: string
  ) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      clinicalBackground: {
        ...prev.clinicalBackground,
        [field]: value,
      },
    }));
  };

  const updateAlterationField = (key: AlterationKey, value: boolean) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      alterations: {
        ...prev.alterations,
        [key]: value,
      },
    }));
  };

  const updateDiseaseField = (key: DiseaseKey, value: string) => {
    setMedicalHistoryData(prev => ({
      ...prev,
      diseases: {
        ...prev.diseases,
        [key]: value,
      },
    }));
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
      <section className="space-y-6 px-4 py-8 sm:px-6">
      {isLoadingHistory && (
        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Cargando historia médica...
        </div>
      )}

      {historyError && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {historyError}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {saveSuccess}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical History</h1>
          <p className="text-gray-600">Manage your medical documents and files</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsViewHistoryModalOpen(true)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Visualizar historia médica
          </Button>
          <Button 
            variant="secondary"
            onClick={handleOpenHistoryModal}
          >
            <Edit className="w-4 h-4 mr-2" />
            Update Medical History
          </Button>
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <Button onClick={() => document.getElementById('file-upload')?.click()}>
              <Plus className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Medical Files</h3>
          <p className="text-gray-600">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
          </p>
        </div>
      </Card>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex items-center space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="lab_results">Lab Results</option>
            <option value="imaging">Medical Imaging</option>
            <option value="prescription">Prescriptions</option>
            <option value="consultation">Consultations</option>
            <option value="other">Other</option>
          </select>
        </div>
      </Card>

      {/* Files List */}
      <div className="space-y-4">
        {filteredFiles.map((file) => (
          <Card key={file.id} padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <File className="w-8 h-8 text-gray-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{file.name}</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.uploadedAt.toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full font-medium ${getCategoryColor(file.category)}`}>
                      {getCategoryLabel(file.category)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
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
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => handleDelete(file.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-600">
              {selectedCategory === 'all' 
                ? 'Upload your first medical document to get started.'
                : `No files found in the ${getCategoryLabel(selectedCategory)} category.`
              }
            </p>
          </div>
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
        <form onSubmit={handleHistorySubmit} className="space-y-6">
          {saveError && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Identificación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lugar de nacimiento
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.personal.birthPlace}
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
                  value={medicalHistoryData.personal.birthTime}
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
                  value={medicalHistoryData.personal.birthDate}
                  onChange={(e) => updatePersonalField('birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado civil
                </label>
                <select
                  value={medicalHistoryData.personal.maritalStatus}
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
                  value={medicalHistoryData.personal.profession}
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
                  value={medicalHistoryData.personal.occupation}
                  onChange={(e) => updatePersonalField('occupation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contacto y Emergencias</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={medicalHistoryData.contacts.phone}
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
                  value={medicalHistoryData.contacts.closeFamily}
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
                  value={medicalHistoryData.contacts.relationship}
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
                  value={medicalHistoryData.contacts.familyPhone}
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
                  value={medicalHistoryData.contacts.emergencyContact}
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
                  value={medicalHistoryData.contacts.emergencyEmail}
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
                  value={medicalHistoryData.contacts.emergencyPhone}
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
                value={medicalHistoryData.contacts.address}
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
                value={medicalHistoryData.contacts.companyAddress}
                onChange={(e) => updateContactField('companyAddress', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Médico Tratante</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Médico tratante
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.treatingDoctor.treatingDoctor}
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
                  value={medicalHistoryData.treatingDoctor.specialty}
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
                value={medicalHistoryData.treatingDoctor.currentMedication}
                onChange={(e) => updateTreatingDoctorField('currentMedication', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Antecedentes Familiares</h3>
            <p className="text-sm text-gray-600 mb-4">
              Registre el parentesco del familiar directo que haya presentado cada condición
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(familyPathologyLabels) as Array<keyof MedicalHistoryData['family']['pathologies']>).map((key) => (
                <div key={key} className={key === 'others' ? 'md:col-span-2' : undefined}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {familyPathologyLabels[key]}
                  </label>
                  {key === 'others' ? (
                    <textarea
                      value={medicalHistoryData.family.pathologies[key]}
                      onChange={(e) => updateFamilyPathologyField(key, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={medicalHistoryData.family.pathologies[key]}
                      onChange={(e) => updateFamilyPathologyField(key, e.target.value)}
                      placeholder="Parentesco (ej: padre, madre, hermano)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contexto Familiar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Edad del padre
                </label>
                <input
                  type="text"
                  value={medicalHistoryData.family.context.fatherAge}
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
                  value={medicalHistoryData.family.context.fatherStatus}
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
                  value={medicalHistoryData.family.context.motherAge}
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
                  value={medicalHistoryData.family.context.motherStatus}
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
                  value={medicalHistoryData.family.context.siblingsCount}
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
                  value={medicalHistoryData.family.context.siblingPosition}
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
                  value={medicalHistoryData.family.context.childrenCount}
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
                  value={medicalHistoryData.family.context.livesWith}
                  onChange={(e) => updateFamilyContextField('livesWith', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Esquema de Vacunación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {immunizationOptions.map(({ key, label }) => (
                <label key={key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={medicalHistoryData.immunizations[key]}
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
                value={medicalHistoryData.immunizations.otherImmunization}
                onChange={(e) => updateImmunizationField('otherImmunization', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Historia Ginecológica</h3>
            <p className="text-sm text-gray-600 mb-4">
              Complete en caso de aplicar
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gynecologicalFields.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={medicalHistoryData.gynecological[key]}
                    onChange={(e) => updateGynecologicalField(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estilo de Vida</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lifestyleFields.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={medicalHistoryData.lifestyle[key]}
                    onChange={(e) => updateLifestyleField(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Antecedentes Clínicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                value={medicalHistoryData.diseases[diseaseKey]}
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
                          value={medicalHistoryData.clinicalBackground[key]}
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
                            <label
                              key={alterationKey}
                              className="flex items-center space-x-3"
                            >
                              <input
                                type="checkbox"
                                checked={medicalHistoryData.alterations[alterationKey]}
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
                          value={medicalHistoryData.clinicalBackground[key]}
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
                        value={medicalHistoryData.clinicalBackground[key]}
                        onChange={(e) => updateClinicalBackgroundField(key, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={medicalHistoryData.clinicalBackground[key]}
                        onChange={(e) => updateClinicalBackgroundField(key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseHistoryModal}
              disabled={isSavingHistory}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingHistory}>
              {isSavingHistory ? 'Guardando...' : 'Guardar Historia Médica'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};