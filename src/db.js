import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'GabaritoFacilDB';
const DB_VERSION = 2;

// Inicializa o banco de dados
export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Object Store: Gabaritos
            if (!db.objectStoreNames.contains('gabaritos')) {
                const gabaritoStore = db.createObjectStore('gabaritos', { keyPath: 'id' });
                gabaritoStore.createIndex('turmaId', 'turmaId', { unique: false });
                gabaritoStore.createIndex('criacao', 'criacao', { unique: false });
            }

            // Object Store: Turmas
            if (!db.objectStoreNames.contains('turmas')) {
                db.createObjectStore('turmas', { keyPath: 'id' });
            }

            // Object Store: Alunos
            if (!db.objectStoreNames.contains('alunos')) {
                const alunoStore = db.createObjectStore('alunos', { keyPath: 'id' });
                alunoStore.createIndex('turmaId', 'turmaId', { unique: false });
            }

            // Object Store: Notas
            if (!db.objectStoreNames.contains('notas')) {
                const notaStore = db.createObjectStore('notas', { keyPath: 'id' });
                notaStore.createIndex('alunoId', 'alunoId', { unique: false });
            }

            // Object Store: Cabeçalhos
            if (!db.objectStoreNames.contains('cabecalhos')) {
                db.createObjectStore('cabecalhos', { keyPath: 'id' });
            }
        };
    });
};

// ... (existing code) ...

// ===== CABEÇALHOS =====
export const salvarCabecalho = async (cabecalho) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['cabecalhos'], 'readwrite');
        const store = transaction.objectStore('cabecalhos');

        const novoCabecalho = {
            ...cabecalho,
            id: cabecalho.id || uuidv4(),
            criacao: cabecalho.criacao || new Date().toISOString()
        };

        const request = store.put(novoCabecalho);
        request.onsuccess = () => resolve(novoCabecalho);
        request.onerror = () => reject(request.error);
    });
};

export const listarCabecalhos = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['cabecalhos'], 'readonly');
        const store = transaction.objectStore('cabecalhos');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const excluirCabecalho = async (id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['cabecalhos'], 'readwrite');
        const store = transaction.objectStore('cabecalhos');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// ===== GABARITOS =====
export const salvarGabarito = async (gabarito) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['gabaritos'], 'readwrite');
        const store = transaction.objectStore('gabaritos');

        const novoGabarito = {
            ...gabarito,
            id: gabarito.id || uuidv4(),
            criacao: gabarito.criacao || new Date().toISOString()
        };

        const request = store.put(novoGabarito);
        request.onsuccess = () => resolve(novoGabarito);
        request.onerror = () => reject(request.error);
    });
};

export const listarGabaritos = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['gabaritos'], 'readonly');
        const store = transaction.objectStore('gabaritos');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const buscarGabarito = async (id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['gabaritos'], 'readonly');
        const store = transaction.objectStore('gabaritos');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const excluirGabarito = async (id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['gabaritos'], 'readwrite');
        const store = transaction.objectStore('gabaritos');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const duplicarGabarito = async (gabaritoOriginal) => {
    const db = await initDB();
    const novoGabarito = {
        ...gabaritoOriginal,
        id: uuidv4(),
        nome: `${gabaritoOriginal.nome} (Cópia)`,
        criacao: new Date().toISOString()
    };

    // Se for nominal, remove vínculos com turma antiga ou mantém (decisão de negócio: manter null para re-vincular)
    // Aqui vamos manter simples: cópia exata, user edita depois.

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['gabaritos'], 'readwrite');
        const store = transaction.objectStore('gabaritos');
        const request = store.add(novoGabarito);

        request.onsuccess = () => resolve(novoGabarito);
        request.onerror = () => reject(request.error);
    });
};

// ===== TURMAS =====
export const salvarTurma = async (turma) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['turmas'], 'readwrite');
        const store = transaction.objectStore('turmas');

        const novaTurma = {
            ...turma,
            id: turma.id || uuidv4(),
            criacao: turma.criacao || new Date().toISOString()
        };

        const request = store.put(novaTurma);
        request.onsuccess = () => resolve(novaTurma);
        request.onerror = () => reject(request.error);
    });
};

export const listarTurmas = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['turmas'], 'readonly');
        const store = transaction.objectStore('turmas');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const obterTurma = async (id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['turmas'], 'readonly');
        const store = transaction.objectStore('turmas');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const buscarTurma = async (id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['turmas'], 'readonly');
        const store = transaction.objectStore('turmas');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const excluirTurma = async (id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['turmas'], 'readwrite');
        const store = transaction.objectStore('turmas');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// ===== ALUNOS =====
export const salvarAluno = async (aluno) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['alunos'], 'readwrite');
        const store = transaction.objectStore('alunos');

        const novoAluno = {
            ...aluno,
            id: aluno.id || uuidv4()
        };

        const request = store.put(novoAluno);
        request.onsuccess = () => resolve(novoAluno);
        request.onerror = () => reject(request.error);
    });
};

export const listarAlunosPorTurma = async (turmaId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['alunos'], 'readonly');
        const store = transaction.objectStore('alunos');
        const index = store.index('turmaId');
        const request = index.getAll(turmaId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const excluirAluno = async (id) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['alunos'], 'readwrite');
        const store = transaction.objectStore('alunos');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// ===== NOTAS =====
export const salvarNota = async (nota) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['notas'], 'readwrite');
        const store = transaction.objectStore('notas');

        const novaNota = {
            ...nota,
            id: nota.id || uuidv4(),
            data: nota.data || new Date().toISOString()
        };

        const request = store.put(novaNota);
        request.onsuccess = () => resolve(novaNota);
        request.onerror = () => reject(request.error);
    });
};

export const listarNotasPorAluno = async (alunoId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['notas'], 'readonly');
        const store = transaction.objectStore('notas');
        const index = store.index('alunoId');
        const request = index.getAll(alunoId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const listarNotasPorGabarito = async (gabaritoId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['notas'], 'readonly');
        const store = transaction.objectStore('notas');
        const index = store.index('gabaritoId');
        const request = index.getAll(gabaritoId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};
