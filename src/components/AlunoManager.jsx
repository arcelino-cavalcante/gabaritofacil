import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { listarAlunosPorTurma, salvarAluno, excluirAluno, listarNotasPorAluno } from '../db';
import { useModal } from '../contexts/ModalContext';

// Icons
const Icons = {
    Back: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>,
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
    Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Upload: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    Download: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    Chart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
};

const AlunoManager = ({ turma, onBack }) => {
    const { showAlert, showConfirm } = useModal();
    const [alunos, setAlunos] = useState([]);
    const [nomeAluno, setNomeAluno] = useState('');
    const [view, setView] = useState('list'); // 'list' | 'import'
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        carregarAlunos();
    }, [turma]);

    const carregarAlunos = async () => {
        try {
            const lista = await listarAlunosPorTurma(turma.id);
            lista.sort((a, b) => a.nome.localeCompare(b.nome));

            // Para cada aluno, buscar as notas para exibir um mini-dashboard
            const listaComNotas = await Promise.all(lista.map(async (aluno) => {
                const notas = await listarNotasPorAluno(aluno.id);
                // Ordenar notas por data
                notas.sort((a, b) => new Date(b.data) - new Date(a.data));

                const ultimaNota = notas.length > 0 ? notas[0].nota : null;
                const media = notas.length > 0
                    ? notas.reduce((acc, curr) => acc + curr.nota, 0) / notas.length
                    : null;

                return {
                    ...aluno,
                    totalGabaritos: notas.length,
                    ultimaNota,
                    media
                };
            }));

            setAlunos(listaComNotas);
        } catch (error) {
            console.error('Erro ao carregar alunos:', error);
        }
    };

    const handleAdicionarAluno = async (e) => {
        e.preventDefault();
        if (!nomeAluno.trim()) return;

        try {
            await salvarAluno({
                nome: nomeAluno,
                turmaId: turma.id
            });
            setNomeAluno('');
            carregarAlunos();
        } catch (error) {
            console.error('Erro ao adicionar aluno:', error);
            await showAlert('Erro ao adicionar aluno');
        }
    };

    const handleExcluir = async (id) => {
        if (await showConfirm('Excluir este aluno?')) {
            try {
                await excluirAluno(id);
                setAlunos(alunos.filter(a => a.id !== id));
            } catch (error) {
                console.error('Erro ao excluir aluno:', error);
            }
        }
    };

    const baixarCSVNotasTurma = () => {
        let csvContent = "\uFEFF"; // BOM
        csvContent += "Nº,Nome do Estudante,Provas Realizadas,Última Nota,Média Geral\n";

        alunos.forEach((a, index) => {
            const provas = a.totalGabaritos || 0;
            const ultima = a.ultimaNota !== null ? a.ultimaNota.toFixed(1) : '-';
            const media = a.media !== null ? a.media.toFixed(1) : '-';

            csvContent += `${index + 1},"${a.nome}",${provas},${ultima},${media}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Notas_Gerais_${turma.nome}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                let count = 0;
                for (let i = 0; i < data.length; i++) {
                    const row = data[i];

                    if (!row || row.length === 0) continue;

                    let nomeIdx = row.length > 1 ? 1 : 0;
                    let nomeLido = row[nomeIdx];

                    if (nomeLido && typeof nomeLido === 'string') {
                        const nomeLimpo = nomeLido.trim();
                        if (
                            nomeLimpo.length > 0 &&
                            !nomeLimpo.toLowerCase().includes('nome do') &&
                            !nomeLimpo.toLowerCase().includes('estudante') &&
                            !nomeLimpo.toLowerCase().includes('aluno')
                        ) {
                            await salvarAluno({
                                nome: nomeLimpo,
                                turmaId: turma.id
                            });
                            count++;
                        }
                    }
                }

                await showAlert(`${count} alunos importados com sucesso!`);
                carregarAlunos();
                setView('list');
            } catch (error) {
                console.error('Erro ao importar:', error);
                await showAlert('Erro ao processar arquivo. Certifique-se de que é um Excel válido.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const baixarModelo = () => {
        let csvContent = "\uFEFF";
        csvContent += "Nº,Nome do Estudante\n";

        for (let i = 1; i <= 50; i++) {
            csvContent += `${i},\n`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Planilha_Alunos_${turma.nome}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredAlunos = alunos.filter(a =>
        a.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-neutral-50 font-sans text-black flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-neutral-500 hover:bg-neutral-50 hover:text-orange-600 rounded-full transition-colors"
                    >
                        <Icons.Back />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-neutral-800">{turma.nome}</h1>
                            <span className="bg-neutral-50 text-neutral-600 px-2 py-0.5 rounded-md text-xs font-bold border border-neutral-200">{alunos.length} alunos</span>
                        </div>
                        <p className="text-xs text-neutral-500">Gestão de Alunos</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-neutral-50 p-1 rounded-lg border border-neutral-200 w-full sm:w-auto">
                        <button
                            onClick={() => setView('list')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${view === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                        >
                            Lista
                        </button>
                        <button
                            onClick={() => setView('import')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${view === 'import' ? 'bg-white text-orange-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                        >
                            Importar
                        </button>
                    </div>
                </div>
            </div>

            <main className="flex-1 p-6 max-w-5xl mx-auto w-full">

                {view === 'list' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column 1: Add/Search */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                                <h3 className="font-bold text-neutral-800 mb-4 flex items-center gap-2">
                                    <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600"><Icons.Plus /></div>
                                    Adicionar Aluno
                                </h3>
                                <form onSubmit={handleAdicionarAluno}>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            value={nomeAluno}
                                            onChange={(e) => setNomeAluno(e.target.value)}
                                            placeholder="Ex: Ana Souza"
                                            className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <button className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-bold hover:bg-orange-700 shadow-sm transition-colors text-sm">
                                        Salvar Aluno
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                                <div className="relative mb-3">
                                    <input
                                        type="text"
                                        placeholder="Buscar aluno..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                    <div className="absolute left-3 top-2.5 text-neutral-400">
                                        <Icons.Search />
                                    </div>
                                </div>

                                {/* Export All Grades Button */}
                                <button
                                    onClick={baixarCSVNotasTurma}
                                    className="w-full bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Icons.Chart /> Exportar Desempenho (CSV)
                                </button>
                            </div>
                        </div>

                        {/* Column 2: List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-neutral-100 bg-white/50 flex justify-between items-center">
                                    <h3 className="font-bold text-neutral-700 text-sm">Lista de Alunos ({filteredAlunos.length})</h3>
                                    {searchTerm && (
                                        <span className="text-xs text-orange-600 font-medium cursor-pointer" onClick={() => setSearchTerm('')}>Limpar busca</span>
                                    )}
                                </div>

                                <div className="divide-y divide-neutral-100 max-h-[600px] overflow-y-auto">
                                    {filteredAlunos.length === 0 ? (
                                        <div className="p-12 text-center text-neutral-400">
                                            <p>{alunos.length === 0 ? 'Nenhum aluno cadastrado ainda.' : 'Nenhum aluno encontrado na busca.'}</p>
                                        </div>
                                    ) : (
                                        filteredAlunos.map((aluno, index) => (
                                            <div key={aluno.id} className="p-4 flex items-center justify-between hover:bg-white transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <span className="w-8 h-8 rounded-full bg-neutral-50 text-neutral-500 flex items-center justify-center text-xs font-bold font-mono">
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-semibold text-neutral-800">{aluno.nome}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {aluno.totalGabaritos > 0 ? (
                                                                <>
                                                                    <span className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                                                                        Média: {aluno.media.toFixed(1)}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
                                                                        Última Nota: {aluno.ultimaNota.toFixed(1)}
                                                                    </span>
                                                                    <span className="text-[10px] text-neutral-400">
                                                                        ({aluno.totalGabaritos} provas)
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">Nenhuma nota lida</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleExcluir(aluno.id)}
                                                    className="p-2 text-neutral-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    title="Excluir"
                                                >
                                                    <Icons.Trash />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'import' && (
                    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-neutral-800 mb-2">Importar Alunos</h2>
                            <p className="text-neutral-500">Adicione múltiplos alunos de uma vez usando uma planilha Excel.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col items-center text-center hover:border-orange-200 transition-colors">
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-4">
                                    <Icons.Download />
                                </div>
                                <h3 className="font-bold text-neutral-800 mb-2">1. Baixar Modelo</h3>
                                <p className="text-sm text-neutral-500 mb-6 flex-1">
                                    Use nossa planilha padrão para garantir que os dados sejam importados corretamente.
                                </p>
                                <button
                                    onClick={baixarModelo}
                                    className="w-full py-2.5 px-4 bg-white border border-orange-200 text-orange-600 font-bold rounded-lg hover:bg-orange-50 transition-colors"
                                >
                                    Baixar Planilha
                                </button>
                            </div>

                            <div className="p-6 bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col items-center text-center hover:border-orange-200 transition-colors">
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-4">
                                    <Icons.Upload />
                                </div>
                                <h3 className="font-bold text-neutral-800 mb-2">2. Enviar Arquivo</h3>
                                <p className="text-sm text-neutral-500 mb-6 flex-1">
                                    Selecione o arquivo preenchido (.xlsx ou .csv) para processar.
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="w-full py-2.5 px-4 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-md transition-colors"
                                >
                                    Selecionar Arquivo
                                </button>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 text-sm text-yellow-800">
                            <svg className="w-5 h-5 flex-shrink-0 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <p>
                                <strong>Importante:</strong> Certifique-se de que a primeira linha da planilha contém o cabeçalho "Nome do Aluno". Linhas vazias serão ignoradas.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AlunoManager;
