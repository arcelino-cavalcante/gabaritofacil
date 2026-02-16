import React, { useState } from 'react';
import Home from './components/Home';
import HistoricoGabaritos from './components/HistoricoGabaritos';
import TurmaManager from './components/TurmaManager';
import AlunoManager from './components/AlunoManager';
import GabaritoConfig from './components/GabaritoConfig';
import Scanner from './components/Scanner';
import CabecalhoManager from './components/CabecalhoManager';
import Tutorial from './components/Tutorial';

const App = () => {
    const [currentView, setCurrentView] = useState('home');
    const [selectedTurma, setSelectedTurma] = useState(null);
    const [selectedGabarito, setSelectedGabarito] = useState(null);
    const [modoCriacaoGabarito, setModoCriacaoGabarito] = useState(null); // 'simples' ou 'nominal'
    const [previousView, setPreviousView] = useState(null); // Para onde voltar

    const handleNavigate = (view) => {
        // Redirecionamentos especiais
        if (view === 'correcao-rapida') {
            handleCriarGabaritoRapido();
            return;
        }

        // Salvar referência se estiver na aba de gabaritos para permitir retorno correto
        if (currentView === 'historico') {
            setPreviousView(null); // Resetar ao sair
        }

        setCurrentView(view);
        // Limpar seleções ao ir para home
        if (view === 'home') {
            setSelectedTurma(null);
            setSelectedGabarito(null);
            setModoCriacaoGabarito(null);
            setPreviousView(null);
        }
    };

    const handleSelectTurma = (turma) => {
        setSelectedTurma(turma);
        // Se vier de Home, mantém volta pra Home (previousView null)
        setCurrentView('aluno-manager');
    };

    const handleCriarGabaritoNominal = () => {
        setModoCriacaoGabarito('nominal');
        // Mantém previousView onde estiver
        setCurrentView('gabarito-config');
    };

    const handleCriarGabaritoRapido = () => {
        setSelectedTurma(null);
        setModoCriacaoGabarito('simples');
        setPreviousView('historico'); // Definitivamente veio via Historico -> Correção Rápida
        setCurrentView('gabarito-config');
    };

    // Novo handler para criar gabarito nominal direto
    const handleCriarGabaritoParaTurma = (turma) => {
        setSelectedTurma(turma);
        setModoCriacaoGabarito('nominal');
        setPreviousView('historico'); // Definitivamente veio via Historico -> Para Turma
        setCurrentView('gabarito-config');
    };

    const handleGabaritoSalvo = () => {
        setCurrentView('historico');
        setPreviousView(null);
    };

    const handleSelectGabarito = (gabarito) => {
        setSelectedGabarito(gabarito);
        setPreviousView('historico');
        setCurrentView('scanner');
    };

    // Renderização condicional
    return (
        <div className="min-h-screen bg-white">
            {currentView === 'home' && (
                <Home onNavigate={handleNavigate} />
            )}

            {currentView === 'turmas' && (
                <TurmaManager
                    onBack={() => handleNavigate('home')}
                    onSelectTurma={handleSelectTurma}
                />
            )}

            {currentView === 'aluno-manager' && selectedTurma && (
                <AlunoManager
                    turma={selectedTurma}
                    onBack={() => setCurrentView('turmas')}
                    onCriarGabarito={handleCriarGabaritoNominal}
                />
            )}

            {currentView === 'gabarito-config' && (
                <GabaritoConfig
                    modo={modoCriacaoGabarito}
                    turmaSelecionada={modoCriacaoGabarito === 'nominal' ? selectedTurma : null}
                    onBack={() => {
                        if (previousView === 'historico') {
                            setCurrentView('historico');
                            setPreviousView(null);
                        } else if (modoCriacaoGabarito === 'nominal' && selectedTurma) {
                            setCurrentView('aluno-manager');
                        } else {
                            handleNavigate('home');
                        }
                    }}
                    onGabaritoSalvo={handleGabaritoSalvo}
                />
            )}

            {currentView === 'historico' && (
                <HistoricoGabaritos
                    onNavigate={handleNavigate}
                    onSelectGabarito={handleSelectGabarito}
                    onCriarParaTurma={handleCriarGabaritoParaTurma}
                    onBack={() => handleNavigate('home')}
                />
            )}

            {currentView === 'scanner' && selectedGabarito && (
                <Scanner
                    gabarito={selectedGabarito}
                    onBack={() => setCurrentView('historico')}
                />
            )}

            {currentView === 'cabecalhos' && (
                <CabecalhoManager
                    onBack={() => handleNavigate('home')}
                />
            )}

            {currentView === 'tutorial' && (
                <Tutorial
                    onBack={() => handleNavigate('home')}
                />
            )}
        </div>
    );
};

export default App;