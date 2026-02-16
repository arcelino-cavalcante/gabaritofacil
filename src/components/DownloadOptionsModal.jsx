import React, { useState } from 'react';

const DownloadOptionsModal = ({ onClose, onConfirm, title = "Baixar Gabarito" }) => {
    const [selectedLayout, setSelectedLayout] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleConfirm = async () => {
        setIsGenerating(true);
        await onConfirm(selectedLayout);
        setIsGenerating(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
                <div className="bg-white p-6 pb-0">
                    <h3 className="text-xl font-bold text-neutral-800 text-center">{title}</h3>
                    <p className="text-neutral-500 text-sm text-center mt-1">Escolha o formato de impressão</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Option 1 */}
                    <button
                        onClick={() => setSelectedLayout(1)}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedLayout === 1
                            ? 'border-orange-600 bg-orange-50 text-orange-700'
                            : 'border-neutral-100 hover:border-orange-200 text-neutral-600'
                            }`}
                    >
                        <div className="w-10 h-14 border-2 border-current rounded flex items-center justify-center bg-white">
                            <div className="w-6 h-8 bg-current opacity-20 rounded-sm"></div>
                        </div>
                        <div className="text-left">
                            <div className="font-bold">1 Por Folha</div>
                            <div className="text-xs opacity-70">Tamanho Padrão (A4)</div>
                        </div>
                    </button>

                    {/* Option 2 */}
                    <button
                        onClick={() => setSelectedLayout(2)}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedLayout === 2
                            ? 'border-orange-600 bg-orange-50 text-orange-700'
                            : 'border-neutral-100 hover:border-orange-200 text-neutral-600'
                            }`}
                    >
                        <div className="w-10 h-14 border-2 border-current rounded flex flex-col items-center justify-center gap-1 bg-white p-1">
                            <div className="w-full h-full bg-current opacity-20 rounded-sm"></div>
                            <div className="w-full h-full bg-current opacity-20 rounded-sm"></div>
                        </div>
                        <div className="text-left">
                            <div className="font-bold">2 Por Folha</div>
                            <div className="text-xs opacity-70">Economia Moderada (Corte ao meio)</div>
                        </div>
                    </button>

                    {/* Option 4 */}
                    <button
                        onClick={() => setSelectedLayout(4)}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${selectedLayout === 4
                            ? 'border-orange-600 bg-orange-50 text-orange-700'
                            : 'border-neutral-100 hover:border-orange-200 text-neutral-600'
                            }`}
                    >
                        <div className="w-10 h-14 border-2 border-current rounded grid grid-cols-2 gap-0.5 bg-white p-0.5">
                            <div className="bg-current opacity-20 rounded-sm"></div>
                            <div className="bg-current opacity-20 rounded-sm"></div>
                            <div className="bg-current opacity-20 rounded-sm"></div>
                            <div className="bg-current opacity-20 rounded-sm"></div>
                        </div>
                        <div className="text-left">
                            <div className="font-bold">4 Por Folha</div>
                            <div className="text-xs opacity-70">Máxima Economia (Compacto)</div>
                        </div>
                    </button>
                </div>

                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-neutral-500 font-bold hover:bg-white rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isGenerating}
                        className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isGenerating ? 'Gerando...' : 'Baixar PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DownloadOptionsModal;
