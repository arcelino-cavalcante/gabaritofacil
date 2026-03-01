import jsQR from 'jsqr';

// Carregando o OpenCV dinamicamente pelo script tag para evitar bundle imenso do WebAssembly
const ensureOpenCVLoaded = () => {
    return new Promise((resolve, reject) => {
        if (window.cv && window.cv.Mat) {
            resolve(window.cv);
            return;
        }

        const scriptId = 'opencv-js-script';
        if (document.getElementById(scriptId)) {
            // Script already requested, wait for it
            const check = setInterval(() => {
                if (window.cv && window.cv.Mat) {
                    clearInterval(check);
                    resolve(window.cv);
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        // Using a reliable CDN for OpenCV.js WebAssembly
        script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
        script.onload = () => {
            const check = setInterval(() => {
                if (window.cv && window.cv.Mat) {
                    clearInterval(check);
                    resolve(window.cv);
                }
            }, 100);
        };
        script.onerror = () => reject(new Error('Falha ao carregar OpenCV.js'));
        document.body.appendChild(script);
    });
};

const orderPoints = (cv, ptsArray) => {
    // ptsArray is an array of {x, y}
    // Sort logic from Python order_points

    // Top-left will have the smallest sum, bottom-right will have the largest sum
    const sums = ptsArray.map(p => p.x + p.y);
    const tlIndex = sums.indexOf(Math.min(...sums));
    const brIndex = sums.indexOf(Math.max(...sums));

    // Top-right will have the smallest difference, bottom-left will have the largest difference
    const diffs = ptsArray.map(p => p.y - p.x);
    const trIndex = diffs.indexOf(Math.min(...diffs));
    const blIndex = diffs.indexOf(Math.max(...diffs));

    return [
        ptsArray[tlIndex],
        ptsArray[trIndex],
        ptsArray[brIndex],
        ptsArray[blIndex]
    ];
};

const getEuclidean = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

export const OMREngine = {
    isLoaded: false,

    async init() {
        if (!this.isLoaded) {
            await ensureOpenCVLoaded();
            this.isLoaded = true;
        }
    },

    /**
     * Motor principal OMR Frontend em JavaScript.
     */
    async scanAndRead(sourceCanvas, gabarito) {
        await this.init();
        const cv = window.cv;

        const numQuestoes = gabarito.questoes ? gabarito.questoes.length : 20;

        // Leitura inicial para o QR Code via jsQR (Pois o CV WebAssembly nao embute o detector confiavelmente)
        let qrCodeData = null;
        let qrDict = null;

        try {
            const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
            const imgData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "dontInvert" });

            if (code && code.data) {
                try {
                    qrDict = JSON.parse(code.data);
                } catch (e) {
                    console.warn("QR não é um JSON válido", code.data);
                }
            }
        } catch (e) {
            console.error("Erro leitura QR Code pre-cv", e);
        }

        let src = cv.imread(sourceCanvas);
        let gray = new cv.Mat();
        let blurred = new cv.Mat();
        let threshAnchors = new cv.Mat();
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();

        try {
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            let ksize = new cv.Size(5, 5);
            cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);

            // Threshold Adaptativo
            cv.adaptiveThreshold(blurred, threshAnchors, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 51, 15);

            // cv.findContours modifica a imagem, entao passamos um clone
            let threshClone = threshAnchors.clone();
            cv.findContours(threshClone, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            threshClone.delete();

            // Array para classificar os contornos
            let cntData = [];
            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let area = cv.contourArea(cnt);
                if (area > 80 && area < 100000) {
                    cntData.push({ area: area, cnt: cnt, index: i });
                } else {
                    cnt.delete();
                }
            }

            // Ordena descrescente por area
            cntData.sort((a, b) => b.area - a.area);

            let ancorasCandidatas = [];

            for (let i = 0; i < cntData.length; i++) {
                let cnt = cntData[i].cnt;
                let area = cntData[i].area;

                let peri = cv.arcLength(cnt, true);
                let approx = new cv.Mat();
                cv.approxPolyDP(cnt, approx, 0.05 * peri, true);

                if (approx.rows >= 4 && approx.rows <= 8) {
                    let rect = cv.boundingRect(approx);
                    let aspectRatio = rect.width / rect.height;

                    let hull = new cv.Mat();
                    cv.convexHull(cnt, hull, false, true);
                    let hullArea = cv.contourArea(hull);
                    let solidity = hullArea > 0 ? area / hullArea : 0;
                    hull.delete();

                    if (aspectRatio >= 0.5 && aspectRatio <= 1.8 && solidity > 0.7) {
                        let M = cv.moments(cnt);
                        if (M.m00 !== 0) {
                            let cx = M.m10 / M.m00;
                            let cy = M.m01 / M.m00;
                            ancorasCandidatas.push({ x: cx, y: cy });

                            if (ancorasCandidatas.length === 4) {
                                approx.delete();
                                break;
                            }
                        }
                    }
                }
                approx.delete();
            }

            let trustedArea = false;
            let docPtsRect = null;

            if (ancorasCandidatas.length === 4) {
                let ordered = orderPoints(cv, ancorasCandidatas);

                let tl = ordered[0], tr = ordered[1], br = ordered[2], bl = ordered[3];
                let widthA = getEuclidean(br, bl);
                let widthB = getEuclidean(tr, tl);
                let maxWidth = Math.max(widthA, widthB);

                let heightA = getEuclidean(tr, br);
                let heightB = getEuclidean(tl, bl);
                let maxHeight = Math.max(heightA, heightB);

                let proportao = maxWidth > 0 ? (maxHeight / maxWidth) : 0;

                if (proportao > 1.0 && proportao < 1.7) {
                    docPtsRect = ordered;
                    trustedArea = true;
                }
            }

            // === WARP PERSPECTIVE ===
            let w_px = 840;
            let h_px = 1188;
            let warped = new cv.Mat();
            let M_transform = null;

            if (docPtsRect !== null && trustedArea) {
                let m_px = 15 * 4; // 60px

                let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                    docPtsRect[0].x, docPtsRect[0].y,
                    docPtsRect[1].x, docPtsRect[1].y,
                    docPtsRect[2].x, docPtsRect[2].y,
                    docPtsRect[3].x, docPtsRect[3].y
                ]);

                let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                    m_px, m_px,
                    w_px - m_px, m_px,
                    w_px - m_px, h_px - m_px,
                    m_px, h_px - m_px
                ]);

                M_transform = cv.getPerspectiveTransform(srcTri, dstTri);
                let dsize = new cv.Size(w_px, h_px);
                cv.warpPerspective(gray, warped, M_transform, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

                srcTri.delete();
                dstTri.delete();
            } else {
                let dsize = new cv.Size(w_px, h_px);
                cv.resize(gray, warped, dsize, 0, 0, cv.INTER_AREA);
            }

            // Extração de bolinhas
            let blurredWarped = new cv.Mat();
            let ksizeWarp = new cv.Size(5, 5);
            cv.GaussianBlur(warped, blurredWarped, ksizeWarp, 0, 0, cv.BORDER_DEFAULT);

            let threshWarped = new cv.Mat();
            cv.adaptiveThreshold(blurredWarped, threshWarped, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 51, 15);

            let radius_px = 12;
            let areaMinima = Math.pow(2 * radius_px, 2) * 0.15;

            let opcoes = ['A', 'B', 'C', 'D', 'E'];
            let respostasLidas = {};

            for (let q = 1; q <= numQuestoes; q++) {
                let col = Math.floor((q - 1) / 20);
                let row = (q - 1) % 20;

                let yCenterMM = 75 + (row * 7);
                let xBaseMM = 25 + (col * 40);

                let somas = [];
                for (let idx = 0; idx < opcoes.length; idx++) {
                    let op = opcoes[idx];
                    let bxMM = xBaseMM + 10 + (idx * 6);

                    let bxPx = Math.floor(bxMM * 4);
                    let yPx = Math.floor(yCenterMM * 4);

                    let xMin = Math.max(0, bxPx - radius_px);
                    let xMax = Math.min(w_px, bxPx + radius_px);
                    let yMin = Math.max(0, yPx - radius_px);
                    let yMax = Math.min(h_px, yPx + radius_px);

                    let rect = new cv.Rect(xMin, yMin, xMax - xMin, yMax - yMin);
                    let roi = threshWarped.roi(rect);
                    let totalPixels = cv.countNonZero(roi);
                    somas.push({ count: totalPixels, op: op });
                    roi.delete();
                }

                somas.sort((a, b) => b.count - a.count);
                let maiorCount = somas[0].count;
                let opEscolhida = somas[0].op;

                if (maiorCount > areaMinima) {
                    let segundoCount = somas.length > 1 ? somas[1].count : 0;
                    if (segundoCount > maiorCount * 0.85) {
                        respostasLidas[q.toString()] = "Anulada";
                    } else {
                        respostasLidas[q.toString()] = opEscolhida;
                    }
                } else {
                    respostasLidas[q.toString()] = "Branco";
                }
            }

            // Cleanup Mats
            src.delete(); gray.delete(); blurred.delete(); threshAnchors.delete(); hierarchy.delete();
            for (let cnt of cntData) cnt.cnt.delete();
            warped.delete(); blurredWarped.delete(); threshWarped.delete();
            if (M_transform) M_transform.delete();

            // Mapeando do formato da API pro frontend original logicamente
            const answers = [];
            for (let i = 0; i < gabarito.questoes.length; i++) {
                const q = gabarito.questoes[i];
                const readChar = respostasLidas[q.id.toString()] || "Branco";
                answers.push({
                    id: q.id,
                    read: readChar,
                    correct: q.correct,
                    status: readChar === q.correct ? 'correct' : 'wrong'
                });
            }

            return {
                answers: answers,
                totalQuestions: gabarito.questoes.length,
                trustedArea: trustedArea,
                debugImage: null,
                qrCodeData: qrDict
            };

        } catch (error) {
            console.error("OpenCV OMR JS falhou: ", error);
            throw new Error("Erro na correção via OpenCV.js: " + error.message);
        }
    }
};
