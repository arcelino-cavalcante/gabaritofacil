import React, { useState, useEffect } from 'react';
import { listarNotasPorGabarito, listarAlunosPorTurma } from '../db';

const GabaritoViewModal = ({ gabarito, onClose }) => {
    const [activeTab, setActiveTab] = useState('respostas'); // 'respostas' or 'notas'
    const [alunosComNota, setAlunosComNota] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (gabarito && activeTab === 'notas' && gabarito.tipo === 'nominal') {
            carregarNotas();
        }
    }, [activeTab, gabarito]);

    const carregarNotas = async () => {
        setLoading(true);
        try {
            const [notas, alunos] = await Promise.all([
                listarNotasPorGabarito(gabarito.id),
                listarAlunosPorTurma(gabarito.turmaId)
            ]);

            // Merge students with their notes
            const combinados = alunos.map(aluno => {
                const notaDoAluno = notas.find(n => n.alunoId === aluno.id);
                return {
                    ...aluno,
                    acertos: notaDoAluno ? notaDoAluno.acertos : null,
                    nota: notaDoAluno ? notaDoAluno.nota : null,
                    dataLeitura: notaDoAluno ? notaDoAluno.data : null
                };
            });

            // Ordena alfabeticamente
            combinados.sort((a, b) => a.nome.localeCompare(b.nome));
            setAlunosComNota(combinados);
        } catch (error) {
            console.error("Erro ao carregar notas:", error);
        } finally {
            setLoading(false);
        }
    };

    const baixarCSVNotas = () => {
        let csvContent = "\uFEFF"; // BOM
        csvContent += "Nº,Nome do Estudante,Acertos,Nota Final\n";

        alunosComNota.forEach((a, index) => {
            const acertos = a.acertos !== null ? a.acertos : 'Faltou/Não lido';
            const nota = a.nota !== null ? a.nota : '-';
            csvContent += `${index + 1},"${a.nome}",${acertos},${nota}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Notas_${gabarito.nome}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!gabarito) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-white p-6 border-b border-neutral-100 flex justify-between items-center sticky top-0 z-10 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-neutral-800">Detalhes do Gabarito</h3>
                        <p className="text-neutral-500 text-sm truncate max-w-[300px] font-medium">{gabarito.nome}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-neutral-50 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                {gabarito.tipo === 'nominal' && (
                    <div className="flex border-b border-neutral-100 px-6 shrink-0 bg-neutral-50/50">
                        <button
                            onClick={() => setActiveTab('respostas')}
                            className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'respostas' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
                        >
                            Respostas Oficiais
                        </button>
                        <button
                            onClick={() => setActiveTab('notas')}
                            className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'notas' ? 'border-orange-600 text-orange-600' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            Desempenho da Turma
                        </button>
                    </div>
                )}

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1 bg-neutral-50/20">

                    {activeTab === 'respostas' ? (
                        <>
                            <div className="grid grid-cols-5 md:grid-cols-8 gap-3 mb-6">
                                {gabarito.questoes.map((q) => (
                                    <div key={q.id} className="flex flex-col items-center p-2 rounded-xl bg-white border border-neutral-200 shadow-sm">
                                        <span className="text-[11px] font-bold text-neutral-400 mb-1">Q {q.id}</span>
                                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                                            {q.correct}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="text-center">
                                <div className="inline-block px-4 py-2 bg-neutral-100 rounded-lg text-xs text-neutral-600 font-bold border border-neutral-200">
                                    Total de {gabarito.questoes.length} questões
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-10 text-neutral-500 font-medium">Buscando notas no banco de dados...</div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-100 mb-2">
                                        <div>
                                            <h4 className="font-bold text-orange-800 text-sm">Quadro de Notas</h4>
                                            <p className="text-xs text-orange-600">Alunos que já tiveram seus gabaritos lidos</p>
                                        </div>
                                        <button
                                            onClick={baixarCSVNotas}
                                            className="px-4 py-2 bg-white border border-orange-200 text-orange-600 font-bold rounded-lg text-xs hover:bg-orange-50 transition-colors shadow-sm flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Exportar Planilha CSV
                                        </button>
                                    </div>

                                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                                        <div className="max-h-[350px] overflow-y-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-neutral-500 bg-neutral-50 uppercase sticky top-0 border-b border-neutral-200">
                                                    <tr>
                                                        <th className="px-4 py-3 font-bold w-12 text-center">Nº</th>
                                                        <th className="px-4 py-3 font-bold">Nome do Aluno</th>
                                                        <th className="px-4 py-3 font-bold text-center">Acertos</th>
                                                        <th className="px-4 py-3 font-bold text-center">Nota</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-100">
                                                    {alunosComNota.map((aluno, index) => (
                                                        <tr key={aluno.id} className="hover:bg-neutral-50 transition-colors">
                                                            <td className="px-4 py-3 text-center text-neutral-400 font-bold">{index + 1}</td>
                                                            <td className="px-4 py-3 font-medium text-neutral-800">{aluno.nome}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                {aluno.acertos !== null ? (
                                                                    <span className="inline-flex bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-mono text-xs font-bold border border-neutral-200">
                                                                        {aluno.acertos}/{gabarito.questoes.length}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-neutral-300 text-xs italic">Não lido</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {aluno.nota !== null ? (
                                                                    <span className={`inline-flex px-2 py-0.5 rounded font-bold text-xs ${aluno.nota >= 6 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                                        {aluno.nota.toFixed(1)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-neutral-300">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {alunosComNota.length === 0 && (
                                                <div className="p-8 text-center text-neutral-500 italic text-sm">
                                                    Nenhum aluno cadastrado nesta turma.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-100 bg-white shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-neutral-100 text-neutral-700 font-bold rounded-xl hover:bg-neutral-200 transition-all border border-neutral-200"
                    >
                        Fechar Janela
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GabaritoViewModal;
