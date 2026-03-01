import cv2
import numpy as np
import base64
import json

def corrigir_gabarito_cv2(image_bytes: bytes, num_questoes: int, alternativas: int = 5):
    """
    Motor principal OMR Profissional (Anchor-based).
    Procura as 4 âncoras (marcadores fiduciários) perfeitamente posicionadas nos cantos da folha.
    Garante precisão milimétrica mesmo com papel torto, fundo escuro ou sombras.
    """
    np_img = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    
    if image is None:
        raise ValueError("Imagem inválida ou corrompida.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Threshold Adaptativo para lidar com sombras pesadas
    thresh_anchors = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 51, 15
    )

    # 1. Encontrar possíveis Âncoras (Quadrados Pretos Perfeitos Mínimos)
    contours, _ = cv2.findContours(thresh_anchors.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Ordenar por área para pegar os componentes mais relevantes primeiro
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    ancoras_candidatas = []
    for c in contours:
        area = cv2.contourArea(c)
        if 80 < area < 100000: # Filtro de tamanho para âncoras afrouxado
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.05 * peri, True) # Maior tolerância na aproximação
            
            if 4 <= len(approx) <= 8: # Pode não ser um quadrado perfeito após processamento visual
                # Checar se é aproximadamente um quadrado
                (x, y, w, h) = cv2.boundingRect(approx)
                aspectRatio = w / float(h)
                
                # Checar solidez (Se é bem preenchido)
                hull = cv2.convexHull(c)
                hull_area = cv2.contourArea(hull)
                solidity = area / float(hull_area) if hull_area > 0 else 0
                
                # Critérios mais lenientes para Aspect Ratio (devido à perspectiva da câmera do celular)
                if 0.5 <= aspectRatio <= 1.8 and solidity > 0.7:
                    # Guardar o centroide matemático desta possível âncora
                    M = cv2.moments(c)
                    if M["m00"] != 0:
                        cX = int(M["m10"] / M["m00"])
                        cY = int(M["m01"] / M["m00"])
                        ancoras_candidatas.append((cX, cY))
                        
                        # Se já achamos as 4 âncoras principais (maiores áreas), paramos
                        if len(ancoras_candidatas) == 4:
                            break

    trusted_area = False
    doc_pts = None

    # Se achamos exatamente as 4 âncoras
    if len(ancoras_candidatas) == 4:
        # A matemática dita que a soma/diferença das coordenadas acha rapidamente os cantos
        pts = np.array(ancoras_candidatas, dtype="float32")
        rect = order_points(pts)
        
        # O quão "retangular" é a formação dessas 4 possíveis âncoras?
        # Num A4, a proporção Height/Width é ~1.414 (297/210)
        (tl, tr, br, bl) = rect
        widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        maxWidth = max(int(widthA), int(widthB))
        
        heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        maxHeight = max(int(heightA), int(heightB))
        
        proporcao = maxHeight / float(maxWidth) if maxWidth > 0 else 0
        
        # Folha A4 tem proporção ~1.41. As âncoras estao recuadas, mas devem manter proximidade (1.2 a 1.6)
        if 1.0 < proporcao < 1.7:
            # SUCESSO! Encontrou as 4 âncoras perfeitamente!
            doc_pts = rect
            trusted_area = True

    # 2. SE FALHOU O MARKER FIDUCIAL, TENTA O FALLBACK ANTIGO (Borda da Mesa)
    if not trusted_area:
        edged = cv2.Canny(blurred, 75, 200)
        contours_fallback, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours_fallback:
            contours_fallback = sorted(contours_fallback, key=cv2.contourArea, reverse=True)
            for c in contours_fallback:
                peri = cv2.arcLength(c, True)
                approx = cv2.approxPolyDP(c, 0.02 * peri, True)
                if len(approx) == 4:
                    doc_pts = approx.reshape(4, 2)
                    trusted_area = True # Consider document boundaries a trusted area too
                    break

    # 3. WARP PERSPECTIVE RESOLUTION (DPI Fixo)
    # Vamos padronizar a folha em exatamente 4 pixels por milímetro (Alta precisão matemática)
    # A4 = 210mm x 297mm -> 840px x 1188px
    w_px, h_px = 840, 1188
    
    if doc_pts is not None:
        if trusted_area:
            # As âncoras no PDF (pdf_generator.py) estão colocadas exatamente no meio de margens de 10mm + 5mm(raio).
            # Centro da Âncora = 15mm das bordas reais do papel.
            # Logo, as âncoras no nosso mapa de Px (escala 4) precisam ir para exatamente X=60, Y=60 (Top-left)
            m_px = 15 * 4 # 60px de recuo real
            dst = np.array([
                [m_px, m_px],                     # Top-Left
                [w_px - m_px, m_px],              # Top-Right
                [w_px - m_px, h_px - m_px],       # Bottom-Right
                [m_px, h_px - m_px]               # Bottom-Left
            ], dtype="float32")
            M = cv2.getPerspectiveTransform(doc_pts, dst)
            warped = cv2.warpPerspective(gray, M, (w_px, h_px))
        else:
            # Fallback (A borda inteira do papel vai para as extremidades 0 a largura)
            # Obs: Como `four_point_transform` ajusta o tamanho automaticamente sem manter o aspecto A4 absoluto, 
            # forçamos o resize depois.
            warped_raw = four_point_transform(gray, doc_pts)
            warped = cv2.resize(warped_raw, (w_px, h_px))
    else:
        # Pior cenário: Lê a imagem crua redimensionada
        warped = cv2.resize(gray, (w_px, h_px))

    # Suaviza e aplica Adaptive Threshold para as questões (Robusto pra sombras de celular)
    blurred_warped = cv2.GaussianBlur(warped, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blurred_warped, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 51, 15
    )

    # Constantes milimétricas transportadas para Pixels (escala * 4)
    # Bolinhas de 2mm raio -> 8px real. Usaremos 12px para folga (cobre 3mm totais)
    radius_px = 12 
    area_minima = (2 * radius_px) ** 2 * 0.15 # Requer >= 15% do quadradinho preenchido de preto forte

    opcoes = ['A', 'B', 'C', 'D', 'E']
    respostas_lidas = {}

    for q in range(1, num_questoes + 1):
        col = (q - 1) // 20
        row = (q - 1) % 20
        
        # O PDF desenha partindo do topo. 75mm offset top + 7mm por linha
        y_center_mm = 75 + (row * 7)
        x_base_mm = 25 + (col * 40)
        
        somas = []
        for idx, op in enumerate(opcoes):
            bx_mm = x_base_mm + 10 + (idx * 6)
            
            # Converter MM para PX matematicamente
            bx_px = int(bx_mm * 4)
            y_px = int(y_center_mm * 4)
            
            # Recortar ROI Quadrado ao redor
            x_min = max(0, bx_px - radius_px)
            x_max = min(w_px, bx_px + radius_px)
            y_min = max(0, y_px - radius_px)
            y_max = min(h_px, y_px + radius_px)
            
            roi = thresh[y_min:y_max, x_min:x_max]
            total_pixels = cv2.countNonZero(roi) # Pixels marcados
            somas.append((total_pixels, op))
            
        somas.sort(key=lambda x: x[0], reverse=True)
        maior_count, op_escolhida = somas[0]
        
        if maior_count > area_minima:
            segundo_count = somas[1][0] if len(somas) > 1 else 0
            if segundo_count > maior_count * 0.85: # Quase mesma intensidade em duas anula
                respostas_lidas[str(q)] = "Anulada"
            else:
                respostas_lidas[str(q)] = op_escolhida
        else:
            respostas_lidas[str(q)] = "Branco"

    # 4. DECODIFICAR QR CODE PARA IDENTIFICAÇÃO DO ALUNO (Nominal)
    qr_dict = None
    try:
        qrDetector = cv2.QRCodeDetector()
        # Tenta ler na imagem corrigida
        qr_data, _, _ = qrDetector.detectAndDecode(warped)
        if not qr_data:
            # Tenta na imagem original se falhar na corrigida
            qr_data, _, _ = qrDetector.detectAndDecode(image)
            
        if qr_data:
            qr_dict = json.loads(qr_data)
    except Exception as e:
        print(f"Aviso OMR: Não foi possivel ler o QR Code: {e}")

    return {
        "status": "success",
        "respostas_lidas": respostas_lidas,
        "trusted_area": trusted_area,
        "qrCodeData": qr_dict
    }

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped
