import fitz
from services.pdf_generator import build_gabarito_pdf
from services.omr_scanner import corrigir_gabarito_cv2
import json

def run_test():
    print("1. Gerando PDF de gabarito...")
    buffer = build_gabarito_pdf(
        turma_nome="Turma Teste OMR",
        nome_aluno="Aluno de Testes",
        aluno_id="US001",
        gabarito_id="GAB001",
        num_questoes=20
    )
    
    print("2. Simulando foto da câmera do celular (Convertendo PDF para JPG de 150 DPI)...")
    doc = fitz.open(stream=buffer.read(), filetype="pdf")
    page = doc.load_page(0)
    # Aumentando resolução matemática para simular câmera nítida do React
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img_bytes = pix.tobytes("jpg")
    
    print("3. Inserindo imagem fotografada no OpenCV (omr_scanner)...")
    try:
        res = corrigir_gabarito_cv2(img_bytes, num_questoes=20)
        print("\n--- STATUS DO MOTOR ---")
        print(f"Bordas e Âncoras Perfeitas (trusted_area): {res.get('trusted_area')}")
        print(f"Status da Leitura: {res.get('status')}")
        
        brancos = 0
        lidas = res.get('respostas_lidas', {})
        for q, resp in lidas.items():
            if resp == "Branco":
                brancos += 1
                
        print(f"Respostas lidas em branco na folha zerada: {brancos} de 20")
        
        if brancos == 20 and res.get('trusted_area') is True:
            print("\nSUCESSO TOTAL! O motor matemático é perfeitamente funcional!")
        else:
            print("\nAVISO: Ocorreu alguma distorção ou falha nas âncoras.")
            
    except Exception as e:
        print(f"FALHOU COM EXCEÇÃO: {e}")

if __name__ == "__main__":
    run_test()
