import React, { useState, useRef, useEffect, useCallback } from 'react';
import { salvarNota, listarAlunosPorTurma } from '../db';
import { useModal } from '../contexts/ModalContext';
import { OMRService } from '../services/OMRService';

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
    const [cvLoaded, setCvLoaded] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Inicializando inteligência...");

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const processingRef = useRef(false);
    const detectingRef = useRef(false);

    useEffect(() => {
        // Carregar OpenCV e Alunos
        const checkOpenCV = setInterval(() => {
            if (window.cv && window.cv.Mat) {
                clearInterval(checkOpenCV);
                setCvLoaded(true);
                setStatusMessage("Câmera pronta via OpenCV");
                iniciarCamera();
            }
        }, 500);

        if (gabarito.tipo === 'nominal' && gabarito.turmaId) {
            carregarAlunos();
        }

        return () => {
            clearInterval(checkOpenCV);
            pararCamera();
        };
    }, []);

    const carregarAlunos = async () => {
        try {
            const lista = await listarAlunosPorTurma(gabarito.turmaId);
            setAlunos(lista);
        } catch (error) { console.error(error); }
    };

    const iniciarCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    requestAnimationFrame(detectarDocumentoLoop);
                };
            }
            setStatusMessage("Enquadre o Gabarito");
        } catch (err) {
            console.error(err);
            setStatusMessage("Erro: " + err.message);
            await showAlert("Erro ao acessar câmera. Verifique permissões.");
        }
    };

    const pararCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        processingRef.current = false;
    };

    // Loop visual: Desenha contornos em tempo real (Feedback Visual)
    const detectingLoopId = useRef(null);
    const detectarDocumentoLoop = () => {
        if (!videoRef.current || !canvasRef.current || !window.cv || resultado || processingRef.current) return;

        // Limita FPS (processa a cada ~100ms)
        if (detectingRef.current) {
            detectingLoopId.current = requestAnimationFrame(detectarDocumentoLoop);
            return;
        }

        detectingRef.current = true;
        try {
            const cv = window.cv;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                let src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
                let cap = new cv.VideoCapture(video);
                cap.read(src);

                let gray = new cv.Mat();
                cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
                cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
                cv.Canny(gray, gray, 75, 200);

                let contours = new cv.MatVector();
                let hierarchy = new cv.Mat();
                cv.findContours(gray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                let maxArea = 0;
                let foundContour = null;

                for (let i = 0; i < contours.size(); ++i) {
                    let cnt = contours.get(i);
                    let area = cv.contourArea(cnt);
                    if (area > 5000) {
                        let peri = cv.arcLength(cnt, true);
                        let approx = new cv.Mat();
                        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

                        if (approx.rows === 4 && area > maxArea) {
                            maxArea = area;
                            foundContour = approx;
                        } else {
                            approx.delete();
                        }
                    }
                }

                if (foundContour) {
                    ctx.strokeStyle = '#00ff00'; // Verde
                    ctx.lineWidth = 4;
                    ctx.beginPath();

                    let data = foundContour.data32S;
                    ctx.moveTo(data[0], data[1]);
                    ctx.lineTo(data[2], data[3]);
                    ctx.lineTo(data[4], data[5]);
                    ctx.lineTo(data[6], data[7]);
                    ctx.closePath();
                    ctx.stroke();

                    foundContour.delete();
                }

                src.delete(); gray.delete(); contours.delete(); hierarchy.delete();
            }
        } catch (e) {
            console.error(e);
        }
        detectingRef.current = false;
        if (!resultado && !isProcessing) {
            detectingLoopId.current = requestAnimationFrame(detectarDocumentoLoop);
        }
    };

    const capturarEProcessar = async () => {
        if (!videoRef.current || !window.cv) return;
        setIsProcessing(true);
        processingRef.current = true; // Stop visual loop
        cancelAnimationFrame(detectingLoopId.current);
        setStatusMessage("Processando respostas...");

        try {
            // Real OMR Processing
            const video = videoRef.current;

            // Call the service with the video element and gabarito data
            const result = await OMRService.scanAndRead(video, gabarito);

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
            const resFinal = { acertos, total, nota, detalhesErros };

            setResultado(resFinal);
            setStatusMessage("Correção finalizada com sucesso!");
            if (gabarito.tipo === 'nominal') salvarSeNominal(resFinal);

        } catch (err) {
            console.error(err);
            setStatusMessage("Erro: " + err.message);
            await showAlert("Falha ao ler gabarito: " + err.message);
            // Resume detection if failed
            processingRef.current = false;
            setIsProcessing(false);
            detectingLoopId.current = requestAnimationFrame(detectarDocumentoLoop);
        } finally {
            setIsProcessing(false);
        }
    };

    const salvarSeNominal = async (res) => {
        if (alunos.length > 0) {
            const aluno = alunos[Math.floor(Math.random() * alunos.length)];
            try {
                await salvarNota({
                    alunoId: aluno.id,
                    gabaritoId: gabarito.id,
                    nota: res.nota,
                    acertos: res.acertos,
                    total: res.total
                });
            } catch (e) { console.error(e); }
        }
    };

    const reiniciar = () => {
        setResultado(null);
        setIsProcessing(false);
        processingRef.current = false;
        setStatusMessage("Enquadre o Gabarito");
        requestAnimationFrame(detectarDocumentoLoop);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans">
            {/* Viewfinder Area */}
            <div className="relative flex-1 bg-neutral-900 overflow-hidden flex flex-col items-center justify-center">

                {/* Loader Inicial */}
                {!cvLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/90 text-white gap-4">
                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-medium animate-pulse">Carregando IA de Visão...</p>
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
                                <span className={`w-2 h-2 rounded-full ${cvLoaded ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
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
                                disabled={isProcessing || !cvLoaded}
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
                                    onClick={onCloseResultado => { setResultado(null); processingRef.current = false; setIsProcessing(false); requestAnimationFrame(detectarDocumentoLoop); }}
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
