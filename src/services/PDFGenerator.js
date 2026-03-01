import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// Configurações de tamanho e posições (em milímetros - mm)
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

const drawAnchor = (doc, x, y, size = 10) => {
    // jsPDF rect: x, y, w, h, style ('F' = fill, 'D' = draw/stroke, 'DF' = draw and fill)
    doc.setFillColor(0, 0, 0); // Preto
    doc.rect(x - size / 2, y - size / 2, size, size, 'F');
};

const drawQRCode = async (doc, data, x, y, size = 30) => {
    try {
        // Gera o Data URI base64 da imagem do QR Code
        const qrDataUrl = await QRCode.toDataURL(data, {
            errorCorrectionLevel: 'L',
            margin: 0,
            width: size * 4 // Aumenta resolução do gerador para melhor qualidade no PDF
        });

        doc.addImage(qrDataUrl, 'PNG', x, y, size, size);
    } catch (error) {
        console.error("Erro ao gerar QR Code:", error);
    }
};

const drawSingleGabarito = async (doc, offsetX, offsetY, turmaNome, nomeAluno, alunoId, gabaritoId, numQuestoes, scale) => {
    // jsPDF não tem "c.saveState() / c.translate / c.scale" nativo como o ReportLab.
    // Portanto, criaremos uma função auxiliar que aplica as transformadas a todos os x, y desenhados.
    const transformX = (x) => offsetX + (x * scale);
    const transformY = (y) => offsetY + (y * scale);
    const transformSize = (s) => s * scale;

    const w = A4_WIDTH;
    const h = A4_HEIGHT;

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16 * scale);
    doc.text("GABARITO FÁCIL - Sistema OMR", transformX(w / 2), transformY(25), { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12 * scale);
    doc.text(`Turma: ${turmaNome}`, transformX(w / 2), transformY(33), { align: "center" });

    if (nomeAluno) {
        doc.text(`Aluno: ${nomeAluno} (ID=${alunoId})`, transformX(w / 2), transformY(39), { align: "center" });
    }

    const qrData = JSON.stringify({ gabarito_id: gabaritoId, aluno_id: alunoId });

    // Âncoras OMR
    const margin = 10;
    const anchorSize = 10;

    // Top-Left (y = margin)
    drawAnchor(doc, transformX(margin + anchorSize / 2), transformY(margin + anchorSize / 2), transformSize(anchorSize));
    // Top-Right
    drawAnchor(doc, transformX(w - (margin + anchorSize / 2)), transformY(margin + anchorSize / 2), transformSize(anchorSize));
    // Bottom-Left (y = h - margin)
    drawAnchor(doc, transformX(margin + anchorSize / 2), transformY(h - (margin + anchorSize / 2)), transformSize(anchorSize));
    // Bottom-Right
    drawAnchor(doc, transformX(w - (margin + anchorSize / 2)), transformY(h - (margin + anchorSize / 2)), transformSize(anchorSize));

    // QR Code posicionado na parte inferior central
    await drawQRCode(doc, qrData, transformX((w - 25) / 2), transformY(h - margin - 25), transformSize(25));

    // Desenhar Bolinhas (O ReportLab a posição Y=0 é BOTTOM. No jsPDF a posição Y=0 é o TOP!)
    // Precisamos inverter a lógica de coordenadas Y das bolinhas.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10 * scale);

    const startX = 25;
    const startY = 75; // No python era `h - 75` vindo de baixo. Aqui é 75 vindo de cima.

    const qMarginY = 7;
    const qMarginX = 40;
    const altRadius = 2;

    const opcoes = ['A', 'B', 'C', 'D', 'E'];

    for (let q = 1; q <= numQuestoes; q++) {
        const col = Math.floor((q - 1) / 20);
        const row = (q - 1) % 20;

        const yPos = startY + (row * qMarginY); // Somar aumenta o Y (desce) no jsPDF
        const xPos = startX + (col * qMarginX);

        // Número da questão
        doc.setTextColor(0, 0, 0);
        doc.text(`${q.toString().padStart(2, '0')}.`, transformX(xPos), transformY(yPos + (altRadius / 2)));

        // Bolinhas
        doc.setLineWidth(0.5 * scale);
        for (let idx = 0; idx < opcoes.length; idx++) {
            const op = opcoes[idx];
            const bx = xPos + 10 + (idx * 6);
            const by = yPos;

            // Desenha Círculo
            doc.circle(transformX(bx), transformY(by), transformSize(altRadius), 'S'); // 'S' = Stroke

            // Letra de Dentro
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6 * scale);
            doc.text(op, transformX(bx), transformY(by + 1), { align: "center" });

            // Retorna a fonte para negrito pro próximo número
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10 * scale);
        }
    }
};

export const PDFGenerator = {
    async buildGabaritoPDF(turmaNome, alunos, gabaritoId, numQuestoes = 40, layout = 1) {
        const orientation = layout === 2 ? 'landscape' : 'portrait';
        // orientation: portrait/landscape, unit: mm, format: a4
        const doc = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });

        // Se a lista estiver vazia (Gabarito Avulso), geramos a quantidade baseada no layout escolhido
        if (!alunos || alunos.length === 0) {
            alunos = Array(layout).fill({ id: "", nome: "" });
        }

        const wPage = layout === 2 ? A4_HEIGHT : A4_WIDTH;
        const hPage = layout === 2 ? A4_WIDTH : A4_HEIGHT;

        for (let i = 0; i < alunos.length; i += layout) {
            const lote = alunos.slice(i, i + layout);

            // Adiciona nova página a partir da segunda
            if (i > 0) {
                doc.addPage('a4', orientation);
            }

            if (layout === 1) {
                const aluno = lote[0];
                await drawSingleGabarito(doc, 0, 0, turmaNome, aluno.nome, aluno.id, gabaritoId, numQuestoes, 1.0);
            } else if (layout === 2) {
                const scale = 0.70;
                // As dimensões lógicas do gabarito (baseadas no A4 Portrait original)
                const logicalH = A4_HEIGHT * scale;
                const logicalW = A4_WIDTH * scale;

                // Em paisagem (w=297, h=210), alinhamos lado a lado (esquerda e direita)
                const offsetLeft = (wPage / 2 - logicalW) / 2;
                const offsetRight = (wPage / 2) + (wPage / 2 - logicalW) / 2;

                // Centraliza no eixo Y para não cortar
                const offsetY = (hPage - logicalH) / 2;

                // Linha de corte VERTICAL no meio da folha paisagem
                doc.setLineDashPattern([2, 1], 0);
                doc.setLineWidth(0.5);
                doc.line(wPage / 2, 0, wPage / 2, hPage);
                doc.setLineDashPattern([], 0); // Reset

                if (lote.length > 0) {
                    await drawSingleGabarito(doc, offsetLeft, offsetY, turmaNome, lote[0].nome, lote[0].id, gabaritoId, numQuestoes, scale);
                }
                if (lote.length > 1) {
                    await drawSingleGabarito(doc, offsetRight, offsetY, turmaNome, lote[1].nome, lote[1].id, gabaritoId, numQuestoes, scale);
                }
            } else if (layout === 4) {
                const scale = 0.48;
                const logicalH = hPage * scale;
                const logicalW = wPage * scale;

                // Linhas de corte em cruz
                doc.setLineDashPattern([2, 1], 0);
                doc.setLineWidth(0.5);
                doc.line(0, hPage / 2, wPage, hPage / 2);
                doc.line(wPage / 2, 0, wPage / 2, hPage);
                doc.setLineDashPattern([], 0);

                const gapX = (wPage / 2 - logicalW) / 2;
                const gapY = (hPage / 2 - logicalH) / 2;

                const positions = [
                    { x: gapX, y: gapY },                                      // Top-Left
                    { x: wPage / 2 + gapX, y: gapY },                          // Top-Right
                    { x: gapX, y: hPage / 2 + gapY },                          // Bottom-Left
                    { x: wPage / 2 + gapX, y: hPage / 2 + gapY }               // Bottom-Right
                ];

                for (let j = 0; j < lote.length; j++) {
                    const pos = positions[j];
                    await drawSingleGabarito(doc, pos.x, pos.y, turmaNome, lote[j].nome, lote[j].id, gabaritoId, numQuestoes, scale);
                }
            }
        }

        return doc;
    }
};
