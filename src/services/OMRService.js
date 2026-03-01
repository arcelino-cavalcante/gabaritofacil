export const OMRService = {
    isLoaded: true,

    init() {
        return Promise.resolve();
    },

    /**
     * Processa imagem apenas para encontrar contorno (feedback visual rápido)
     * Desativado nativamente no frontend para economizar bateria e CPU celular.
     */
    processImage(sourceElement, debugCanvas = null) {
        return { success: false };
    },

    /**
     * Realiza a leitura enviando a imagem para a API Python Profissional!
     */
    async scanAndRead(sourceElement, gabarito) {
        // 1. Converter sourceElement (Video/Canvas) para arquivo de Imagem
        const canvas = document.createElement('canvas');
        canvas.width = sourceElement.width || sourceElement.videoWidth;
        canvas.height = sourceElement.height || sourceElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);

        // Gera o blob JPEG com compressão
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));

        // 2. Prepara FormData para mandar pra API
        const formData = new FormData();
        formData.append('file', blob, 'gabarito.jpg');
        formData.append('num_questoes', gabarito.questoes ? gabarito.questoes.length : 20);

        // 3. Chamar a API em Python (a verdadeira mágica)
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${apiUrl}/omr/corrigir`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Erro no processamento da API");
            }

            const data = await response.json();

            if (data.status !== 'success') {
                throw new Error("Não foi possível ler as respostas.");
            }

            // 4. Mapear do formato da API pro formato que o Frontend React espera
            // A API devolve { "respostas_lidas": {"1": "A", "2": "C"} }
            const answers = [];
            const respostasDaApi = data.respostas_lidas || {};

            for (let i = 0; i < gabarito.questoes.length; i++) {
                const q = gabarito.questoes[i];
                const readChar = respostasDaApi[q.id.toString()] || "Branco";
                answers.push({
                    id: q.id,
                    read: readChar,
                    correct: q.correct,
                    status: readChar === q.correct ? 'correct' : 'wrong'
                });
            }

            return {
                answers,
                totalQuestions: gabarito.questoes.length,
                trustedArea: data.trusted_area !== undefined ? data.trusted_area : true,
                debugImage: null,
                qrCodeData: data.qrCodeData
            };

        } catch (error) {
            console.error("Erro comunicação com OMR API", error);
            throw new Error("Erro na correção. Tente novamente: " + error.message);
        }
    }
};
