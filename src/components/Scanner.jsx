import React, { useState, useRef, useEffect } from 'react';
import { salvarNota, listarAlunosPorTurma } from '../db';
import { useModal } from '../contexts/ModalContext';
import { OMREngine } from '../services/OMREngine';

// Icons
const Icons = {
    X: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>,
    Check: () => <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>,
    Refresh: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    Camera: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
};

const Scanner = ({ gabarito, onBack }) => {
    const { showAlert } = useModal();
    const [stream, setStream] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [alunos, setAlunos] = useState([]);
    const [cameraReady, setCameraReady] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Inicializando câmera...");

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        iniciarCamera();
        if (gabarito.tipo === 'nominal' && gabarito.turmaId) {
            carregarAlunos();
        }
        return () => pararCamera();
    }, []);

    const carregarAlunos = async () => {
        try {
            const lista = await listarAlunosPorTurma(gabarito.turmaId);
            setAlunos(lista);
        } catch (error) { console.error(error); }
    };



    const iniciarCamera = async () => {
        try {
            // Tentar solicitar resolução Full HD (Alta o suficiente para OMR, leve o suficiente para não travar JS)
            const constraints = {
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    focusMode: 'continuous',
                    exposureMode: 'continuous'
                }
            };

            // Fallback se "exact environment" falhar
            let mediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                console.warn("Câmera traseira ideal falhou, tentando modo geral minimizado...", e);
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment', // Sem 'exact'
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        }
                    });
                } catch (e2) {
                    console.warn("Também falhou modo environment genérico. Pegando a câmera que estiver disponível...", e2);
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: true // Fallback final absoluto sem restrições
                    });
                }
            }

            setStream(mediaStream);

            const track = mediaStream.getVideoTracks()[0];

            // Aplicar constraints avançadas na track se possível (Foco, Zoom, Torch)
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            const advancedConstraints = {};
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) advancedConstraints.focusMode = 'continuous';
            if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) advancedConstraints.exposureMode = 'continuous';
            // if (capabilities.torch) ... (poderíamos adicionar botão de flash)

            if (Object.keys(advancedConstraints).length > 0) {
                try {
                    await track.applyConstraints({ advanced: [advancedConstraints] });
                } catch (e) { console.warn("Erro ao aplicar constraints avançadas", e); }
            }

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    setCameraReady(true);
                    setStatusMessage("Câmera de Alta Precisão Pronta");
                };
            }
        } catch (err) {
            console.error(err);
            setStatusMessage("Erro Câm: " + err.message);
            await showAlert("Erro ao acessar câmera de alta resolução. Verifique permissões.");
        }
    };

    const capturarEProcessar = async () => {
        if (!videoRef.current) return;
        setIsProcessing(true);
        setStatusMessage("Focando e Capturando...");

        try {
            // Em mobile, ImageCapture.takePhoto() freqüentemente congela a thread ou retorna blobs não-suportados (iOS).
            // A abordagem mais garantida e rápida 100% cross-browser é desenhar o frame atual do <video> num <canvas>.
            const imageSource = videoRef.current;
            setStatusMessage("Processando frame na Inteligência Local...");

            // Real OMR Processing via Browser WebAssembly JS
            const result = await OMREngine.scanAndRead(imageSource, gabarito);

            // Calculate score
            let acertos = 0;
            const total = gabarito.questoes.length;
            const detalhesErros = [];

            result.answers.forEach(q => {
                if (q.read === q.correct) {
                    acertos++;
                } else {
                    detalhesErros.push({
                        ...q,
                        respostaAluno: q.read || 'Em branco' // Show what was read
                    });
                }
            });

            const nota = Math.round((acertos / total) * 10);
            const resFinal = {
                acertos,
                total,
                nota,
                detalhesErros,
                trustedArea: result.trustedArea,
                debugImage: result.debugImage // Pass image to state
            };

            setResultado(resFinal);
            setStatusMessage("Correção Inteligente Finalizada!");
            if (gabarito.tipo === 'nominal') salvarSeNominal(resFinal);

            // Se o motor não achou a folha exibe um alerta logo em seguida
            if (result.trustedArea === false) {
                showAlert("Atenção: As bordas da folha de gabarito não foram localizadas com precisão. Sugerimos verificar a leitura ou refazer a foto mais próxima e reta.");
            }

        } catch (err) {
            console.error(err);
            setStatusMessage("Erro: " + err.message);
            await showAlert("Falha ao ler gabarito: " + err.message);
            setIsProcessing(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const salvarSeNominal = async (res) => {
        if (gabarito.tipo === 'nominal' && alunos.length > 0) {

            // Verifica se a Inteligência leu o ID do aluno no QR Code
            if (res.qrCodeData && res.qrCodeData.aluno_id) {
                const alunoIdLido = res.qrCodeData.aluno_id;
                const alunoExiste = alunos.find(a => a.id === alunoIdLido);

                if (alunoExiste) {
                    try {
                        await salvarNota({
                            alunoId: alunoExiste.id,
                            gabaritoId: gabarito.id,
                            nota: res.nota,
                            acertos: res.acertos,
                            total: res.total
                        });
                        setStatusMessage(`Nota salva para: ${alunoExiste.nome}`);
                    } catch (e) {
                        console.error(e);
                        showAlert("Erro ao salvar nota no banco de dados.");
                    }
                } else {
                    showAlert("Aluno não encontrado nesta turma! O gabarito pertence a outra sala?");
                }
            } else {
                showAlert("Atenção: A câmera não conseguiu ler o QR Code do aluno nesta folha. A nota não foi salva automaticamente.");
            }
        }
    };

    const pararCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const reiniciar = () => {
        setResultado(null);
        setIsProcessing(false);
        setStatusMessage("Câmera Pronta");
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans">
            {/* Viewfinder Area */}
            <div className="relative flex-1 bg-neutral-900 overflow-hidden flex flex-col items-center justify-center">

                {/* Loader Inicial */}
                {!cameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/90 text-white gap-4">
                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-medium animate-pulse">Iniciando Motor de Correção...</p>
                    </div>
                )}

                {/* Video & Canvas Overlay */}
                <div className="relative w-full h-full max-w-lg aspect-[3/4]">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                    />

                    {/* Linha de Scan (só aparece procassando) */}
                    {isProcessing && (
                        <div className="absolute left-0 right-0 top-0 h-1 bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,1)] animate-scan z-20"></div>
                    )}
                </div>

                {/* UI Overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-6 safe-top safe-bottom z-10 pointer-events-none">

                    {/* Top Bar */}
                    <div className="flex justify-between items-center pointer-events-auto">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 bg-black/40 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all"
                        >
                            <Icons.X />
                        </button>
                        <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
                            <span className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
                                {statusMessage}
                            </span>
                        </div>
                        <div className="w-10"></div>
                    </div>

                    {/* Botão de Captura */}
                    {!resultado && (
                        <div className="flex justify-center pb-8 pt-4 pointer-events-auto">
                            <button
                                onClick={capturarEProcessar}
                                disabled={isProcessing || !cameraReady}
                                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isProcessing
                                    ? 'bg-white/10 border-4 border-white/20 scale-90'
                                    : 'bg-white hover:scale-105 active:scale-95 ring-4 ring-white/50'
                                    }`}
                            >
                                <div className="w-16 h-16 rounded-full border-2 border-black/10 bg-gradient-to-br from-neutral-100 to-white flex items-center justify-center">
                                    <Icons.Camera />
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Resultado Bottom Sheet */}
            {resultado && (
                <div className="absolute inset-x-0 bottom-0 z-50 flex items-end justify-center pointer-events-none">
                    <div className="w-full max-w-md pointer-events-auto animate-slideUp">
                        <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden">

                            {/* Debug Image Preview */}
                            {resultado.debugImage && (
                                <div className="w-full bg-neutral-900 flex justify-center py-4 border-b border-neutral-800">
                                    <img
                                        src={resultado.debugImage}
                                        alt="Debug Leitura"
                                        className="h-48 object-contain rounded-lg shadow-lg border border-white/20"
                                    />
                                </div>
                            )}

                            {/* Header Nota */}
                            <div className={`p-8 flex items-center justify-between ${resultado.nota >= 6 ? 'bg-gradient-to-br from-green-500 to-emerald-700' : 'bg-gradient-to-br from-red-500 to-orange-700'}`}>
                                <div className="text-white">
                                    <p className="text-xs font-bold uppercase opacity-80 tracking-wider mb-1">Nota Final</p>
                                    <h2 className="text-7xl font-black tracking-tighter drop-shadow-md">{resultado.nota}</h2>
                                </div>
                                <div className="text-right text-white">
                                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20 inline-block mb-2">
                                        <span className="font-bold text-2xl">{resultado.acertos}</span>
                                        <span className="text-sm opacity-90 mx-1">/</span>
                                        <span className="text-sm opacity-90">{resultado.total}</span>
                                    </div>
                                    <p className="text-sm font-medium opacity-90">Questões</p>
                                </div>
                            </div>

                            {/* Detalhes (Lista) */}
                            <div className="p-0 bg-neutral-50 max-h-[50vh] overflow-y-auto">
                                {resultado.detalhesErros.length > 0 ? (
                                    <div className="divide-y divide-neutral-200">
                                        {resultado.detalhesErros.map((erro, idx) => (
                                            <div key={idx} className="bg-white p-4 flex justify-between items-center group hover:bg-neutral-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-500 text-sm">
                                                        {erro.id}
                                                    </div>
                                                    <span className="font-medium text-neutral-600">Questão {erro.id}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] uppercase text-neutral-300 font-bold mb-0.5">Aluno</span>
                                                        <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold border border-red-200">
                                                            {erro.respostaAluno || 'X'}
                                                        </span>
                                                    </div>
                                                    <span className="text-neutral-300">➜</span>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] uppercase text-neutral-300 font-bold mb-0.5">Gabarito</span>
                                                        <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-bold border border-green-200 shadow-sm">
                                                            {erro.correct}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                                            <Icons.Check />
                                        </div>
                                        <h3 className="text-lg font-bold text-neutral-800">Perfeição!</h3>
                                        <p className="text-sm">O aluno acertou todas as questões.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 bg-white border-t border-neutral-200 flex gap-3 safe-bottom shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20 relative">
                                <button
                                    onClick={() => { setResultado(null); setIsProcessing(false); }}
                                    className="flex-1 py-4 rounded-xl border border-neutral-200 font-bold text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                                >
                                    Refazer
                                </button>
                                <button
                                    onClick={reiniciar}
                                    className="flex-[2] py-4 rounded-xl bg-neutral-900 text-white font-bold shadow-xl shadow-neutral-900/20 hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Icons.Refresh /> Próximo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scanner;
