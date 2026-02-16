import React, { useState } from 'react';

const Tutorial = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('uso'); // 'uso' | 'dicas'

    return (
        <div className="min-h-screen bg-white font-sans text-black pb-20 relative">
            {/* Header */}
            <header className="bg-white border-b border-neutral-200 px-4 py-4 sticky top-0 z-10 flex items-center gap-3 shadow-sm safe-top">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-50 rounded-full transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-lg font-bold text-black">Como Usar</h1>
            </header>

            <main className="max-w-3xl mx-auto p-4">

                {/* Tabs */}
                <div className="flex bg-white rounded-xl border border-neutral-200 p-1 mb-6 shadow-sm">
                    <button
                        onClick={() => setActiveTab('uso')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'uso'
                                ? 'bg-orange-600 text-white shadow-md'
                                : 'text-neutral-500 hover:bg-white'
                            }`}
                    >
                        Passo a Passo
                    </button>
                    <button
                        onClick={() => setActiveTab('dicas')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'dicas'
                                ? 'bg-orange-600 text-white shadow-md'
                                : 'text-neutral-500 hover:bg-white'
                            }`}
                    >
                        Dicas de Scanner
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6">

                    {activeTab === 'uso' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Step 1 */}
                            <section className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold text-lg">1</div>
                                    <h3 className="font-bold text-neutral-800 text-lg">Crie seus Gabaritos</h3>
                                </div>
                                <p className="text-neutral-600 leading-relaxed mb-4">
                                    Você pode criar gabaritos de dois tipos:
                                </p>
                                <ul className="space-y-2 text-sm text-neutral-600">
                                    <li className="flex gap-2">
                                        <span className="font-bold text-orange-600">Correção Rápida:</span>
                                        Para corrigir provas sem vincular a uma turma específica. Ideal para testes rápidos.
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold text-orange-600">Para Turma:</span>
                                        Gera folhas nominais para cada aluno da turma selecionada. O sistema já identifica o aluno automaticamente!
                                    </li>
                                </ul>
                            </section>

                            {/* Step 2 */}
                            <section className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold text-lg">2</div>
                                    <h3 className="font-bold text-neutral-800 text-lg">Imprima as Folhas</h3>
                                </div>
                                <p className="text-neutral-600 leading-relaxed">
                                    Ao finalizar a criação, clique em <span className="font-bold text-neutral-800">Baixar PDF</span>.
                                    Você pode escolher imprimir 1, 2 ou 4 folhas por página para economizar papel.
                                </p>
                                <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-100">
                                    <strong>Importante:</strong> Se imprimir 2 ou 4 por folha, corte o papel nas linhas pontilhadas antes de entregar aos alunos.
                                </div>
                            </section>

                            {/* Step 3 */}
                            <section className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold text-lg">3</div>
                                    <h3 className="font-bold text-neutral-800 text-lg">Escaneie com a Câmera</h3>
                                </div>
                                <p className="text-neutral-600 leading-relaxed">
                                    Vá em "Meus Gabaritos", selecione a prova e clique em <span className="font-bold text-orange-600">Corrigir</span>.
                                    Aponte a câmera para a folha de resposta preenchida.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'dicas' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-orange-600 text-white p-6 rounded-2xl shadow-lg mb-6">
                                <h3 className="font-bold text-xl mb-2">Segredo do Sucesso</h3>
                                <p className="opacity-90">
                                    A qualidade da leitura depende 90% de como você posiciona a câmera. Siga estas dicas para leitura instantânea!
                                </p>
                            </div>

                            <section className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl">💡</div>
                                    <div>
                                        <h4 className="font-bold text-neutral-800 mb-1">Iluminação é Tudo</h4>
                                        <p className="text-sm text-neutral-600 leading-relaxed">
                                            Procure um lugar <strong>bem iluminado</strong>. A luz natural é a melhor. Evite lugares escuros ou apenas com a luz do monitor.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl">⬜</div>
                                    <div>
                                        <h4 className="font-bold text-neutral-800 mb-1">Fundo Neutro</h4>
                                        <p className="text-sm text-neutral-600 leading-relaxed">
                                            Coloque a folha sobre uma mesa <strong>lisa e de cor uniforme</strong> (branca ou madeira clara). Evite fundos muito estampados.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl">⬛</div>
                                    <div>
                                        <h4 className="font-bold text-neutral-800 mb-1">Os 4 Quadrados</h4>
                                        <p className="text-sm text-neutral-600 leading-relaxed">
                                            Certifique-se de que os <strong>4 quadrados pretos</strong> (âncoras) nos cantos do gabarito apareçam na tela. Eles são os olhos do sistema!
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm border-l-4 border-l-red-400">
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl">🚫</div>
                                    <div>
                                        <h4 className="font-bold text-neutral-800 mb-1">Evite Sombras</h4>
                                        <p className="text-sm text-neutral-600 leading-relaxed">
                                            Cuidado para que <strong>seu celular não faça sombra</strong> em cima das respostas. Incline levemente se necessário ou mude a posição da luz.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default Tutorial;
