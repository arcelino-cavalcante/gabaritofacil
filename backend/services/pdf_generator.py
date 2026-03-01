import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
import qrcode

def mm_to_pt(mm_value):
    return mm_value * 2.83465

def draw_anchor(c, x, y, size=10*mm):
    # Desenha um quadrado escuro com borda (Âncora de Alinhamento OMR)
    c.setFillColorRGB(0, 0, 0)
    c.rect(x - size/2, y - size/2, size, size, fill=1)
    
def draw_qrcode(c, data, x, y, size=30*mm):
    qr = qrcode.QRCode(version=1, box_size=10, border=0)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Salvar temporariamente na memoria
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".png") as temp_img:
        img.save(temp_img.name)
        c.drawImage(temp_img.name, x, y, width=size, height=size)

def draw_single_gabarito(c, offset_x, offset_y, turma_nome, nome_aluno, aluno_id, gabarito_id, num_questoes, scale):
    c.saveState()
    
    # 1. Translate point of origin to the block
    c.translate(offset_x, offset_y)
    
    # 2. Scale EVERYTHING inside this block to fit perfectly
    c.scale(scale, scale)
    
    # After scale, the logical width and height are still A4!
    w, h = A4
    
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(w/2, h - 25*mm, "GABARITO FÁCIL - Sistema OMR")
    
    c.setFont("Helvetica", 12)
    c.drawCentredString(w/2, h - 33*mm, f"Turma: {turma_nome}")
    if nome_aluno:
        c.drawCentredString(w/2, h - 39*mm, f"Aluno: {nome_aluno} (ID={aluno_id})")
    
    qr_data = f'{{"gabarito_id":"{gabarito_id}","aluno_id":"{aluno_id}"}}'
    
    # Âncoras OMR para a Perspectiva do OpenCV
    margin = 10*mm # Reduzido para ficar mais na borda
    anchor_size = 10*mm
    draw_anchor(c, margin + anchor_size/2, h - (margin + anchor_size/2), anchor_size) # Top-Left
    draw_anchor(c, w - (margin + anchor_size/2), h - (margin + anchor_size/2), anchor_size) # Top-Right
    draw_anchor(c, margin + anchor_size/2, margin + anchor_size/2, anchor_size) # Bottom-Left
    draw_anchor(c, w - (margin + anchor_size/2), margin + anchor_size/2, anchor_size) # Bottom-Right
    
    # QR Code posicionado na parte inferior central
    draw_qrcode(c, qr_data, (w - 25*mm) / 2, margin, size=25*mm)
    
    # Desenhar as Bolinhas do Gabarito (Matriz)
    c.setFont("Helvetica-Bold", 10)
    start_x = 25*mm
    start_y = h - 75*mm # Aumentado para 75mm (antes 60mm) para mais espaço de cabeçalho
    
    q_margin_y = 7*mm
    q_margin_x = 40*mm
    alt_radius = 2*mm # Tamanho da bolinha
    
    opcoes = ['A', 'B', 'C', 'D', 'E']
    
    for q in range(1, num_questoes + 1):
        col = (q - 1) // 20
        row = (q - 1) % 20
        
        y_pos = start_y - (row * q_margin_y)
        x_pos = start_x + (col * q_margin_x)
        
        # Desenha número da questão
        c.setFillColorRGB(0, 0, 0)
        c.drawString(x_pos, y_pos - alt_radius/2, f"{q:02d}.")
        
        # Desenha bolinhas
        for idx, op in enumerate(opcoes):
            bx = x_pos + 10*mm + (idx * 6*mm)
            by = y_pos
            c.setLineWidth(0.5)
            c.circle(bx, by, alt_radius, stroke=1, fill=0)
            
            # Texto da alternativa (tamanho e opacidade baixos para não travar a câmera)
            c.setFont("Helvetica", 6)
            c.drawCentredString(bx, by - 1*mm, op)
            c.setFont("Helvetica-Bold", 10)

    # Restaurar estado (p/ voltar coordenada raiz 0,0)
    c.restoreState()


def build_gabarito_pdf(turma_nome: str, alunos: list, gabarito_id: str, num_questoes: int = 40, layout: int = 1):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w_page, h_page = A4

    # Se a lista estiver vazia, geramos 1 gabarito em branco
    if not alunos:
        alunos = [{"id": "", "nome": ""}]
        
    # Dividir alunos em lotes do tamanho do layout escolhido
    for i in range(0, len(alunos), layout):
        lote = alunos[i:i + layout]
        
        if layout == 1:
            aluno = lote[0]
            draw_single_gabarito(c, 0, 0, turma_nome, aluno["nome"], aluno["id"], gabarito_id, num_questoes, 1.0)
            
        elif layout == 2:
            scale = 0.70 
            logical_h = h_page * scale
            logical_w = w_page * scale
            offset_x = (w_page - logical_w) / 2
            
            offset_y_top = h_page/2 + (h_page/2 - logical_h) / 2
            offset_y_bottom = (h_page/2 - logical_h) / 2
            
            c.setDash(6, 3)
            c.setLineWidth(0.5)
            c.line(0, h_page/2, w_page, h_page/2)
            c.setDash()
            
            # Top
            if len(lote) > 0:
                draw_single_gabarito(c, offset_x, offset_y_top, turma_nome, lote[0]["nome"], lote[0]["id"], gabarito_id, num_questoes, scale)
            # Bottom
            if len(lote) > 1:
                draw_single_gabarito(c, offset_x, offset_y_bottom, turma_nome, lote[1]["nome"], lote[1]["id"], gabarito_id, num_questoes, scale)
                
        elif layout == 4:
            scale = 0.48
            logical_h = h_page * scale
            logical_w = w_page * scale
            
            c.setDash(6, 3)
            c.setLineWidth(0.5)
            c.line(0, h_page/2, w_page, h_page/2)
            c.line(w_page/2, 0, w_page/2, h_page)
            c.setDash()
            
            gap_x = (w_page/2 - logical_w) / 2
            gap_y = (h_page/2 - logical_h) / 2
            
            positions = [
                (gap_x, h_page/2 + gap_y),          # Top-Left
                (w_page/2 + gap_x, h_page/2 + gap_y), # Top-Right
                (gap_x, gap_y),                     # Bottom-Left
                (w_page/2 + gap_x, gap_y)            # Bottom-Right
            ]
            
            for j, aluno_data in enumerate(lote):
                pos_x, pos_y = positions[j]
                draw_single_gabarito(c, pos_x, pos_y, turma_nome, aluno_data["nome"], aluno_data["id"], gabarito_id, num_questoes, scale)

        # Após desenhar os gabaritos dessa folha, vira a página
        c.showPage()
        
    c.save()
    
    buffer.seek(0)
    return buffer

