import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ArrowRight } from 'lucide-react';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { useApp } from '../../context/AppContext';
import { Program, Ribbon } from '../../types';

type RibbonFormState = {
	name: string;
	description: string;
	color: string;
	hexColor: string;
	bgColor: string;
	thread: string;
	order: string;
	isRibbon: boolean;
	nextRibbonId: string;
};

const createEmptyRibbonForm = (): RibbonFormState => ({
	name: '',
	description: '',
	color: '',
	hexColor: '',
	bgColor: '',
	thread: '',
	order: '',
	isRibbon: false,
	nextRibbonId: '',
});

const sanitizeNumericField = (value: string): number | null => {
	if (!value || !value.trim()) {
		return null;
	}
	const parsed = Number(value.trim());
	return Number.isFinite(parsed) ? parsed : null;
};

export const ProgramManagement: React.FC = () => {
	const {
		programs: ctxPrograms,
		addProgram,
		updateProgram,
		deleteProgram,
		instruments,
		ribbons,
		reloadRibbons,
		addRibbon,
		updateRibbon,
		deleteRibbon,
	} = useApp();

	const [activeTab, setActiveTab] = useState<'programs' | 'ribbons'>('programs');
	const [programs, setPrograms] = useState<Program[]>(ctxPrograms);
	const [searchTerm, setSearchTerm] = useState('');
	const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
	const [editingProgram, setEditingProgram] = useState<Program | null>(null);
	const [programForm, setProgramForm] = useState({
		name: '',
		description: '',
		instruments: [] as string[],
	});

	const [ribbonSearchTerm, setRibbonSearchTerm] = useState('');
	const [editingRibbon, setEditingRibbon] = useState<Ribbon | null>(null);
	const [ribbonForm, setRibbonForm] = useState<RibbonFormState>(() => createEmptyRibbonForm());

	const navigate = useNavigate();
	const apiBase = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3000';

	useEffect(() => {
		setPrograms(ctxPrograms);
	}, [ctxPrograms]);

	useEffect(() => {
		const loadPrograms = async () => {
			try {
				const res = await fetch(`${apiBase}/programs`);
				if (!res.ok) {
					throw new Error(`Failed to fetch programs (${res.status})`);
				}

				const data = await res.json();
				const mapped: Program[] = (data || []).map((p: any) => {
					const createdAt = p.created_at ? new Date(p.created_at) : new Date();
					const updatedAt = p.updated_at ? new Date(p.updated_at) : (p.updatedAt ? new Date(p.updatedAt) : createdAt);
					return {
						id: String(p.id),
						name: p.nombre ?? p.name ?? '',
						description: p.descripcion ?? p.description ?? '',
						instruments: Array.isArray(p.instruments) ? p.instruments.map(String) : [],
						isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
						createdAt,
						updatedAt,
						createdBy: p.user_created ?? p.userCreated ?? null,
					};
				});
				setPrograms(mapped);
			} catch (error) {
				console.error('Failed to load programs from API, using context fallback.', error);
				setPrograms(ctxPrograms);
			}
		};

		void loadPrograms();
	}, [apiBase, ctxPrograms]);

	useEffect(() => {
		if (activeTab !== 'ribbons') {
			return;
		}

		const loadRibbons = async () => {
			try {
				await reloadRibbons();
			} catch (error) {
				console.error('No se pudieron cargar las cintas.', error);
			}
		};

		void loadRibbons();
	}, [activeTab, reloadRibbons]);

	const filteredPrograms = useMemo(() => {
		const term = searchTerm.trim().toLowerCase();
		if (!term) {
			return programs;
		}
		return programs.filter(program =>
			(program.name || '').toLowerCase().includes(term) ||
			(program.description || '').toLowerCase().includes(term),
		);
	}, [programs, searchTerm]);

	const filteredRibbons = useMemo(() => {
		const term = ribbonSearchTerm.trim().toLowerCase();
		if (!term) {
			return ribbons;
		}
		return ribbons.filter((ribbon) => {
			const name = ribbon.name?.toLowerCase() ?? '';
			const description = ribbon.description?.toLowerCase() ?? '';
			const color = ribbon.color?.toLowerCase() ?? '';
			const hex = ribbon.hexColor?.toLowerCase() ?? '';
			return name.includes(term) || description.includes(term) || color.includes(term) || hex.includes(term);
		});
	}, [ribbons, ribbonSearchTerm]);

	const availableNextRibbonOptions = useMemo(() => {
		if (!editingRibbon) {
			return ribbons;
		}
		return ribbons.filter(ribbon => ribbon.id !== editingRibbon.id);
	}, [ribbons, editingRibbon]);

	const totalPrograms = programs.length;
	const linkedInstrumentCount = instruments.length;
	const lastProgramUpdatedLabel = useMemo(() => {
		const timestamps = programs
			.map(program => program.updatedAt?.getTime() ?? program.createdAt?.getTime())
			.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
		if (!timestamps.length) {
			return 'Sin registros';
		}
		return new Date(Math.max(...timestamps)).toLocaleDateString();
	}, [programs]);

	const totalRibbons = ribbons.length;
	const chainedRibbonCount = useMemo(
		() => ribbons.filter(ribbon => ribbon.nextRibbonId !== null && typeof ribbon.nextRibbonId !== 'undefined').length,
		[ribbons],
	);
	const lastRibbonUpdatedLabel = useMemo(() => {
		const timestamps = ribbons
			.map(ribbon => {
				const updatedAt = ribbon.updatedAt ? new Date(ribbon.updatedAt) : null;
				const createdAt = ribbon.createdAt ? new Date(ribbon.createdAt) : null;
				return updatedAt?.getTime() ?? createdAt?.getTime();
			})
			.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
		if (!timestamps.length) {
			return 'Sin registros';
		}
		return new Date(Math.max(...timestamps)).toLocaleDateString();
	}, [ribbons]);

	const handleOpenProgramModal = (program?: Program) => {
		if (program) {
			setEditingProgram(program);
			setProgramForm({
				name: program.name,
				description: program.description,
				instruments: Array.isArray(program.instruments) ? [...program.instruments] : [],
			});
		} else {
			setEditingProgram(null);
			setProgramForm({
				name: '',
				description: '',
				instruments: [],
			});
		}
		setIsProgramModalOpen(true);
	};

	const handleProgramSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		const payload = {
			...programForm,
			isActive: true,
		};

		try {
			if (editingProgram) {
				const updated = await updateProgram(editingProgram.id, payload);
				if (updated) {
					setPrograms(prev => prev.map(p => (p.id === editingProgram.id ? { ...p, ...updated, instruments: payload.instruments } : p)));
					alert('Programa actualizado correctamente.');
				} else {
					alert('No se pudo actualizar el programa.');
					return;
				}
			} else {
				const created = await addProgram(payload);
				setPrograms(prev => [...prev, { ...created, instruments: payload.instruments }]);
				alert('Programa creado correctamente.');
			}

			setIsProgramModalOpen(false);
		} catch (error) {
			console.error('No se pudo guardar el programa', error);
			alert('No se pudo guardar el programa. Intenta nuevamente.');
		}
	};

	const handleProgramDelete = async (programId: string) => {
		if (!confirm('¿Seguro que deseas eliminar este programa?')) {
			return;
		}

		try {
			const deleted = await deleteProgram(programId);
			if (deleted) {
				setPrograms(prev => prev.filter(p => p.id !== programId));
				alert('Programa eliminado correctamente.');
			} else {
				alert('El programa no se pudo eliminar.');
			}
		} catch (error) {
			console.error('No se pudo eliminar el programa', error);
			alert('No se pudo eliminar el programa.');
		}
	};

	const resetRibbonForm = () => {
		setEditingRibbon(null);
		setRibbonForm(createEmptyRibbonForm());
	};

	const prepareRibbonForm = (ribbon: Ribbon) => {
		setEditingRibbon(ribbon);
		setRibbonForm({
			name: ribbon.name ?? '',
			description: ribbon.description ?? '',
			color: ribbon.color ?? '',
			hexColor: ribbon.hexColor ?? '',
			bgColor: ribbon.bgColor ?? '',
			thread: ribbon.thread ?? '',
			order: typeof ribbon.order === 'number' && Number.isFinite(ribbon.order) ? String(ribbon.order) : '',
			isRibbon: Number(ribbon.layer) === 1,
			nextRibbonId: typeof ribbon.nextRibbonId === 'number' && Number.isFinite(ribbon.nextRibbonId) ? String(ribbon.nextRibbonId) : '',
		});
	};

	const handleRibbonSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!ribbonForm.name.trim()) {
			alert('El nombre de la cinta es obligatorio.');
			return;
		}

		const payload = {
			name: ribbonForm.name.trim(),
			description: ribbonForm.description.trim() ? ribbonForm.description.trim() : null,
			color: ribbonForm.color.trim() ? ribbonForm.color.trim() : null,
			hexColor: ribbonForm.hexColor.trim() ? ribbonForm.hexColor.trim() : null,
			bgColor: ribbonForm.bgColor.trim() ? ribbonForm.bgColor.trim() : null,
			thread: ribbonForm.thread.trim() ? ribbonForm.thread.trim() : null,
			order: sanitizeNumericField(ribbonForm.order),
			layer: ribbonForm.isRibbon ? 1 : 0,
			nextRibbonId: sanitizeNumericField(ribbonForm.nextRibbonId),
		};

		try {
			if (editingRibbon) {
				await updateRibbon(editingRibbon.id, payload);
				alert('Cinta actualizada correctamente.');
			} else {
				await addRibbon(payload);
				alert('Cinta creada correctamente.');
			}
			resetRibbonForm();
		} catch (error) {
			console.error('No se pudo guardar la cinta.', error);
			alert('No se pudo guardar la cinta. Intenta nuevamente.');
		}
	};

	const handleRibbonDelete = async (ribbonId: number) => {
		if (!confirm('¿Seguro que deseas eliminar esta cinta?')) {
			return;
		}

		try {
			await deleteRibbon(ribbonId);
			alert('Cinta eliminada correctamente.');
			if (editingRibbon && editingRibbon.id === ribbonId) {
				resetRibbonForm();
			}
		} catch (error) {
			console.error('No se pudo eliminar la cinta.', error);
			alert('No se pudo eliminar la cinta. Intenta nuevamente.');
		}
	};

	const handleRowClick = (program: Program) => {
		navigate(`/programs/${program.id}`);
	};

	const columns = [
		{
			key: 'name',
			header: 'Nombre',
		},
		{
			key: 'description',
			header: 'Descripción',
			render: (program: Program) => (
				<span className="truncate max-w-xs">{program.description}</span>
			),
		},
		{
			key: 'instruments',
			header: 'Instrumentos',
			render: (program: Program) => program.instruments.length,
		},
		{
			key: 'createdBy',
			header: 'Creado por',
			render: (program: Program) => program.createdBy ?? '—',
		},
		{
			key: 'updatedAt',
			header: 'Última actualización',
			render: (program: Program) => program.updatedAt ? program.updatedAt.toLocaleDateString() : '—',
		},
		{
			key: 'actions',
			header: 'Acciones',
			render: (program: Program) => (
				<div className="flex space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={(event) => {
							event.stopPropagation();
							handleOpenProgramModal(program);
						}}
					>
						<Edit className="w-4 h-4" />
					</Button>
					<Button
						variant="danger"
						size="sm"
						onClick={(event) => {
							event.stopPropagation();
							handleProgramDelete(program.id);
						}}
					>
						<Trash2 className="w-4 h-4" />
					</Button>
				</div>
			),
		},
	];

	return (
		<section className="space-y-6 px-4 py-8 sm:px-6">
			<div className="relative overflow-hidden rounded-[32px] border border-white/35 bg-gradient-to-br from-[#E0F2FE] via-white to-[#F5F3FF] shadow-[0_40px_95px_rgba(15,23,42,0.18)]">
				<div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
				<div aria-hidden className="absolute -top-10 right-6 h-48 w-48 rounded-full bg-[#C7D2FE] opacity-50 blur-3xl" />
				<div aria-hidden className="absolute -bottom-12 left-4 h-56 w-56 rounded-full bg-[#99F6E4] opacity-40 blur-3xl" />
				<div className="relative flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
					<div className="max-w-2xl space-y-4">
						<span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.5em] text-[#0F172A]">
							Programas
							<span className="h-1 w-1 rounded-full bg-[#22D3EE]" />
							Orbital
						</span>
						<div className="space-y-3">
							<h1 className="text-3xl font-semibold text-slate-900">Centro de programas</h1>
							<p className="text-sm text-slate-600 sm:text-base">
								Diseña, supervisa y conecta planes terapéuticos con instrumentos y escuadras clínicas desde un tablero ligero y envolvente.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<div className="inline-flex rounded-full border border-white/60 bg-white/40 p-1 text-sm font-semibold text-slate-600 backdrop-blur">
								<button
									type="button"
									onClick={() => setActiveTab('programs')}
									className={`rounded-full px-4 py-2 transition ${activeTab === 'programs' ? 'bg-gradient-to-r from-[#06B6D4] via-[#3B82F6] to-[#8B5CF6] text-white shadow-[0_14px_40px_rgba(59,130,246,0.35)]' : 'text-slate-600 hover:text-slate-900'}`}
								>
									Programas
								</button>
								<button
									type="button"
									onClick={() => {
										setActiveTab('ribbons');
										setRibbonSearchTerm('');
										resetRibbonForm();
									}}
									className={`rounded-full px-4 py-2 transition ${activeTab === 'ribbons' ? 'bg-gradient-to-r from-[#06B6D4] via-[#3B82F6] to-[#8B5CF6] text-white shadow-[0_14px_40px_rgba(59,130,246,0.35)]' : 'text-slate-600 hover:text-slate-900'}`}
								>
									Cintas
								</button>
							</div>

							{activeTab === 'programs' ? (
								<>
									<Button
										onClick={() => handleOpenProgramModal()}
										className="rounded-full bg-gradient-to-r from-[#06B6D4] via-[#3B82F6] to-[#8B5CF6] px-6 py-2 text-sm font-semibold text-white shadow-[0_20px_55px_rgba(59,130,246,0.35)] hover:opacity-95"
									>
										<Plus className="w-4 h-4 mr-2" />
										Nuevo programa
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => navigate('/instruments')}
										className="rounded-full border border-white/60 bg-white/40 px-4 py-2 text-sm font-semibold text-slate-600 backdrop-blur hover:text-slate-900"
									>
										Vincular instrumentos
										<ArrowRight className="w-4 h-4 ml-2" />
									</Button>
								</>
							) : (
								<Button
									type="button"
									variant="outline"
									onClick={() => resetRibbonForm()}
									className="rounded-full border border-white/60 bg-white/40 px-4 py-2 text-sm font-semibold text-slate-600 backdrop-blur hover:text-slate-900"
								>
									Crear nueva cinta
									<Plus className="w-4 h-4 ml-2" />
								</Button>
							)}
						</div>
					</div>
					<div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
						{activeTab === 'programs' ? (
							<>
								<div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
									<p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Programas activos</p>
									<p className="text-3xl font-semibold text-slate-900">{totalPrograms}</p>
								</div>
								<div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
									<p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Instrumentos vinculados</p>
									<p className="text-3xl font-semibold text-slate-900">{linkedInstrumentCount}</p>
								</div>
								<div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
									<p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Última edición</p>
									<p className="text-2xl font-semibold text-slate-900">{lastProgramUpdatedLabel}</p>
								</div>
							</>
						) : (
							<>
								<div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
									<p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Cintas registradas</p>
									<p className="text-3xl font-semibold text-slate-900">{totalRibbons}</p>
								</div>
								<div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
									<p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Secuencias enlazadas</p>
									<p className="text-3xl font-semibold text-slate-900">{chainedRibbonCount}</p>
								</div>
								<div className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
									<p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#0EA5E9]">Última actualización</p>
									<p className="text-2xl font-semibold text-slate-900">{lastRibbonUpdatedLabel}</p>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{activeTab === 'programs' ? (
				<>
					<Card className="rounded-[28px] border border-white/40 bg-white/80 shadow-[0_30px_85px_rgba(15,23,42,0.12)] backdrop-blur" padding="lg">
						<div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div className="relative w-full lg:max-w-md">
								<Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-cyan-600" />
								<input
									type="text"
									placeholder="Buscar programas por nombre o descripción..."
									value={searchTerm}
									onChange={(event) => setSearchTerm(event.target.value)}
									className="w-full rounded-3xl border border-gray/50 bg-white/70 pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 focus:border-[#67E8F9] focus:ring-2 focus:ring-[#C7D2FE]"
								/>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<span className="rounded-full border border-white/60 bg-white/50 px-3 py-1 text-sm font-semibold text-[#0F172A]">
									{filteredPrograms.length} coincidencias
								</span>
							</div>
						</div>

						<div className="overflow-hidden rounded-3xl border border-white/40">
							<Table
								data={filteredPrograms}
								columns={columns}
								onRowClick={handleRowClick}
								rowKey={(program) => program.id}
							/>
						</div>
					</Card>

					<Modal
						isOpen={isProgramModalOpen}
						onClose={() => setIsProgramModalOpen(false)}
						title={editingProgram ? 'Editar programa' : 'Crear nuevo programa'}
						size="lg"
					>
						<form onSubmit={handleProgramSubmit} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Nombre
								</label>
								<input
									type="text"
									required
									value={programForm.name}
									placeholder="Ingresa el nombre del programa"
									onChange={(event) => setProgramForm(prev => ({ ...prev, name: event.target.value }))}
									className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Descripción
								</label>
								<textarea
									required
									value={programForm.description}
									placeholder="Ingresa la descripción del programa"
									onChange={(event) => setProgramForm(prev => ({ ...prev, description: event.target.value }))}
									rows={3}
									className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Instrumentos
								</label>
								<div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
									{instruments.map((instrument) => (
										<label key={instrument.id} className="flex items-center rounded-2xl border border-white/40 bg-white/60 px-3 py-2 text-sm text-slate-700">
											<input
												type="checkbox"
												checked={programForm.instruments.includes(instrument.id)}
												onChange={(event) => {
													if (event.target.checked) {
														setProgramForm(prev => ({
															...prev,
															instruments: [...prev.instruments, instrument.id],
														}));
													} else {
														setProgramForm(prev => ({
															...prev,
															instruments: prev.instruments.filter(id => id !== instrument.id),
														}));
													}
												}}
												className="mr-2 accent-[#38BDF8]"
											/>
											<span>{instrument.name}</span>
										</label>
									))}
								</div>
							</div>

							<div className="flex justify-end space-x-3 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsProgramModalOpen(false)}
								>
									Cancelar
								</Button>
								<Button type="submit">
									{editingProgram ? 'Actualizar programa' : 'Crear programa'}
								</Button>
							</div>
						</form>
					</Modal>
				</>
			) : (
				<div className="space-y-5">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="relative w-full lg:max-w-md">
							<Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-cyan-600" />
							<input
								type="text"
								placeholder="Buscar cintas por nombre, color o descripción..."
								value={ribbonSearchTerm}
								onChange={(event) => setRibbonSearchTerm(event.target.value)}
								className="w-full rounded-3xl border border-gray/50 bg-white/70 pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-gray-400 focus:border-[#67E8F9] focus:ring-2 focus:ring-[#C7D2FE]"
							/>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<span className="rounded-full border border-white/60 bg-white/50 px-3 py-1 text-sm font-semibold text-[#0F172A]">
								{filteredRibbons.length} cintas visibles
							</span>
						</div>
					</div>

					<div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
						<div className="rounded-3xl border border-white/40 bg-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
									<thead className="bg-slate-50 text-slate-500">
										<tr>
											<th className="px-4 py-3 text-left font-semibold">Nombre</th>
											<th className="px-4 py-3 text-left font-semibold">Color</th>
											<th className="px-4 py-3 text-left font-semibold">Orden</th>
											<th className="px-4 py-3 text-left font-semibold">Siguiente</th>
											<th className="px-4 py-3 text-left font-semibold">Actualización</th>
											<th className="px-4 py-3 text-left font-semibold">Acciones</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{filteredRibbons.length === 0 && (
											<tr>
												<td colSpan={6} className="px-4 py-6 text-center text-slate-400">
													No hay cintas registradas que coincidan con tu búsqueda.
												</td>
											</tr>
										)}
										{filteredRibbons.map((ribbon) => (
											<tr key={ribbon.id} className="hover:bg-slate-50/60">
												<td className="px-4 py-3 font-medium text-slate-900">
													{ribbon.name || `Cinta ${ribbon.id}`}
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center gap-2">
														{ribbon.hexColor ? (
															<span
																className="inline-block h-4 w-4 rounded-full border border-slate-200"
																style={{ backgroundColor: ribbon.hexColor }}
															/>
														) : null}
														<span className="truncate max-w-[8rem]">
															{ribbon.color || ribbon.hexColor || '—'}
														</span>
													</div>
												</td>
												<td className="px-4 py-3">{typeof ribbon.order === 'number' ? ribbon.order : '—'}</td>
												<td className="px-4 py-3">
													{(() => {
														if (ribbon.nextRibbonId === null || typeof ribbon.nextRibbonId === 'undefined') {
															return '—';
														}
														const next = ribbons.find(item => item.id === ribbon.nextRibbonId);
														return next?.name ?? `Cinta ${ribbon.nextRibbonId}`;
													})()}
												</td>
												<td className="px-4 py-3">
													{ribbon.updatedAt ? new Date(ribbon.updatedAt).toLocaleDateString() : (ribbon.createdAt ? new Date(ribbon.createdAt).toLocaleDateString() : '—')}
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center gap-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => prepareRibbonForm(ribbon)}
														>
															<Edit className="w-4 h-4" />
														</Button>
														<Button
															variant="danger"
															size="sm"
															onClick={() => handleRibbonDelete(ribbon.id)}
														>
															<Trash2 className="w-4 h-4" />
														</Button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						<form onSubmit={handleRibbonSubmit} className="space-y-4 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
							<div className="flex items-center justify-between">
								<h3 className="text-base font-semibold text-slate-900">
									{editingRibbon ? 'Editar cinta' : 'Crear nueva cinta'}
								</h3>
								{editingRibbon ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => resetRibbonForm()}
									>
										Limpiar
									</Button>
								) : null}
							</div>

							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700">Nombre *</label>
								<input
									type="text"
									required
									value={ribbonForm.name}
									onChange={(event) => setRibbonForm(prev => ({ ...prev, name: event.target.value }))}
									className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
									placeholder="Nombre visible de la cinta"
								/>
							</div>

							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
								<textarea
									rows={3}
									value={ribbonForm.description}
									onChange={(event) => setRibbonForm(prev => ({ ...prev, description: event.target.value }))}
									className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
									placeholder="Detalle opcional de la cinta"
								/>
							</div>

							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">Color</label>
									<input
										type="text"
										value={ribbonForm.color}
										onChange={(event) => setRibbonForm(prev => ({ ...prev, color: event.target.value }))}
										className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
										placeholder="Ej: Azul marino"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">Color HEX</label>
									<input
										type="text"
										value={ribbonForm.hexColor}
										onChange={(event) => setRibbonForm(prev => ({ ...prev, hexColor: event.target.value }))}
										className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
										placeholder="#1E3A8A"
									/>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">Fondo</label>
									<input
										type="text"
										value={ribbonForm.bgColor}
										onChange={(event) => setRibbonForm(prev => ({ ...prev, bgColor: event.target.value }))}
										className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
										placeholder="Color de fondo opcional"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">Hilo</label>
									<input
										type="text"
										value={ribbonForm.thread}
										onChange={(event) => setRibbonForm(prev => ({ ...prev, thread: event.target.value }))}
										className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
										placeholder="Tipo de hilo"
									/>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-3">
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">Orden</label>
									<input
										type="number"
										value={ribbonForm.order}
										onChange={(event) => setRibbonForm(prev => ({ ...prev, order: event.target.value }))}
										className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
										placeholder="Ej: 1"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">¿Es una cinta?</label>
									<label className="flex items-center gap-2 rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900">
										<input
											type="checkbox"
											checked={ribbonForm.isRibbon}
											onChange={(event) => setRibbonForm(prev => ({ ...prev, isRibbon: event.target.checked }))}
											className="h-4 w-4 accent-[#38BDF8]"
										/>
										<span>Marca si corresponde</span>
									</label>
								</div>
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700">Siguiente cinta</label>
									<select
										value={ribbonForm.nextRibbonId}
										onChange={(event) => setRibbonForm(prev => ({ ...prev, nextRibbonId: event.target.value }))}
										className="w-full rounded-2xl border border-gray/60 bg-white/70 px-3 py-2 text-sm text-slate-900 focus:border-[#67E8F9] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
									>
										<option value="">Sin siguiente cinta</option>
										{availableNextRibbonOptions.map((option) => (
											<option key={option.id} value={String(option.id)}>
												{option.name || `Cinta ${option.id}`}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="flex justify-end gap-3 pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => resetRibbonForm()}
								>
									Reiniciar formulario
								</Button>
								<Button type="submit">
									{editingRibbon ? 'Actualizar cinta' : 'Crear cinta'}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</section>
	);
};
