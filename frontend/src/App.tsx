import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/UI';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { CadastroPage } from './pages/CadastroPage';
import { RecuperarSenhaPage } from './pages/RecuperarSenhaPage';
import { PesquisaCaronasPage } from './pages/PesquisaCaronasPage';
import { DetalhesCaronaPage } from './pages/DetalhesCaronaPage';
import { CriarCorridaPage } from './pages/CriarCorridaPage';
import { PainelSolicitacoesPage } from './pages/PainelSolicitacoesPage';
import { MinhasViagensPage } from './pages/MinhasViagensPage';
import { ChatPage } from './pages/ChatPage';
import { AvaliacaoPage } from './pages/AvaliacaoPage';
import { DashboardSustentavelPage } from './pages/DashboardSustentavelPage';
import { MeuPerfilPage } from './pages/MeuPerfilPage';
import { HistoricoViagensPage } from './pages/HistoricoViagensPage';
import { SobreNosPage } from './pages/SobreNosPage';
import { SuporteContatoPage } from './pages/SuporteContatoPage';

function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f9]">
      <Navbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<CadastroPage />} />
            <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
            <Route path="/caronas" element={<PesquisaCaronasPage />} />
            <Route path="/caronas/:id" element={<DetalhesCaronaPage />} />
            <Route path="/impacto" element={<DashboardSustentavelPage />} />
            <Route path="/sobre" element={<SobreNosPage />} />
            <Route path="/suporte" element={<SuporteContatoPage />} />

            <Route path="/oferecer" element={<ProtectedRoute><CriarCorridaPage /></ProtectedRoute>} />
            <Route path="/solicitacoes" element={<ProtectedRoute><PainelSolicitacoesPage /></ProtectedRoute>} />
            <Route path="/minhas-viagens" element={<ProtectedRoute><MinhasViagensPage /></ProtectedRoute>} />
            <Route path="/chat/:viagemId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/avaliar/:viagemId" element={<ProtectedRoute><AvaliacaoPage /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><MeuPerfilPage /></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute><HistoricoViagensPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
