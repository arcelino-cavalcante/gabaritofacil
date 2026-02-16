import React, { useState, useEffect } from 'react';
import { listarCabecalhos, salvarCabecalho, excluirCabecalho } from '../db';
import { useModal } from '../contexts/ModalContext';

// Icons
const Icons = {
    Back: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>,
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
    Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    School: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
};

const CabecalhoManager = ({ onBack }) => {
    const { showAlert, showConfirm } = useModal();
    const [cabecalhos, setCabecalhos] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ escola: '', professor: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarCabecalhos();
    }, []);

    const carregarCabecalhos = async () => {
        setLoading(true);
        try {
            const lista = await listarCabecalhos();
            setCabecalhos(lista);
        } catch (error) {
            console.error('Erro ao carregar:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        if (!formData.escola.trim() && !formData.professor.trim()) {
            await showAlert('Preencha pelo menos o nome da Escola ou do Professor.');
            return;
        }

        try {
            await salvarCabecalho({ ...formData, id: editingId }); // Se editingId for null, db cria novo ID
            setFormData({ escola: '', professor: '' });
            setEditingId(null);
            setShowForm(false);
            carregarCabecalhos();
            await showAlert('Cabeçalho salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            await showAlert('Erro ao salvar cabeçalho.');
        }
    };

    const handleEdit = (cabecalho) => {
        setFormData({ escola: cabecalho.escola, professor: cabecalho.professor });
        setEditingId(cabecalho.id);
        setShowForm(true);
    };

    const handleExcluir = async (id, e) => {
        e.stopPropagation();
        const confirmado = await showConfirm('Deseja realmente excluir este cabeçalho?', 'Excluir');
        if (confirmado) {
            try {
                await excluirCabecalho(id);
                carregarCabecalhos();
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 font-sans text-black flex flex-col">
            {/* Toolbar */}
            <div className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-neutral-500 hover:bg-neutral-50 hover:text-orange-600 rounded-full transition-colors"
                    >
                        <Icons.Back />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-neutral-800">Meus Cabeçalhos</h1>
                        <p className="text-xs text-neutral-500 hidden sm:block">Gerencie escolas e professores para impressão</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setFormData({ escola: '', professor: '' });
                        setEditingId(null);
                        setShowForm(true);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all"
                >
                    <Icons.Plus /> <span className="hidden sm:inline">Novo</span>
                </button>
            </div>

            <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto"></div>
                    </div>
                ) : cabecalhos.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200 border-dashed">
                        <div className="w-16 h-16 bg-white text-neutral-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icons.School />
                        </div>
                        <h3 className="text-black font-bold mb-1">Nenhum cabeçalho salvo</h3>
                        <p className="text-neutral-500 text-sm mb-6">Cadastre escolas e professores para agilizar seus gabaritos.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="text-orange-600 font-bold hover:underline"
                        >
                            Criar Agora
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cabecalhos.map((c) => (
                            <div key={c.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                                        <Icons.School />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-800 text-lg">{c.escola || "Sem Escola"}</h3>
                                        {c.professor && (
                                            <div className="flex items-center gap-1 text-sm text-neutral-500">
                                                <Icons.User /> Prof. {c.professor}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(c)}
                                        className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-white rounded-lg transition-colors"
                                    >
                                        <Icons.Edit />
                                    </button>
                                    <button
                                        onClick={(e) => handleExcluir(c.id, e)}
                                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                                    >
                                        <Icons.Trash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="bg-orange-600 p-6 text-white">
                            <h3 className="text-xl font-bold">{editingId ? 'Editar Cabeçalho' : 'Novo Cabeçalho'}</h3>
                        </div>

                        <form onSubmit={handleSalvar} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Escola / Instituição</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.escola}
                                        onChange={(e) => setFormData({ ...formData, escola: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                        placeholder="Nome da Escola"
                                        autoFocus
                                    />
                                    <div className="absolute left-3 top-3.5 text-neutral-400"><Icons.School /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Professor</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.professor}
                                        onChange={(e) => setFormData({ ...formData, professor: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                        placeholder="Nome do Professor"
                                    />
                                    <div className="absolute left-3 top-3.5 text-neutral-400"><Icons.User /></div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-5 py-2.5 text-neutral-600 font-bold hover:bg-white rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-md"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CabecalhoManager;
