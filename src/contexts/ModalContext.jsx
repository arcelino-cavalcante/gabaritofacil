import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal deve ser usado dentro de ModalProvider');
    }
    return context;
};

export const ModalProvider = ({ children }) => {
    const [modal, setModal] = useState(null);

    const showAlert = (message, title = 'Aviso') => {
        return new Promise((resolve) => {
            setModal({
                type: 'alert',
                title,
                message,
                onConfirm: () => {
                    setModal(null);
                    resolve(true);
                }
            });
        });
    };

    const showConfirm = (message, title = 'Confirmação') => {
        return new Promise((resolve) => {
            setModal({
                type: 'confirm',
                title,
                message,
                onConfirm: () => {
                    setModal(null);
                    resolve(true);
                },
                onCancel: () => {
                    setModal(null);
                    resolve(false);
                }
            });
        });
    };

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm }}>
            {children}

            {modal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scaleIn">
                        <h2 className="text-lg font-bold text-neutral-800 mb-3 text-center">
                            {modal.title}
                        </h2>
                        <p className="text-neutral-600 text-center mb-6 leading-relaxed">
                            {modal.message}
                        </p>

                        <div className="flex gap-3">
                            {modal.type === 'confirm' && (
                                <button
                                    onClick={modal.onCancel}
                                    className="flex-1 px-4 py-3 border-2 border-neutral-300 text-neutral-700 rounded-xl font-semibold hover:bg-white transition-colors"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                onClick={modal.onConfirm}
                                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${modal.type === 'confirm'
                                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                                        : 'bg-orange-600 text-white hover:bg-orange-700'
                                    }`}
                                autoFocus
                            >
                                {modal.type === 'confirm' ? 'Confirmar' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
};
