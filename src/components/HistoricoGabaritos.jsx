import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { listarGabaritos, excluirGabarito, duplicarGabarito, listarTurmas, listarAlunosPorTurma, listarCabecalhos, salvarGabarito } from '../db';
import { gerarPDFGabarito } from '../utils/pdfGenerator';
import DownloadOptionsModal from './DownloadOptionsModal';
import GabaritoViewModal from './GabaritoViewModal';
import { useModal } from '../contexts/ModalContext';

// Icons
const IconTrash = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconBack = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>;
const IconDownload = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const IconDuplicate = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>;
const IconPlay = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconPlus = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>;
const IconBolt = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconUsers = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const IconEye = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;

const HistoricoGabaritos = ({ onBack, onSelectGabarito, onNavigate, onCriarParaTurma }) => {
    const { showAlert, showConfirm } = useModal();
    const [gabaritos, setGabaritos] = useState([]);
    const [turmas, setTurmas] = useState([]);
    const [showCreateOptions, setShowCreateOptions] = useState(false);
    const [showTurmaSelector, setShowTurmaSelector] = useState(false);
    const [cabecalhos, setCabecalhos] = useState([]);
    // State for modals
    const [gabaritoToDownload, setGabaritoToDownload] = useState(null);
    const [gabaritoToView, setGabaritoToView] = useState(null);
    const [gabaritoToClone, setGabaritoToClone] = useState(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            const [listaGabaritos, listaTurmas, listaCabecalhos] = await Promise.all([
                listarGabaritos(),
                listarTurmas(),
                listarCabecalhos()
            ]);
            setGabaritos(listaGabaritos.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao)));
            setTurmas(listaTurmas);
            setCabecalhos(listaCabecalhos);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    };

    const getNomeTurma = (turmaId) => {
        const turma = turmas.find(t => t.id === turmaId);
        return turma ? turma.nome : 'Sem Turma';
    };

    const handleExcluir = async (id, e) => {
        e.stopPropagation();
        if (await showConfirm('Deseja realmente excluir este gabarito?')) {
            try {
                await excluirGabarito(id);
                setGabaritos(gabaritos.filter(g => g.id !== id));
            } catch (error) {
                console.error('Erro ao excluir:', error);
                await showAlert('Erro ao excluir gabarito');
            }
        }
    };

    const handleCreateOption = (type) => {
        setShowCreateOptions(false);
        if (type === 'rapida') {
            // Navegar para correção rápida
            onNavigate('correcao-rapida');
        } else if (type === 'turma') {
            // Abrir seletor de turma (modo criar novo)
            setGabaritoToClone(null);
            setShowTurmaSelector(true);
        }
    }

    const handleCloneClick = (gabarito, e) => {
        e.stopPropagation();
        setGabaritoToClone(gabarito);
        setShowTurmaSelector(true);
    };

    const handleViewClick = (gabarito, e) => {
        e.stopPropagation();
        setGabaritoToView(gabarito);
    };

    const handleTurmaSelect = async (turma) => {
        setShowTurmaSelector(false);

        if (gabaritoToClone) {
            // Lógica de Clonagem
            try {
                // Criar novo objeto gabarito baseado no original
                const novoGabarito = {
                    nome: gabaritoToClone.nome, // Mantém mesmo nome
                    tipo: 'nominal',
                    turmaId: turma.id,
                    cabecalhoId: gabaritoToClone.cabecalhoId,
                    questoes: gabaritoToClone.questoes,
                    dataCriacao: new Date().toISOString(),
                    dataProva: new Date().toISOString().split('T')[0] // Data de hoje
                };

                // Importar salvarGabarito no topo se não estiver
                // Oops, need to ensure salvarGabarito is imported.
                // Assuming it is available in ../db or similar. 
                // Let's check imports in next steps or assume user adds it.
                // Actually, I should have added it in imports. 
                // Let's modify imports in a separate call or previous call?
                // I already added it in the previous step? No, I added only GabaritoViewModal.
                // I need to add salvarGabarito to imports.

                // For now, let's write the logic, and I will fix imports after.

                // This function needs salvarGabarito.
                // I will add it to the import list in a separate edit or verify it exists.
                // Checking previous file content... line 3 has: listarGabaritos, excluirGabarito, duplicarGabarito...
                // It does NOT have salvarGabarito.

                // So I will use duplicarGabarito? No, duplicarGabarito might just clone in place.
                // Let's see db.js.
                // I will assume salvarGabarito exists or I can use a custom logic here.
                // Ideally I should import { salvarGabarito } from '../db'.

                // Let's just put the logic here assuming salvarGabarito is imported.

                // Wait, if I use `duplicarGabarito` maybe I can pass overrides?
                // `duplicarGabarito(id)` usually just copies.
                // Better to create new.

                // I will add the code here and then fix imports.
                const { salvarGabarito } = await import('../db'); // Dynamic import to be safe? No, better standard.

                const id = await salvarGabarito(novoGabarito);
                novoGabarito.id = id;

                await showAlert(`Gabarito clonado com sucesso para a turma ${turma.nome}!`);
                carregarDados();

            } catch (error) {
                console.error("Erro ao clonar gabarito:", error);
                await showAlert("Erro ao clonar gabarito.");
            }
            setGabaritoToClone(null);
        } else {
            // Lógica original
            if (onCriarParaTurma) {
                onCriarParaTurma(turma);
            } else {
                console.error('Função onCriarParaTurma não fornecida!');
                onNavigate('turmas');
            }
        }
    }

    const handleDownloadClick = (gabarito, e) => {
        e.stopPropagation();
        setGabaritoToDownload(gabarito);
    };

    const handleConfirmDownload = async (layout) => {
        if (!gabaritoToDownload) return;

        try {
            const gabarito = gabaritoToDownload;
            const turma = turmas.find(t => t.id === gabarito.turmaId);
            const cabecalho = cabecalhos.find(c => c.id === gabarito.cabecalhoId);

            let alunos = [];
            if (gabarito.tipo === 'nominal' && gabarito.turmaId) {
                alunos = await listarAlunosPorTurma(gabarito.turmaId);
            }

            const doc = gerarPDFGabarito(gabarito, turma, alunos, cabecalho, layout);
            doc.save(`Gabarito_${gabarito.nome}_${layout}x.pdf`);

        } catch (error) {
            console.error("Erro ao baixar PDF:", error);
            await showAlert("Erro ao gerar arquivo PDF.");
        } finally {
            setGabaritoToDownload(null);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-black pb-20 relative">

            {/* Turma Selector Modal */}
            {showTurmaSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-white">
                            <h3 className="font-bold text-lg text-neutral-800">Selecione a Turma</h3>
                            <button onClick={() => setShowTurmaSelector(false)} className="text-neutral-400 hover:text-neutral-600 p-1">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-2">
                            {turmas.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-neutral-500 mb-4">Nenhuma turma cadastrada.</p>
                                    <button
                                        onClick={() => { setShowTurmaSelector(false); onNavigate('turmas'); }}
                                        className="text-orange-600 font-bold hover:underline"
                                    >
                                        Criar Turma
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {turmas.map(turma => (
                                        <button
                                            key={turma.id}
                                            onClick={() => handleTurmaSelect(turma)}
                                            className="w-full text-left p-4 rounded-xl hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center gap-3 group border border-transparent hover:border-orange-100"
                                        >
                                            <div className="w-10 h-10 bg-neutral-50 text-neutral-500 rounded-lg flex items-center justify-center font-bold group-hover:bg-orange-200 group-hover:text-orange-800 transition-colors shrink-0">
                                                {turma.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-neutral-800">{turma.nome}</h4>
                                                <p className="text-xs text-neutral-400 group-hover:text-orange-500 transition-colors">Clique para criar gabarito</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-neutral-200 px-4 py-4 sticky top-0 z-10 flex items-center justify-between gap-3 shadow-sm safe-top">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-50 rounded-full transition-colors"
                    >
                        <IconBack />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-black">Meus Gabaritos</h1>
                        <p className="text-xs text-neutral-500">{gabaritos.length} salvos</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateOptions(!showCreateOptions)}
                    className={`p-2 rounded-lg transition-all ${showCreateOptions ? 'bg-orange-100 text-orange-700' : 'bg-orange-600 text-white shadow-md hover:bg-orange-700'}`}
                >
                    <IconPlus />
                </button>
            </header>

            {/* Create Options Expandable Panel */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showCreateOptions ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-white border-b border-neutral-200 p-4 grid grid-cols-2 gap-3 shadow-inner">
                    <button
                        onClick={() => handleCreateOption('rapida')}
                        className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col items-center gap-2 hover:border-orange-300 hover:shadow-md transition-all active:scale-95 group"
                    >
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <IconBolt />
                        </div>
                        <span className="text-xs font-bold text-neutral-700">Correção Rápida</span>
                    </button>
                    <button
                        onClick={() => handleCreateOption('turma')}
                        className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col items-center gap-2 hover:border-orange-300 hover:shadow-md transition-all active:scale-95 group"
                    >
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <IconUsers />
                        </div>
                        <span className="text-xs font-bold text-neutral-700">Para Turma</span>
                    </button>
                </div>
            </div>

            <main className="max-w-3xl mx-auto p-4 space-y-4">
                {gabaritos.length === 0 ? (
                    <div className="text-center py-16 px-6">
                        <div className="w-16 h-16 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-neutral-300">
                            <IconPlus />
                        </div>
                        <h3 className="text-black font-bold mb-1">Vamos começar?</h3>
                        <p className="text-neutral-500 text-sm mb-6">Crie seu primeiro gabarito clicando no botão + acima.</p>
                        <button
                            onClick={() => setShowCreateOptions(true)}
                            className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-orange-700 transition-colors animate-pulse"
                        >
                            Criar Gabarito
                        </button>
                    </div>
                ) : (
                    gabaritos.map((gabarito) => (
                        <div
                            key={gabarito.id}
                            onClick={() => onSelectGabarito(gabarito)}
                            className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:border-orange-200 group relative overflow-hidden"
                        >
                            {/* Color Bar Indicator */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${gabarito.tipo === 'nominal' ? 'bg-orange-500' : 'bg-neutral-300'}`}></div>

                            <div className="pl-3 flex flex-col gap-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-black text-lg leading-tight line-clamp-1 pr-2">{gabarito.nome}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap ${gabarito.tipo === 'nominal' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-neutral-50 text-neutral-500 border border-neutral-200'}`}>
                                        {gabarito.tipo === 'nominal' ? 'Turma' : 'Rápida'}
                                    </span>
                                </div>

                                <p className="text-sm text-neutral-500 mb-3 truncate">
                                    {gabarito.tipo === 'nominal' ? getNomeTurma(gabarito.turmaId) : 'Sem turma vinculada'} • {new Date(gabarito.dataCriacao).toLocaleDateString('pt-BR')}
                                </p>

                                {/* Action Buttons Row */}
                                <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => onSelectGabarito(gabarito)}
                                        className="flex-1 bg-orange-600 text-white text-sm font-bold py-2.5 rounded-xl shadow-sm hover:bg-orange-700 flex items-center justify-center gap-2 transition-colors active:bg-orange-800"
                                    >
                                        <IconPlay /> Corrigir Agora
                                    </button>

                                    <button
                                        onClick={(e) => handleExcluir(gabarito.id, e)}
                                        className="w-12 h-10 bg-white border border-neutral-200 text-neutral-400 hover:text-black hover:border-red-200 hover:bg-red-50 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                                        title="Excluir"
                                    >
                                        <IconTrash />
                                    </button>

                                    <button
                                        onClick={(e) => handleViewClick(gabarito, e)}
                                        className="w-12 h-10 bg-white border border-neutral-200 text-neutral-400 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                                        title="Ver Respostas"
                                    >
                                        <IconEye />
                                    </button>

                                    <button
                                        onClick={(e) => handleCloneClick(gabarito, e)}
                                        className="w-12 h-10 bg-white border border-neutral-200 text-neutral-400 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                                        title="Clonar para Turma"
                                    >
                                        <IconDuplicate />
                                    </button>

                                    <button
                                        onClick={(e) => handleDownloadClick(gabarito, e)}
                                        className="w-12 h-10 bg-white border border-neutral-200 text-neutral-400 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                                        title="Baixar PDF"
                                    >
                                        <IconDownload />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>
            {/* Modal de Download */}
            {gabaritoToDownload && (
                <DownloadOptionsModal
                    onClose={() => setGabaritoToDownload(null)}
                    onConfirm={handleConfirmDownload}
                    title={`Baixar: ${gabaritoToDownload.nome}`}
                />
            )}

            {/* Modal de Visualização */}
            {gabaritoToView && (
                <GabaritoViewModal
                    gabarito={gabaritoToView}
                    onClose={() => setGabaritoToView(null)}
                />
            )}
        </div>
    );
};

export default HistoricoGabaritos;
