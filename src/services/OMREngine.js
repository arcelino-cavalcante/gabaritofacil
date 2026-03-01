import jsQR from 'jsqr';

// ===== MOTOR OMR 100% JAVASCRIPT PURO =====
// Sem OpenCV WebAssembly. Usa apenas Canvas 2D API nativa do navegador.
// Compatível com TODOS os navegadores e dispositivos móveis.

// ----- Processamento de Imagem -----

function toGrayscale(data, length) {
    const gray = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        const o = i * 4;
        gray[i] = (data[o] * 77 + data[o + 1] * 150 + data[o + 2] * 29) >> 8;
    }
    return gray;
}

function adaptiveThreshold(gray, width, height, blockSize, C) {
    const binary = new Uint8Array(width * height);
    const half = (blockSize - 1) >> 1;
    const stride = width + 1;

    // Integral image
    const integral = new Float64Array(stride * (height + 1));
    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            rowSum += gray[y * width + x];
            integral[(y + 1) * stride + (x + 1)] = integral[y * stride + (x + 1)] + rowSum;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const y1 = Math.max(0, y - half);
            const y2 = Math.min(height - 1, y + half);
            const x1 = Math.max(0, x - half);
            const x2 = Math.min(width - 1, x + half);
            const count = (x2 - x1 + 1) * (y2 - y1 + 1);
            const sum = integral[(y2 + 1) * stride + (x2 + 1)]
                - integral[y1 * stride + (x2 + 1)]
                - integral[(y2 + 1) * stride + x1]
                + integral[y1 * stride + x1];
            binary[y * width + x] = gray[y * width + x] < (sum / count - C) ? 1 : 0;
        }
    }
    return binary;
}

// ----- Detecção de Âncoras -----

function findAnchorInRegion(binary, imgW, rX, rY, rW, rH, minArea, maxArea) {
    const visited = new Uint8Array(rW * rH);
    let best = null;

    for (let ry = 0; ry < rH; ry++) {
        for (let rx = 0; rx < rW; rx++) {
            const li = ry * rW + rx;
            if (visited[li]) continue;
            if (binary[(rY + ry) * imgW + (rX + rx)] !== 1) continue;

            // BFS flood fill
            const queue = [[rx, ry]];
            visited[li] = 1;
            let head = 0, sumX = 0, sumY = 0;
            let bx1 = rx, bx2 = rx, by1 = ry, by2 = ry;

            while (head < queue.length) {
                const [cx, cy] = queue[head++];
                sumX += cx; sumY += cy;
                if (cx < bx1) bx1 = cx; if (cx > bx2) bx2 = cx;
                if (cy < by1) by1 = cy; if (cy > by2) by2 = cy;

                for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx >= 0 && nx < rW && ny >= 0 && ny < rH) {
                        const ni = ny * rW + nx;
                        if (!visited[ni] && binary[(rY + ny) * imgW + (rX + nx)] === 1) {
                            visited[ni] = 1;
                            queue.push([nx, ny]);
                        }
                    }
                }
            }

            const area = queue.length;
            if (area < minArea || area > maxArea) continue;

            const bw = bx2 - bx1 + 1, bh = by2 - by1 + 1;
            const ar = bw / bh;
            const solidity = area / (bw * bh);

            if (ar >= 0.5 && ar <= 2.0 && solidity > 0.55) {
                if (!best || area > best.area) {
                    best = { area, cx: rX + sumX / area, cy: rY + sumY / area };
                }
            }
        }
    }
    return best;
}

function findAnchors(binary, w, h) {
    const mW = Math.floor(w * 0.35), mH = Math.floor(h * 0.35);
    const minA = Math.max(30, Math.floor(w * h * 0.0003));
    const maxA = Math.floor(w * h * 0.05);

    const corners = [
        { k: 'TL', x: 0, y: 0, w: mW, h: mH },
        { k: 'TR', x: w - mW, y: 0, w: mW, h: mH },
        { k: 'BL', x: 0, y: h - mH, w: mW, h: mH },
        { k: 'BR', x: w - mW, y: h - mH, w: mW, h: mH }
    ];

    const res = {};
    for (const c of corners) {
        const b = findAnchorInRegion(binary, w, c.x, c.y, c.w, c.h, minA, maxA);
        if (b) res[c.k] = { x: b.cx, y: b.cy };
    }
    return res;
}

// ----- Homografia (Perspectiva) -----

function solveLinear8(A, b) {
    const n = 8;
    const aug = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
        let mx = Math.abs(aug[col][col]), mr = col;
        for (let r = col + 1; r < n; r++) {
            if (Math.abs(aug[r][col]) > mx) { mx = Math.abs(aug[r][col]); mr = r; }
        }
        [aug[col], aug[mr]] = [aug[mr], aug[col]];
        if (Math.abs(aug[col][col]) < 1e-12) return null;
        for (let r = col + 1; r < n; r++) {
            const f = aug[r][col] / aug[col][col];
            for (let j = col; j <= n; j++) aug[r][j] -= f * aug[col][j];
        }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = aug[i][n];
        for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
        x[i] /= aug[i][i];
    }
    return x;
}

function computeHomography(idealPts, camPts) {
    const M = [], b = [];
    for (let i = 0; i < 4; i++) {
        const { x: ix, y: iy } = idealPts[i];
        const { x: cx, y: cy } = camPts[i];
        M.push([ix, iy, 1, 0, 0, 0, -ix * cx, -iy * cx]); b.push(cx);
        M.push([0, 0, 0, ix, iy, 1, -ix * cy, -iy * cy]); b.push(cy);
    }
    const h = solveLinear8(M, b);
    if (!h) return null;
    return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}

function mapPt(H, x, y) {
    const w = H[2][0] * x + H[2][1] * y + H[2][2];
    return { x: (H[0][0] * x + H[0][1] * y + H[0][2]) / w, y: (H[1][0] * x + H[1][1] * y + H[1][2]) / w };
}

// ----- Leitura de Bolinhas -----

function sampleDark(binary, w, h, cx, cy, r) {
    let count = 0;
    const ri = Math.round(r);
    for (let dy = -ri; dy <= ri; dy++) {
        for (let dx = -ri; dx <= ri; dx++) {
            if (dx * dx + dy * dy > ri * ri) continue;
            const px = Math.round(cx + dx), py = Math.round(cy + dy);
            if (px >= 0 && px < w && py >= 0 && py < h && binary[py * w + px] === 1) count++;
        }
    }
    return count;
}

// ----- Constantes do Gabarito (mm) -----

const IDEAL_ANCHORS = [
    { x: 15, y: 15 },   // TL
    { x: 195, y: 15 },  // TR
    { x: 195, y: 282 }, // BR
    { x: 15, y: 282 }   // BL
];

const BL = {
    startX: 25, startY: 75,
    qSpacingY: 7, colSpacingX: 40,
    optOffset: 10, optSpacing: 6,
    bubbleR: 2, qPerCol: 20
};

const OPTS = ['A', 'B', 'C', 'D', 'E'];

// ----- Motor Principal -----

export const OMREngine = {
    isLoaded: true,

    async init() { /* Nada para carregar - 100% JavaScript puro! */ },

    async scanAndRead(sourceElement, gabarito) {
        const numQ = gabarito.questoes ? gabarito.questoes.length : 20;

        // 1. Capturar frame para Canvas
        const MAX_W = 1200;
        const canvas = document.createElement('canvas');
        const origW = sourceElement.videoWidth || sourceElement.width || 1280;
        const origH = sourceElement.videoHeight || sourceElement.height || 720;
        const sc = origW > MAX_W ? MAX_W / origW : 1;

        canvas.width = Math.round(origW * sc);
        canvas.height = Math.round(origH * sc);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { width: W, height: H } = imageData;

        // 2. QR Code (informativo)
        let qrDict = null;
        try {
            const code = jsQR(imageData.data, W, H, { inversionAttempts: "dontInvert" });
            if (code && code.data) { try { qrDict = JSON.parse(code.data); } catch (e) { /* ok */ } }
        } catch (e) { /* ok */ }

        // 3. Grayscale + Threshold
        const gray = toGrayscale(imageData.data, W * H);
        const binary = adaptiveThreshold(gray, W, H, 41, 10);

        // 4. Achar âncoras
        const anchors = findAnchors(binary, W, H);
        const trusted = !!(anchors.TL && anchors.TR && anchors.BL && anchors.BR);

        // 5. Homografia
        let Hmat;
        if (trusted) {
            Hmat = computeHomography(IDEAL_ANCHORS, [anchors.TL, anchors.TR, anchors.BR, anchors.BL]);
        }
        if (!Hmat) {
            const px = W * 0.05, py = H * 0.05;
            Hmat = computeHomography(IDEAL_ANCHORS, [
                { x: px, y: py }, { x: W - px, y: py },
                { x: W - px, y: H - py }, { x: px, y: H - py }
            ]);
        }

        // 6. Escala de amostragem
        const p1 = mapPt(Hmat, 0, 0), p2 = mapPt(Hmat, 10, 0);
        const mmToPx = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) / 10;
        const sampleR = Math.max(3, Math.round(BL.bubbleR * mmToPx * 0.8));
        const minFill = Math.PI * sampleR * sampleR * 0.12;

        // 7. Ler bolinhas
        const respostas = {};
        const bubbleData = {};

        for (let q = 1; q <= numQ; q++) {
            const col = Math.floor((q - 1) / BL.qPerCol);
            const row = (q - 1) % BL.qPerCol;
            const yMM = BL.startY + row * BL.qSpacingY;
            const xBase = BL.startX + col * BL.colSpacingX;

            const scores = [];
            for (let idx = 0; idx < OPTS.length; idx++) {
                const bxMM = xBase + BL.optOffset + idx * BL.optSpacing;
                const pt = mapPt(Hmat, bxMM, yMM);
                const dark = sampleDark(binary, W, H, pt.x, pt.y, sampleR);
                scores.push({ op: OPTS[idx], count: dark, pt });
            }

            scores.sort((a, b) => b.count - a.count);
            const best = scores[0];

            if (best.count > minFill) {
                const second = scores[1];
                respostas[q] = (second.count > best.count * 0.85) ? "Anulada" : best.op;
            } else {
                respostas[q] = "Branco";
            }
            bubbleData[q] = { scores, read: respostas[q] };
        }

        // 8. Debug image
        let debugImageUrl = null;
        try {
            const dc = document.createElement('canvas');
            dc.width = W; dc.height = H;
            const dctx = dc.getContext('2d');
            dctx.drawImage(canvas, 0, 0);

            if (trusted) {
                dctx.strokeStyle = '#00FF00'; dctx.lineWidth = 3;
                for (const k of ['TL', 'TR', 'BL', 'BR']) {
                    const a = anchors[k];
                    dctx.strokeRect(a.x - 12, a.y - 12, 24, 24);
                }
            }

            for (let q = 1; q <= numQ; q++) {
                const bd = bubbleData[q];
                const correct = gabarito.questoes[q - 1].correct;
                const read = bd.read;

                for (const s of bd.scores) {
                    if (s.op !== read && read !== "Anulada") continue;
                    let color;
                    if (read === "Anulada") color = '#FFFF00';
                    else if (read === "Branco") color = '#0088FF';
                    else if (read === correct) color = '#00FF00';
                    else color = '#FF0000';

                    dctx.strokeStyle = color; dctx.lineWidth = 2;
                    dctx.beginPath();
                    dctx.arc(s.pt.x, s.pt.y, sampleR + 2, 0, Math.PI * 2);
                    dctx.stroke();
                }
            }
            debugImageUrl = dc.toDataURL('image/jpeg', 0.7);
        } catch (e) { console.error('Debug img error:', e); }

        // 9. Resultado final
        const answers = gabarito.questoes.map(q => {
            const read = respostas[q.id] || "Branco";
            return { id: q.id, read, correct: q.correct, status: read === q.correct ? 'correct' : 'wrong' };
        });

        return {
            answers,
            totalQuestions: gabarito.questoes.length,
            trustedArea: trusted,
            debugImage: debugImageUrl,
            qrCodeData: qrDict
        };
    }
};
