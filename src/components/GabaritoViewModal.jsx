import React from 'react';

const GabaritoViewModal = ({ gabarito, onClose }) => {
    if (!gabarito) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-white p-6 border-b border-neutral-100 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h3 className="text-xl font-bold text-neutral-800">Gabarito Oficial</h3>
                        <p className="text-neutral-500 text-sm truncate max-w-[200px]">{gabarito.nome}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-neutral-50 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-5 gap-3 mb-6">
                        {gabarito.questoes.map((q) => (
                            <div key={q.id} className="flex flex-col items-center p-2 rounded-lg bg-white border border-neutral-200">
                                <span className="text-xs font-bold text-neutral-400 mb-1">{q.id}</span>
                                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold shadow-sm shadow-orange-200">
                                    {q.correct}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <div className="inline-block px-4 py-2 bg-neutral-50 rounded-lg text-xs text-neutral-500 font-medium">
                            Total de {gabarito.questoes.length} questões
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-100 bg-white">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GabaritoViewModal;
