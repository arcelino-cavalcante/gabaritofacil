import React, { useState, useEffect } from 'react';
import { listarTurmas, listarGabaritos, initDB } from '../db';

// Icons
const Icons = {
    Bolt: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Users: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    History: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Chart: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
    School: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    Book: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
};

const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between">
        <div>
            <p className="text-neutral-500 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-neutral-800">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
        </div>
    </div>
);

const ActionButton = ({ title, desc, icon, onClick, primary = false }) => (
    <button
        onClick={onClick}
        className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all group text-left ${primary
            ? 'bg-orange-600 text-white shadow-md hover:bg-orange-700 hover:shadow-lg'
            : 'bg-white hover:bg-white border border-neutral-200 hover:border-neutral-300'
            }`}
    >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${primary ? 'bg-white/20' : 'bg-neutral-50 group-hover:bg-orange-50 text-neutral-600 group-hover:text-orange-600'
            }`}>
            {icon}
        </div>
        <div>
            <h4 className={`font-bold ${primary ? 'text-white' : 'text-neutral-800'}`}>{title}</h4>
            <p className={`text-xs ${primary ? 'text-orange-100' : 'text-neutral-500'}`}>{desc}</p>
        </div>
    </button>
);

const Home = ({ onNavigate }) => {
    // ... (state e effects mantidos) ...
    const [stats, setStats] = useState({ turmas: 0, gabaritos: 0 });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [t, g] = await Promise.all([listarTurmas(), listarGabaritos()]);
            setStats({ turmas: t.length, gabaritos: g.length });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 font-sans text-black flex">

            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-neutral-200 h-screen sticky top-0">
                <div className="p-6 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                            GF
                        </div>
                        <span className="font-bold text-lg text-neutral-800">Gabarito Fácil</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => onNavigate('home')} className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 text-orange-700 rounded-xl font-medium">
                        <Icons.Chart /> Dashboard
                    </button>
                    <button onClick={() => onNavigate('turmas')} className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-white rounded-xl font-medium transition-colors">
                        <Icons.Users /> Minhas Turmas
                    </button>
                    <button onClick={() => onNavigate('historico')} className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-white rounded-xl font-medium transition-colors">
                        <Icons.History /> Histórico
                    </button>
                    <div className="pt-4 pb-2">
                        <p className="px-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Configurações</p>
                    </div>
                    <button onClick={() => onNavigate('cabecalhos')} className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-white rounded-xl font-medium transition-colors">
                        <Icons.School /> Meus Cabeçalhos
                    </button>
                    <button onClick={() => onNavigate('tutorial')} className="w-full flex items-center gap-3 px-4 py-3 text-neutral-600 hover:bg-white rounded-xl font-medium transition-colors">
                        <Icons.Book /> Tutorial & Dicas
                    </button>
                </nav>
                {/* ... footer sidebar ... */}
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto h-screen">

                {/* === MOBILE LAYOUT === */}
                <div className="lg:hidden flex flex-col min-h-full">
                    {/* Header Clean */}
                    <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
                                GF
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-neutral-800 leading-tight">Gabarito Fácil</h1>
                            </div>
                        </div>
                        <button onClick={() => onNavigate('tutorial')} className="text-neutral-400 hover:text-orange-600 p-2">
                            <Icons.Book />
                        </button>
                    </header>

                    {/* Stats Bar */}
                    {/* ... stats bar code ... */}
                    <div className="bg-white px-6 py-3 border-b border-neutral-200 flex justify-between items-center text-xs font-semibold text-neutral-500">
                        <span>Resumo Geral</span>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <Icons.Users />
                                <span><span className="text-neutral-800 font-bold text-sm">{stats.turmas}</span> Turmas</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Icons.History />
                                <span><span className="text-neutral-800 font-bold text-sm">{stats.gabaritos}</span> Gabaritos</span>
                            </div>
                        </div>
                    </div>

                    {/* Buttons Grid - Agora com 4 botões em grid */}
                    <div className="flex-1 p-6 bg-neutral-50">
                        <h2 className="text-neutral-500 font-medium text-sm mb-4 text-center">O que você deseja fazer?</h2>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Correção Rápida */}
                            <button
                                onClick={() => onNavigate('correcao-rapida')}
                                className="w-full bg-orange-600 active:bg-orange-700 text-white p-6 rounded-2xl shadow-lg shadow-orange-200 flex items-center gap-4 transition-transform active:scale-95 border border-orange-500"
                            >
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
                                    <Icons.Bolt />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xl font-bold">Correção Rápida</h3>
                                    <p className="text-orange-100 text-sm leading-tight">Corrigir gabaritos sem criar turma</p>
                                </div>
                            </button>

                            {/* Turmas */}
                            <button
                                onClick={() => onNavigate('turmas')}
                                className="w-full bg-white active:bg-white text-neutral-800 p-6 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-4 transition-transform active:scale-95"
                            >
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                                    <Icons.Users />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xl font-bold">Minhas Turmas</h3>
                                    <p className="text-neutral-500 text-sm leading-tight">Gerenciar alunos e turmas</p>
                                </div>
                            </button>

                            {/* Histórico */}
                            <button
                                onClick={() => onNavigate('historico')}
                                className="w-full bg-white active:bg-white text-neutral-800 p-6 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-4 transition-transform active:scale-95"
                            >
                                <div className="w-12 h-12 bg-neutral-50 text-neutral-600 rounded-xl flex items-center justify-center">
                                    <Icons.History />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xl font-bold">Gabaritos</h3>
                                    <p className="text-neutral-500 text-sm leading-tight">Criar ou ver correções</p>
                                </div>
                            </button>

                            {/* Cabeçalhos (Mobile Button) */}
                            <button
                                onClick={() => onNavigate('cabecalhos')}
                                className="w-full bg-white active:bg-white text-neutral-800 p-6 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-4 transition-transform active:scale-95"
                            >
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                                    <Icons.School />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xl font-bold">Cabeçalhos</h3>
                                    <p className="text-neutral-500 text-sm leading-tight">Escolas e professores</p>
                                </div>
                            </button>

                            {/* Tutorial (Mobile Button) */}
                            <button
                                onClick={() => onNavigate('tutorial')}
                                className="w-full bg-white active:bg-white text-neutral-800 p-6 rounded-2xl shadow-sm border border-neutral-200 flex items-center gap-4 transition-transform active:scale-95"
                            >
                                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                                    <Icons.Book />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xl font-bold">Tutorial</h3>
                                    <p className="text-neutral-500 text-sm leading-tight">Aprenda a usar</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-xs text-neutral-400 pb-6">Copyright © 2026 Gabarito Fácil</p>
                </div>

                {/* === DESKTOP LAYOUT (Main Area) === */}
                <div className="hidden lg:block max-w-5xl mx-auto p-10 space-y-8">
                    {/* ... (reusing existing structure, just ensuring no breaks) ... */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-neutral-800 tracking-tight mb-1">Visão Geral</h1>
                            <p className="text-neutral-500">Bem-vindo ao painel de correção.</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onNavigate('cabecalhos')}
                                className="bg-white hover:bg-white text-neutral-700 border border-neutral-200 px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <Icons.School /> Gerenciar Cabeçalhos
                            </button>
                            <button
                                onClick={() => onNavigate('correcao-rapida')}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-orange-200 transition-all flex items-center gap-2"
                            >
                                <Icons.Bolt /> Correção Rápida
                            </button>
                        </div>
                    </div>
                    {/* ... stats grid ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard
                            title="Total de Turmas"
                            value={stats.turmas}
                            icon={<Icons.Users />}
                            color="bg-orange-100 text-orange-600"
                        />
                        <StatCard
                            title="Gabaritos Gerados"
                            value={stats.gabaritos}
                            icon={<Icons.History />}
                            color="bg-neutral-50 text-neutral-600"
                        />
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-md text-white flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate('tutorial')}>
                            <div>
                                <h3 className="font-bold text-orange-100 mb-1">Dica Pro</h3>
                                <p className="text-sm font-medium leading-relaxed">
                                    Veja nosso tutorial para aprender a escanear com 100% de precisão.
                                </p>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">Ver Tutorial &rarr;</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;
