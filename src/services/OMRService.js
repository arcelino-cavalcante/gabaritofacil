export const OMRService = {
    isLoaded: false,
    cv: null,

    init() {
        return new Promise((resolve, reject) => {
            if (window.cv) {
                this.cv = window.cv;
                this.isLoaded = true;
                resolve();
            } else {
                const checkCv = setInterval(() => {
                    if (window.cv && window.cv.Mat) {
                        clearInterval(checkCv);
                        this.cv = window.cv;
                        this.isLoaded = true;
                        console.log("OpenCV Loaded!");
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkCv);
                    if (!this.isLoaded) reject("OpenCV load timeout");
                }, 10000);
            }
        });
    },

    /**
     * Processa imagem apenas para encontrar contorno (feedback visual rápido)
     */
    processImage(sourceElement, debugCanvas = null) {
        if (!this.isLoaded) return null;
        const cv = this.cv;

        try {
            let src = new cv.Mat(sourceElement.height, sourceElement.width, cv.CV_8UC4);
            let cap = new cv.VideoCapture(sourceElement);
            cap.read(src);

            let gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

            let blurred = new cv.Mat();
            cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

            let edged = new cv.Mat();
            cv.Canny(blurred, edged, 75, 200);

            let contours = new cv.MatVector();
            let hierarchy = new cv.Mat();
            cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let maxArea = 0;
            let docContour = null;
            let approx = new cv.Mat();

            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let area = cv.contourArea(cnt);
                if (area > 5000) { // Filtro de ruído
                    let peri = cv.arcLength(cnt, true);
                    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

                    if (approx.rows === 4 && area > maxArea) {
                        maxArea = area;
                        docContour = approx.clone();
                    }
                }
            }

            src.delete(); gray.delete(); blurred.delete(); edged.delete();
            contours.delete(); hierarchy.delete();
            if (approx) approx.delete();

            if (docContour) {
                return { success: true, contour: docContour, area: maxArea };
            }

            return { success: false };

        } catch (err) {
            console.error("OMR processImage Error:", err);
            return { success: false, error: err };
        }
    },

    /**
     * Realiza a leitura completa: Warp -> Threshold -> Pixel Count
     */
    async scanAndRead(sourceElement, gabarito) {
        if (!this.isLoaded) throw new Error("OpenCV not loaded");
        const cv = this.cv;

        // 1. Capturar e Detectar novamente
        let src = new cv.Mat(sourceElement.height, sourceElement.width, cv.CV_8UC4);
        let cap = new cv.VideoCapture(sourceElement);
        cap.read(src);

        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        let blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
        let edged = new cv.Mat();
        cv.Canny(blurred, edged, 75, 200);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let docContour = null;
        let approx = new cv.Mat();

        for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i);
            let area = cv.contourArea(cnt);
            if (area > 5000) {
                let peri = cv.arcLength(cnt, true);
                cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
                if (approx.rows === 4 && area > maxArea) {
                    maxArea = area;
                    docContour = approx.clone();
                }
            }
        }

        // Limpeza inicial
        gray.delete(); blurred.delete(); edged.delete();
        contours.delete(); hierarchy.delete(); approx.delete();

        if (!docContour) {
            src.delete();
            throw new Error("Gabarito não encontrado na imagem capturada.");
        }

        // 2. Warp Perspective
        // Ordenar pontos (TL, TR, BR, BL)
        const sortedPoints = this._orderPoints(docContour);
        docContour.delete();

        // 4 pixels por mm (Alta resolução)
        const scale = 4;
        const width = 210 * scale;  // 840
        const height = 297 * scale; // 1188

        let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, sortedPoints);
        let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
        let M = cv.getPerspectiveTransform(srcTri, dstTri);

        let warped = new cv.Mat();
        let dsize = new cv.Size(width, height);
        cv.warpPerspective(src, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        // 3. Threshold (Binarizar para contar pixels)
        let warpedGray = new cv.Mat();
        cv.cvtColor(warped, warpedGray, cv.COLOR_RGBA2GRAY);
        let thresh = new cv.Mat();
        // Adaptive threshold para lidar com sombras
        cv.adaptiveThreshold(warpedGray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 21, 10);

        // Debug: Se quiser ver a imagem processada, poderia retornar o warped ou thresh aqui.

        // 4. Ler Respostas
        const answers = [];
        const limitPerColumn = 20;

        // Configuração de Layout baseada no PDFGenerator
        // Col 1 X: 25mm | Col 2 X: 115mm
        // Start Y: 75mm
        // Row Height: 12mm
        // Bubble Start Offset X: 15mm
        // Bubble Step: 12mm
        // Bubble Center X Adj: 1.5mm
        // Bubble Center Y Adj: -1mm

        for (let i = 0; i < gabarito.questoes.length; i++) {
            const q = gabarito.questoes[i];
            const isCol2 = i >= limitPerColumn;
            const idxInCol = isCol2 ? i - limitPerColumn : i;

            const baseX_mm = isCol2 ? 115 : 25;
            const baseY_mm = 75 + (idxInCol * 12);

            const numAlts = q.alternatives || 5; // Default 5 (A-E)
            const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, numAlts);

            let bestOption = null;
            let maxPixelCount = -1;
            const bubbleData = [];

            for (let j = 0; j < letters.length; j++) {
                const opt = letters[j];

                // Coordenadas do CENTRO da bolha em mm
                const centerX_mm = baseX_mm + 15 + (j * 12) + 1.5;
                const centerY_mm = baseY_mm - 1;

                // Converter para pixels
                const cx = Math.round(centerX_mm * scale);
                const cy = Math.round(centerY_mm * scale);

                // Definir ROI (Region of Interest)
                // Raio da bolha pdf = 3.5mm => ~14px. Vamos olhar raio 9px interno.
                const r = 9;

                // Cria mascara circular
                let mask = new cv.Mat.zeros(height, width, cv.CV_8UC1);
                let center = new cv.Point(cx, cy);
                cv.circle(mask, center, r, [255, 255, 255, 255], -1);

                // Mascara AND Threshold
                let res = new cv.Mat();
                cv.bitwise_and(thresh, thresh, res, mask);

                // Conta pixels brancos (marcados)
                const count = cv.countNonZero(res);
                bubbleData.push({ opt, count });

                if (count > maxPixelCount) {
                    maxPixelCount = count;
                    bestOption = opt;
                }

                mask.delete();
                res.delete();
            }

            // Heurística: Precisa ter um mínimo de preenchimento.
            // Área pi*r^2 = 3.14 * 81 ~= 254 pixels.
            // Se tiver menos de 30% preenchido (~75px), considerar em branco/ruído?
            // Ajustar conforme testes. Vamos por 60px.
            if (maxPixelCount < 60) {
                bestOption = null;
            }

            answers.push({
                id: q.id,
                read: bestOption,
                correct: q.correct,
                debug: bubbleData
            });
        }

        // Cleanup final
        src.delete(); srcTri.delete(); dstTri.delete(); M.delete();
        warped.delete(); warpedGray.delete(); thresh.delete();

        return {
            answers,
            totalQuestions: gabarito.questoes.length,
            // Pode retornar imagem debug se necessário
        };
    },

    // Helper para ordenar pontos do contorno (Top-Left -> Top-Right -> Bottom-Right -> Bottom-Left)
    _orderPoints(contour) {
        // contour.data32S é um Int32Array [x1, y1, x2, y2, ...]
        const pts = [];
        const data = contour.data32S;
        for (let i = 0; i < 4; i++) {
            pts.push({ x: data[i * 2], y: data[i * 2 + 1] });
        }

        // Ordena por soma (TL é menor soma, BR é maior soma)
        pts.sort((a, b) => (a.x + a.y) - (b.x + b.y));
        const tl = pts[0];
        const br = pts[3];

        const remaining = [pts[1], pts[2]];
        // Ordena por diferença (TR tem diff positiva grande/pequena? x-y)
        // TR: x grande, y pequeno => x-y grande
        // BL: x pequeno, y grande => x-y pequeno
        remaining.sort((a, b) => (b.x - b.y) - (a.x - a.y));
        const tr = remaining[0];
        const bl = remaining[1];

        // Retorna array flat para o cv.matFromArray
        return [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y];
    }
};
