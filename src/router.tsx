import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AdminLimpezaPage } from "./pages/AdminLimpeza";
import { Dashboard } from "./pages/Dashboard";
import { EmpresaPage } from "./pages/Empresa";
import { MetasPage } from "./pages/Metas";
import { RelatoriosPage } from "./pages/Relatorios";
import { UsuariosPage } from "./pages/Usuarios";
import { LoginPage } from "./pages/Login";
import { LegalPage } from "./pages/Legal";
import { DesignerPage, DetalheDesigner } from "./pages/Designer";
import { EnvioPage } from "./pages/Envio";
import { DetalheCliente } from "./pages/clientes/DetalheCliente";
import { ListaClientes } from "./pages/clientes/ListaClientes";
import { NovoCliente } from "./pages/clientes/NovoCliente";
import { DetalhePedido } from "./pages/pedidos/DetalhePedido";
import { ListaPedidos } from "./pages/pedidos/ListaPedidos";
import { NovoPedido } from "./pages/pedidos/NovoPedido";
import { DetalheProducaoItem } from "./pages/producao/DetalheProducaoItem";
import { EtapaProducao } from "./pages/producao/EtapaProducao";
import { Producao } from "./pages/producao/Producao";

export const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    { path: "/termos", element: <LegalPage type="termos" /> },
    { path: "/privacidade", element: <LegalPage type="privacidade" /> },
    { path: "/lgpd", element: <LegalPage type="lgpd" /> },
    {
      path: "/",
      element: <App />,
      children: [
        { index: true, element: <Dashboard /> },
        { path: "pedidos", element: <ListaPedidos /> },
        { path: "pedidos/novo", element: <NovoPedido /> },
        { path: "pedidos/:id", element: <DetalhePedido /> },
        { path: "producao", element: <Producao /> },
        { path: "producao/:etapa", element: <EtapaProducao /> },
        { path: "producao/:etapa/:id", element: <DetalheProducaoItem /> },
        { path: "envio", element: <EnvioPage /> },
        { path: "designer", element: <DesignerPage /> },
        { path: "designer/:id", element: <DetalheDesigner /> },
        { path: "clientes", element: <ListaClientes /> },
        { path: "clientes/novo", element: <NovoCliente /> },
        { path: "clientes/:id", element: <DetalheCliente /> },
        { path: "metas", element: <MetasPage /> },
        { path: "relatorios", element: <RelatoriosPage /> },
        { path: "usuarios", element: <UsuariosPage /> },
        { path: "empresa", element: <EmpresaPage /> },
        { path: "admin/limpeza", element: <AdminLimpezaPage /> }
      ]
    }
  ],
  {
    future: {
      v7_relativeSplatPath: true
    }
  }
);
