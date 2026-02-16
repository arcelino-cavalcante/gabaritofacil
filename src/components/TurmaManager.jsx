import React, { useState, useEffect } from 'react';
import { listarTurmas, salvarTurma, excluirTurma, listarAlunosPorTurma } from '../db';
import { useModal } from '../contexts/ModalContext';

// Icons
const Icons = {
    Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
    Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    Back: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>,
    Calendar: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
};

const TurmaManager = ({ onBack, onSelectTurma }) => {
    const { showAlert, showConfirm } = useModal();
    const [turmas, setTurmas] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [nomeTurma, setNomeTurma] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarTurmas();
    }, []);

    const carregarTurmas = async () => {
        setLoading(true);
        try {
            const lista = await listarTurmas();
            // Carregar contagem de alunos para cada turma (opcional, mas visualmente rico)
            const turmasComDados = await Promise.all(lista.map(async (t) => {
                const alunos = await listarAlunosPorTurma(t.id);
                return { ...t, qtdAlunos: alunos.length };
            }));
            setTurmas(turmasComDados);
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCriarTurma = async (e) => {
        e.preventDefault();
        if (!nomeTurma.trim()) {
            await showAlert('Digite um nome para a turma');
            return;
        }

        try {
            await salvarTurma({ nome: nomeTurma });
            setNomeTurma('');
            setShowForm(false);
            carregarTurmas();
        } catch (error) {
            console.error('Erro ao criar turma:', error);
            await showAlert('Erro ao criar turma');
        }
    };

    const handleExcluir = async (id, e) => {
        e.stopPropagation();
        const confirmado = await showConfirm('Deseja realmente excluir esta turma? Todos os alunos e notas serão perdidos.', 'Confirmar Exclusão');
        if (confirmado) {
            try {
                await excluirTurma(id);
                carregarTurmas();
            } catch (error) {
                console.error('Erro ao excluir turma:', error);
                await showAlert('Erro ao excluir turma');
            }
        }
    };

    const filteredTurmas = turmas.filter(t =>
        t.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-neutral-50 font-sans text-black flex flex-col">
            {/* Top Toolbar */}
            <div className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-neutral-500 hover:bg-neutral-50 hover:text-orange-600 rounded-full transition-colors"
                    >
                        <Icons.Back />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-neutral-800">Minhas Turmas</h1>
                        <p className="text-xs text-neutral-500 hidden sm:block">Gerencie seus alunos e turmas</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative hidden md:block">
                        <input
                            type="text"
                            placeholder="Buscar turma..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none w-64 transition-all"
                        />
                        <div className="absolute left-3 top-2.5 text-neutral-400">
                            <Icons.Search />
                        </div>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm shadow-orange-200 flex items-center gap-2 transition-all"
                    >
                        <Icons.Plus /> <span className="hidden sm:inline">Nova Turma</span>
                    </button>
                </div>
            </div>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

                {/* Mobile Search Bar */}
                <div className="md:hidden mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar turma..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                        <div className="absolute left-3 top-3.5 text-neutral-400">
                            <Icons.Search />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="mt-4 text-neutral-400">Carregando turmas...</p>
                    </div>
                ) : filteredTurmas.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200 border-dashed">
                        <div className="w-16 h-16 bg-white text-neutral-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icons.Users />
                        </div>
                        <h3 className="text-black font-bold mb-1">Nenhuma turma encontrada</h3>
                        <p className="text-neutral-500 text-sm mb-6">Crie uma nova turma para começar a organizar seus alunos.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="text-orange-600 font-bold hover:underline"
                        >
                            Criar Turma Agora
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredTurmas.map((turma) => (
                            <div
                                key={turma.id}
                                onClick={() => onSelectTurma(turma)}
                                className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:border-orange-200 group relative overflow-hidden flex items-center justify-between gap-3"
                            >
                                {/* Color Bar Indicator */}
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>

                                <div className="pl-3 flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl group-hover:scale-110 transition-transform shrink-0">
                                        {turma.nome.charAt(0).toUpperCase()}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base sm:text-lg font-bold text-black truncate pr-2" title={turma.nome}>{turma.nome}</h3>
                                        <div className="flex items-center gap-3 text-xs sm:text-sm text-neutral-500 mt-0.5 sm:mt-1">
                                            <span className="flex items-center gap-1">
                                                <Icons.Users /> {turma.qtdAlunos || 0} <span className="hidden xs:inline">alunos</span>
                                            </span>
                                            <span className="text-neutral-300">•</span>
                                            <span className="flex items-center gap-1">
                                                <Icons.Calendar /> {new Date(turma.criacao).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => onSelectTurma(turma)}
                                        className="hidden sm:flex px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-bold hover:bg-orange-100 transition-colors"
                                    >
                                        Gerenciar
                                    </button>
                                    <button
                                        onClick={(e) => handleExcluir(turma.id, e)}
                                        className="w-10 h-10 bg-white border border-neutral-200 text-neutral-400 hover:text-black hover:border-red-200 hover:bg-red-50 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                                        title="Excluir Turma"
                                    >
                                        <Icons.Trash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal for New Class */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="bg-orange-600 p-6 text-white">
                            <h3 className="text-xl font-bold">Nova Turma</h3>
                            <p className="text-orange-200 text-sm">Preencha os dados abaixo</p>
                        </div>

                        <form onSubmit={handleCriarTurma} className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Nome da Turma</label>
                                <input
                                    type="text"
                                    value={nomeTurma}
                                    onChange={(e) => setNomeTurma(e.target.value)}
                                    placeholder="Ex: 3º Ano A - Matutino"
                                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-neutral-400 font-medium"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setNomeTurma('');
                                    }}
                                    className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-white rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-md transition-colors"
                                >
                                    Criar Turma
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TurmaManager;
