import { jsPDF } from 'jspdf';

/**
 * Gera PDF com opções de layout (1, 2 ou 4 por folha)
 * @param {Object} gabarito - Dados do gabarito (nome, questoes, etc)
 * @param {Object} turma - Dados da turma (opcional)
 * @param {Array} alunos - Lista de alunos (opcional for nominal)
 * @param {Object} cabecalho - Configuração de cabeçalho (escola, professor)
 * @param {number} layout - 1, 2 ou 4 (gabaritos por página)
 */
export const gerarPDFGabarito = (gabarito, turma = null, alunos = [], cabecalho = null, layout = 1) => {
    const doc = new jsPDF();

    // Configurações Globais
    const nomeGabarito = gabarito.nome || "Gabarito Sem Nome";
    const dataProva = gabarito.dataProva;

    // Função de desenho "atómica" do gabarito
    const desenharGabaritoLocal = (doc, startX, startY, scale, alunoData = null) => {
        const alunoNome = alunoData?.nome || '';
        const alunoCodigo = alunoData?.codigo || '';

        // Ajuste de escala
        // jsPDF não tem um "context.scale" nativo fácil para texto/rects combinados sem plugin, 
        // mas podemos multiplicar coordenadas e tamanhos.
        // Ou melhor: criar uma instancia separada? Não, tem que ser no mesmo doc.
        // Vamos aplicar scale manualmente nas coordenadas relativas.

        // Funções auxiliares escaladas
        const s = (val) => val * scale;

        // CABEÇALHO
        // Âncoras
        doc.setFillColor(0, 0, 0);
        const anchorSize = s(10);

        // Posições Âncoras (Relativas ao startX/Y e tamanho "virtual" A4 scaled)
        // A4 virtual width = 210 * scale? Não, contentWidth = 170.
        // Vamos assumir que o bloco do gabarito tem tam fixo original 190x280 (margem 10)
        // e nós escalamos isso.

        // Âncoras originais: (10,10), (190,10), (10,277), (190,277)
        // Mas espere, se formos fazer 2x ou 4x, o scanner PRECISA achar as âncoras.
        // Se encolhermos o gabarito (4x), o scanner precisa saber lidar com isso?
        // O user quer "imprimir gabaritos". Se ele quer 4 por folha, provavelmente vai cortar a folha para entregar?
        // Se for cortar, cada pedaço vira um "mini gabarito". O scanner vai ler uma foto desse pedaço.
        // Se a foto for tirada de perto, o tamanho relativo das âncoras na imagem vai ser similar a um gabarito full A4 tirado de longe?
        // Sim. Então o desenho deve manter as proporções relativas.

        // Definindo limites do "bloco" gabarito
        // Vamos considerar um bloco padrão de largura 210mm e altura proporcional (297/4 para 4x? ou 297/2 para 2x?)

        // Layout 1: x=0, y=0, w=210, h=297 (Full Page)
        // Layout 2: x=0, y=0, w=210, h=148.5 (Top) | x=0, y=148.5 (Bottom) -> Corta-se ao meio?
        // Layout 4: Grid 2x2. (105x148.5 cada)

        // Margem interna do bloco
        const marginX = s(10);
        const marginY = s(10);

        // Desenhar Âncoras (Cantos do bloco virtual)
        // Top Left
        doc.rect(startX + marginX, startY + marginY, anchorSize, anchorSize, 'F');
        // Top Right (Considerando largura 'padrão' do bloco = 210mm antes do scale)
        const blockWidth = s(210);
        const blockHeight = s(297);
        // Ajuste: 190 é o x final da âncora direita original em A4 (210 - 10 - 10) = 190? Não. 10(margin)+size(10) = 20. 210-20=190.
        // Na verdade âncora direita começa em 190 e vai até 200.
        doc.rect(startX + blockWidth - marginX - anchorSize, startY + marginY, anchorSize, anchorSize, 'F');

        // Bottom Left
        // Para layout 1: y=277. Para outros, proporcional ao blockHeight?
        // O original era fixo em 277 (perto do 297).
        // Vamos usar blockHeight - margin - anchorSize
        doc.rect(startX + marginX, startY + blockHeight - marginY - anchorSize, anchorSize, anchorSize, 'F');
        // Bottom Right
        doc.rect(startX + blockWidth - marginX - anchorSize, startY + blockHeight - marginY - anchorSize, anchorSize, anchorSize, 'F');

        // --- HEADER ---
        // Y original era 22.
        const headerY = startY + s(22);
        const headerX = startX + s(20);
        const contentW = s(170);

        const row1H = s(7);
        const row2H = s(7);
        const row3H = s(7);
        const row4H = s(9);
        const totalH = row1H + row2H + row3H + row4H;

        doc.setDrawColor(0);
        doc.setLineWidth(s(0.3));
        doc.setTextColor(0);
        doc.rect(headerX, headerY, contentW, totalH);

        // Lines & Text Helper
        const line = (x1, y1, x2, y2) => doc.line(x1, y1, x2, y2);
        const txt = (text, x, y, size, font = 'normal', align = 'left', color = 0) => {
            doc.setFont("helvetica", font);
            doc.setFontSize(size * scale); // Scale font size directly
            doc.setTextColor(color);
            doc.text(String(text), x, y, { align });
            doc.setTextColor(0);
        };

        // Linha 1: Escola
        doc.setLineWidth(s(0.1));
        line(headerX, headerY + row1H, headerX + contentW, headerY + row1H);
        const escolaTexto = cabecalho?.escola ? cabecalho.escola.toUpperCase() : "ESCOLA / INSTITUIÇÃO";
        txt(escolaTexto, headerX + (contentW / 2), headerY + s(5), 11, 'bold', 'center');

        // Linha 2/3 Grid
        const yRow2 = headerY + row1H;
        const yRow3 = yRow2 + row2H;
        const yRow4 = yRow3 + row3H;

        line(headerX, yRow3, headerX + contentW, yRow3);
        line(headerX, yRow4, headerX + contentW, yRow4);

        const col1W = s(115);
        line(headerX + col1W, yRow2, headerX + col1W, yRow4);

        // Field Helper
        const field = (label, val, x, y) => {
            txt(label, x + s(1), y + s(2.5), 6, 'normal', 'left', 80); // gray label
            txt(val, x + s(1), y + s(6), 9, 'bold', 'left', 0);
        };

        const nomeProva = nomeGabarito.toUpperCase() || "AVALIAÇÃO";
        let dataTexto = "__ / __ / ____";
        if (dataProva) dataTexto = new Date(dataProva + 'T00:00:00').toLocaleDateString('pt-BR');
        const nomeProf = (cabecalho?.professor || "").toUpperCase();
        const nomeTurma = turma?.nome || "";

        field("AVALIAÇÃO / DISCIPLINA:", nomeProva, headerX, yRow2);
        field("DATA:", dataTexto, headerX + col1W, yRow2);
        field("PROFESSOR(A):", nomeProf, headerX, yRow3);
        field("TURMA:", nomeTurma, headerX + col1W, yRow3);

        // Row 4: Aluno name
        txt("ALUNO(A):", headerX + s(2), yRow4 + s(6), 8, 'bold');
        if (alunoNome) {
            txt(alunoNome.toUpperCase(), headerX + s(22), yRow4 + s(6), 10, 'bold');
        }

        // --- FOOTER ELEMENTS (Title & ID) ---
        // Title Y original: header end + 8
        const titleY = headerY + totalH + s(8);
        txt("FOLHA DE RESPOSTAS", headerX + (contentW / 2), titleY, 14, 'bold', 'center');
        txt("Preencha o círculo completamente com caneta preta ou azul escura.", headerX + (contentW / 2), titleY + s(4), 7, 'normal', 'center');

        // ID no fundo do bloco
        if (alunoCodigo) {
            // Posição Y relativa ao fim do bloco
            const footerY = startY + blockHeight - s(12); // Perto das âncoras de baixo
            doc.setFont("courier", "normal");
            doc.setFontSize(8 * scale);
            doc.setTextColor(100);
            doc.text(`ID: ${alunoCodigo}`, headerX + (contentW / 2), footerY, { align: "center" });
            doc.setTextColor(0);
        }

        // --- QUESTIONS ---
        // Y original 75.
        const qStartY = startY + s(75);
        const col1X = startX + s(25);
        const col2X = startX + s(115);
        const limitPerColumn = 20;

        gabarito.questoes.forEach((q, index) => {
            const isSecondColumn = index >= limitPerColumn;
            const i = isSecondColumn ? index - limitPerColumn : index;
            const xBase = isSecondColumn ? col2X : col1X;
            const yPos = qStartY + (i * s(12));

            // Number
            txt(String(q.id).padStart(2, '0'), xBase, yPos, 11, 'bold');

            // Bubbles
            const alternativesCount = q.alternatives || 5;
            const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, alternativesCount);

            letters.forEach((letter, lIndex) => {
                const xCircle = xBase + s(15) + (lIndex * s(12));
                doc.setLineWidth(s(0.3));
                doc.circle(xCircle + s(1.5), yPos - s(1), s(3.5), 'S');
                txt(letter, xCircle + s(0.5), yPos, 8, 'normal');
            });
        });

        // Cut Lines (Dotted) for separation if not 1x layout
        if (layout === 2) {
            // Line in bottom of block?
            // Actually drawing cut lines between blocks is safer in the main loop
        }
    };


    // --- LOGICA DE PAGINAÇÃO E LAYOUT ---

    // Configurações de Grid
    // A4 Portrait: 210 x 297 mm
    // A4 Landscape: 297 x 210 mm

    let pageOrientation = 'p'; // portrait default
    let rows = 1;
    let cols = 1;
    let scale = 1.0;

    if (layout === 2) {
        // Layout 2: Landscape, 2 columns (Side by Side)
        pageOrientation = 'l'; // Landscape
        rows = 1;
        cols = 2; // Side by side
        scale = 0.70; // 70% scale - Good size for A5 equivalent
    }
    else if (layout === 4) {
        scale = 0.5;
        rows = 2;
        cols = 2;
    }

    // Set orientation if not default
    if (pageOrientation === 'l') {
        doc.deletePage(1); // Remove default page
        doc.addPage('a4', 'l');
    }

    // Block dimensions based on orientation
    const pageWidth = pageOrientation === 'l' ? 297 : 210;
    const pageHeight = pageOrientation === 'l' ? 210 : 297;

    const blockW = pageWidth / cols;
    const blockH = pageHeight / rows;

    // Page Loop
    // Logic: Iterate items (Alunos) or just duplicates if Simples.

    // Se Simples (sem alunos), geramos N cópias na mesma folha se der.
    // Se Nominal (alunos), preenchemos os slots da grid com alunos sequenciais.

    let itemsToPrint = [];
    if (gabarito.tipo === 'nominal' && alunos.length > 0) {
        itemsToPrint = alunos.map(a => ({
            type: 'aluno',
            data: { nome: a.nome, codigo: `${turma?.id}-${a.id}` }
        }));
    } else {
        // Simples: Preencher a página inteira com cópias em branco?
        // Se layout=1 -> 1 cópia.
        // Se layout=2 -> 2 cópias iguais na pagina.
        // Se layout=4 -> 4 cópias iguais na pagina.
        const count = (layout === 1) ? 1 : layout;
        for (let i = 0; i < count; i++) {
            itemsToPrint.push({ type: 'simples', data: null });
        }
    }

    // Render loop
    let currentSlot = 0; // 0 to (rows*cols - 1)
    const slotsPerPage = rows * cols;

    itemsToPrint.forEach((item, index) => {
        // New page if slot full
        if (index > 0 && index % slotsPerPage === 0) {
            doc.addPage('a4', pageOrientation);
            currentSlot = 0;
            // Draw cut lines for previous page? (Hard to do after addPage)
            // Ideally draw cut lines as we go or at end of page filler.
        }

        const row = Math.floor(currentSlot / cols);
        const col = currentSlot % cols;

        const slotX = col * blockW;
        const slotY = row * blockH;

        // Centro do slot para centralizar o gabarito escalado?
        // O gabarito desenhado tem width "virtual" 210.
        // Se scale=0.5, width real = 105.
        // Se blockW = 105 (layout 4), encaixa perfeito.
        // Se blockW = 210 (layout 2), scale 0.5 (width 105), sobra espaço lateral. Centralizar.

        const drawnWidth = 210 * scale;
        const offsetX = slotX + (blockW - drawnWidth) / 2;

        // E o Y? Centralizar ou topo? Melhor topo com margem pequena?
        // Manter proporção margem 0.
        const offsetY = slotY; // + (blockH - 297*scale)/2 could center vertically too

        desenharGabaritoLocal(doc, offsetX, offsetY, scale, item.data);

        // Draw Cut Lines (Dotted)
        doc.setLineWidth(0.1);
        doc.setDrawColor(200);

        // Vertical dividing line (only for layout 4, at 50%)
        if (cols === 2 && col === 0) {
            // Draw line at right of this slot
            doc.line(slotX + blockW, slotY, slotX + blockW, slotY + blockH);
        }
        // Horizontal dividing line (only for layout 2 or 4, at 50%)
        if (rows === 2 && row === 0) {
            // Draw line at bottom of this slot
            doc.line(slotX, slotY + blockH, slotX + blockW, slotY + blockH);
        }

        currentSlot++;
    });

    return doc;
};
