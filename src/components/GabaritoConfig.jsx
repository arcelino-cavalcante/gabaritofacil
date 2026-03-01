import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { jsPDF as _jsPDF } from 'jspdf'; // Aliasing so it doesn't conflict
import { PDFGenerator } from '../services/PDFGenerator';
import { salvarGabarito, listarTurmas, listarAlunosPorTurma, salvarCabecalho, listarCabecalhos, excluirCabecalho, buscarTurma } from '../db';
import { useModal } from '../contexts/ModalContext';
import DownloadOptionsModal from './DownloadOptionsModal';

// Icons
const Icons = {
    Back: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>,
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
    Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Download: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
    Save: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
    School: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    Calendar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
};

const GabaritoConfig = ({ modo, turmaSelecionada, onBack, onGabaritoSalvo }) => {
    const { showAlert, showConfirm } = useModal();
    const [nomeGabarito, setNomeGabarito] = useState('');
    const [turmas, setTurmas] = useState([]);
    const [turmaId, setTurmaId] = useState(turmaSelecionada ? turmaSelecionada.id : '');
    const [questoes, setQuestoes] = useState(Array.from({ length: 10 }, (_, i) => ({ id: i + 1, alternatives: 5, correct: 'A' })));
    const [isGenerating, setIsGenerating] = useState(false);

    // Header Management States
    const [cabecalhos, setCabecalhos] = useState([]);
    const [selectedCabecalhoId, setSelectedCabecalhoId] = useState('');
    const [dataProva, setDataProva] = useState('');
    const [showCabecalhoModal, setShowCabecalhoModal] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [novoCabecalho, setNovoCabecalho] = useState({ escola: '', professor: '' });

    useEffect(() => {
        carregarTurmas();
        carregarCabecalhos();
    }, []);

    const carregarTurmas = async () => {
        try {
            const lista = await listarTurmas();
            setTurmas(lista);
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
        }
    };

    const carregarCabecalhos = async () => {
        try {
            const lista = await listarCabecalhos();
            setCabecalhos(lista);
            // Auto-select last created if available and none selected
            if (lista.length > 0 && !selectedCabecalhoId) {
                // Could select the most recent one or the first one. Let's select the first for now.
                setSelectedCabecalhoId(lista[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar cabeçalhos:', error);
        }
    };

    const handleSalvarNovoCabecalho = async () => {
        if (!novoCabecalho.escola.trim() && !novoCabecalho.professor.trim()) {
            await showAlert('Preencha pelo menos o nome da Escola ou do Professor.');
            return;
        }

        try {
            const salvo = await salvarCabecalho(novoCabecalho);
            await carregarCabecalhos();
            setSelectedCabecalhoId(salvo.id);
            setNovoCabecalho({ escola: '', professor: '' });
            setShowCabecalhoModal(false);
        } catch (error) {
            console.error('Erro ao salvar cabeçalho:', error);
            await showAlert('Erro ao salvar cabeçalho.');
        }
    };

    const handleExcluirCabecalho = async (e) => {
        e.stopPropagation(); // Stop click from propagating if inside select? No, this will be a separate button.
        if (!selectedCabecalhoId) return;

        const confirm = await showConfirm('Deseja excluir este cabeçalho salvo?', 'Excluir Cabeçalho');
        if (confirm) {
            try {
                await excluirCabecalho(selectedCabecalhoId);
                setSelectedCabecalhoId('');
                await carregarCabecalhos();
            } catch (error) {
                console.error('Erro ao excluir:', error);
            }
        }
    };

    const addQuestion = () => {
        const newId = questoes.length + 1;
        setQuestoes([...questoes, { id: newId, alternatives: 5, correct: 'A' }]);
    };

    const removeQuestion = (id) => {
        if (questoes.length > 1) {
            setQuestoes(questoes.filter(q => q.id !== id).map((q, i) => ({ ...q, id: i + 1 })));
        }
    };

    const updateQuestion = (id, field, value) => {
        setQuestoes(questoes.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const handleSalvarGabarito = async () => {
        if (!nomeGabarito.trim()) {
            await showAlert('Dê um nome para o gabarito');
            return;
        }

        if (modo === 'nominal' && !turmaId) {
            await showAlert('Selecione uma turma para este gabarito');
            return;
        }

        const novoGabarito = {
            nome: nomeGabarito,
            tipo: modo,
            turmaId: turmaId || null,
            questoes: questoes,
            cabecalhoId: selectedCabecalhoId || null, // Salva a escolha do cabeçalho
            dataProva: dataProva || null, // Salva a data da prova se houver
            dataCriacao: new Date().toISOString()
        };

        try {
            const savedGabarito = await salvarGabarito(novoGabarito);
            await showAlert('Gabarito salvo e pronto para uso!');
            onGabaritoSalvo();
            return savedGabarito;
        } catch (error) {
            console.error('Erro ao salvar:', error);
            await showAlert('Erro ao salvar gabarito');
        }
    };

    const handleGerarPDFClick = () => {
        setShowDownloadModal(true);
    };

    const handleConfirmGerarPDF = async (layout) => {
        setIsGenerating(true);
        // Simulação de delay
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            // Em vez de gerar localmente, nós primeiro SALVAMOS o gabarito no banco via API
            // Para então obter o ID oficial e disparar o download com o python
            const novoGabaritoData = {
                nome: nomeGabarito,
                tipo: modo,
                turmaId: turmaId || null,
                questoes: questoes,
                cabecalhoId: selectedCabecalhoId || null,
                dataProva: dataProva || null,
                dataCriacao: new Date().toISOString()
            };

            const saved = await salvarGabarito(novoGabaritoData);

            let tNome = "Sem Turma";
            if (turmaId) {
                const turmaObj = await buscarTurma(turmaId);
                if (turmaObj) tNome = turmaObj.nome;
            }

            const numQ = saved.questoes ? saved.questoes.length : 20;
            let alunos = [];
            if (turmaId) {
                alunos = await listarAlunosPorTurma(turmaId);
            }

            const doc = await PDFGenerator.buildGabaritoPDF(
                tNome,
                alunos.map(a => ({ id: a.id, nome: a.nome })),
                saved.id,
                numQ,
                layout
            );

            const blob = doc.output('blob');
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Gabaritos_${tNome || 'Avulso'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            onGabaritoSalvo();

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            await showAlert("Erro ao gerar PDF.");
        } finally {
            setIsGenerating(false);
            setShowDownloadModal(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 font-sans text-black pb-24">
            {/* Header */}
            <div className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-neutral-500 hover:bg-neutral-50 hover:text-orange-600 rounded-full transition-colors"
                    >
                        <Icons.Back />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-neutral-800">Novo Gabarito</h1>
                        <p className="text-xs text-neutral-500 hidden sm:block">Configure o gabarito oficial da prova</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSalvarGabarito}
                        className="px-4 py-2 bg-white border border-neutral-200 text-neutral-700 font-bold rounded-lg hover:border-orange-300 hover:text-orange-600 transition-colors shadow-sm"
                    >
                        Salvar Rascunho
                    </button>
                    <button
                        onClick={handleGerarPDFClick}
                        disabled={!nomeGabarito.trim() || isGenerating}
                        title={!nomeGabarito.trim() ? "Preencha o nome da prova para gerar o PDF" : "Gerar PDF"}
                        className={`px-4 py-2 font-bold rounded-lg shadow-md transition-colors flex items-center gap-2 
                            ${!nomeGabarito.trim() || isGenerating
                                ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none'
                                : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                    >
                        {isGenerating ? <div className="w-4 h-4 rounded-full border-2 border-neutral-500/30 border-t-neutral-500 animate-spin"></div> : <Icons.Download />}
                        <span>Gerar PDF</span>
                    </button>
                </div>
            </div>

            <main className="max-w-6xl mx-auto p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Settings */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Info da Prova */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 sticky top-24">
                            <h2 className="font-bold text-neutral-800 mb-6 flex items-center gap-2 text-lg">
                                <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                                Informações Básicas
                            </h2>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-neutral-600 mb-2">Nome da Prova</label>
                                    <input
                                        type="text"
                                        value={nomeGabarito}
                                        onChange={(e) => setNomeGabarito(e.target.value)}
                                        placeholder="Ex: Matemática - 1º Bimestre"
                                        className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                                        autoFocus
                                    />
                                </div>

                                {modo === 'nominal' && (
                                    <div>
                                        <label className="block text-sm font-bold text-neutral-600 mb-2">Turma</label>
                                        <select
                                            value={turmaId}
                                            onChange={(e) => setTurmaId(parseInt(e.target.value))}
                                            className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium appearance-none"
                                        >
                                            <option value="">Selecione uma turma...</option>
                                            {turmas.map(t => (
                                                <option key={t.id} value={t.id}>{t.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-neutral-100">
                                    <label className="block text-sm font-bold text-neutral-600 mb-3">Cabeçalho (Escola/Professor)</label>

                                    {cabecalhos.length > 0 ? (
                                        <div className="space-y-3">
                                            <select
                                                value={selectedCabecalhoId}
                                                onChange={(e) => setSelectedCabecalhoId(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all"
                                            >
                                                <option value="">Sem cabeçalho (apenas título)</option>
                                                {cabecalhos.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.escola} {c.professor ? `- Prof. ${c.professor}` : ''}
                                                    </option>
                                                ))}
                                            </select>

                                            {selectedCabecalhoId && (
                                                <button
                                                    onClick={handleExcluirCabecalho}
                                                    className="text-xs text-black hover:underline flex items-center gap-1"
                                                >
                                                    <Icons.Trash /> Excluir este cabeçalho
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-neutral-400 italic mb-2">Nenhum cabeçalho salvo.</div>
                                    )}

                                    <button
                                        onClick={() => setShowCabecalhoModal(true)}
                                        className="mt-3 w-full py-2 bg-orange-50 text-orange-600 font-bold rounded-lg text-sm hover:bg-orange-100 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Icons.Plus /> Novo Cabeçalho
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-neutral-600 mb-2">Data da Prova <span className="text-neutral-400 font-normal">(Opcional)</span></label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={dataProva}
                                            onChange={(e) => setDataProva(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-neutral-600"
                                        />
                                        <div className="absolute right-4 top-3.5 text-neutral-400 pointer-events-none">
                                            <Icons.Calendar />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icons.Check />
                                    <span className="font-bold text-neutral-700">Total de Questões</span>
                                </div>
                                <span className="text-2xl font-black text-orange-600">{questoes.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Questions Grid */}
                    <div className="lg:col-span-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 min-h-[500px]">
                            <h2 className="font-bold text-neutral-800 mb-6 flex items-center justify-between text-lg">
                                <div className="flex items-center gap-2">
                                    <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                                    Gabarito Oficial
                                </div>
                                <span className="text-xs font-normal text-neutral-500 bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-200">
                                    Marque a resposta correta de cada questão
                                </span>
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {questoes.map((q) => (
                                    <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:shadow-sm transition-all bg-white/50">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 flex items-center justify-center font-bold text-neutral-400 bg-white rounded-lg border border-neutral-200 text-sm">
                                                {q.id}
                                            </span>
                                            <div className="flex gap-1">
                                                {['A', 'B', 'C', 'D', 'E'].slice(0, q.alternatives).map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => updateQuestion(q.id, 'correct', opt)}
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${q.correct === opt
                                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-200 scale-105'
                                                            : 'bg-white text-neutral-400 border border-neutral-200 hover:border-orange-300 hover:text-orange-500'
                                                            }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeQuestion(q.id)}
                                            className="text-neutral-300 hover:text-black p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                            title="Remover questão"
                                        >
                                            <Icons.Trash />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addQuestion}
                                className="w-full mt-6 py-4 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-400 font-bold hover:bg-white hover:border-orange-300 hover:text-orange-600 transition-all flex items-center justify-center gap-2 group"
                            >
                                <div className="bg-neutral-50 p-1 rounded-full group-hover:bg-orange-100 text-neutral-400 group-hover:text-orange-600 transition-colors">
                                    <Icons.Plus />
                                </div>
                                Adicionar Mais Questões
                            </button>
                        </div>
                    </div>

                </div>
            </main>

            {/* Modal Criar Cabeçalho */}
            {showCabecalhoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="bg-orange-600 p-6 text-white">
                            <h3 className="text-xl font-bold">Novo Cabeçalho</h3>
                            <p className="text-orange-200 text-sm">Cadastre uma escola ou professor para usar nos gabaritos</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Nome da Escola / Instituição</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={novoCabecalho.escola}
                                        onChange={(e) => setNovoCabecalho({ ...novoCabecalho, escola: e.target.value })}
                                        placeholder="Ex: Escola Estadual..."
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        autoFocus
                                    />
                                    <div className="absolute left-3 top-3.5 text-neutral-400"><Icons.School /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Nome do Professor (Opcional)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={novoCabecalho.professor}
                                        onChange={(e) => setNovoCabecalho({ ...novoCabecalho, professor: e.target.value })}
                                        placeholder="Ex: Prof. João Silva"
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    />
                                    <div className="absolute left-3 top-3.5 text-neutral-400"><Icons.User /></div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowCabecalhoModal(false)}
                                className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-white rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSalvarNovoCabecalho}
                                className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-md transition-colors"
                            >
                                Salvar Cabeçalho
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Download Options */}
            {showDownloadModal && (
                <DownloadOptionsModal
                    onClose={() => setShowDownloadModal(false)}
                    onConfirm={handleConfirmGerarPDF}
                    title="Gerar Gabarito"
                />
            )}
        </div>
    );
};

export default GabaritoConfig;
