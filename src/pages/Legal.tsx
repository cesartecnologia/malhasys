import { Link } from "react-router-dom";

type LegalSection = {
  title: string;
  body: string;
};

const pages: Record<string, { title: string; updatedAt: string; sections: LegalSection[] }> = {
  termos: {
    title: "Termos de Uso",
    updatedAt: "05/06/2026",
    sections: [
      {
        title: "Uso do sistema",
        body: "O MalhaSys é uma ferramenta de apoio à gestão operacional de malharias. O usuário deve utilizar o sistema apenas para finalidades legítimas relacionadas à operação da empresa."
      },
      {
        title: "Responsabilidades do usuário",
        body: "Cada usuário é responsável pelas informações que cadastra, altera ou remove. As credenciais de acesso são pessoais e não devem ser compartilhadas."
      },
      {
        title: "Disponibilidade",
        body: "O sistema pode passar por ajustes, manutenção ou indisponibilidades temporárias. Dados críticos da operação devem ser revisados periodicamente pela empresa."
      },
      {
        title: "Conteúdo e documentos",
        body: "Arquivos, logos, pedidos, clientes e demais registros inseridos no sistema permanecem sob responsabilidade da empresa usuária."
      }
    ]
  },
  privacidade: {
    title: "Política de Privacidade",
    updatedAt: "05/06/2026",
    sections: [
      {
        title: "Dados tratados",
        body: "O MalhaSys pode armazenar dados de usuários, clientes, pedidos, contatos, endereços, arquivos de produção e configurações da empresa."
      },
      {
        title: "Finalidade",
        body: "Os dados são utilizados para identificar usuários, organizar clientes, controlar pedidos, acompanhar produção, gerar relatórios e manter a segurança da operação."
      },
      {
        title: "Compartilhamento",
        body: "Os dados podem ser processados por serviços necessários ao funcionamento do sistema, como banco de dados, autenticação, hospedagem e armazenamento de arquivos."
      },
      {
        title: "Segurança",
        body: "O acesso deve ser limitado a usuários autorizados. A empresa deve manter perfis atualizados, remover acessos antigos e evitar o compartilhamento de credenciais."
      }
    ]
  },
  lgpd: {
    title: "LGPD e Regras de Proteção de Dados",
    updatedAt: "05/06/2026",
    sections: [
      {
        title: "Princípios adotados",
        body: "O tratamento de dados deve seguir finalidade clara, necessidade, transparência, segurança, prevenção e responsabilidade."
      },
      {
        title: "Direitos dos titulares",
        body: "Titulares podem solicitar confirmação de tratamento, acesso, correção, atualização, anonimização, bloqueio, eliminação e informações sobre compartilhamento, conforme aplicável."
      },
      {
        title: "Regras internas de uso",
        body: "Cadastre apenas dados necessários para a operação, mantenha informações atualizadas, limite acessos por função e remova usuários que não fazem mais parte da equipe."
      },
      {
        title: "Incidentes e solicitações",
        body: "Suspeitas de acesso indevido, vazamento, perda de dados ou pedidos de titulares devem ser comunicados ao responsável da empresa para análise e providências."
      },
      {
        title: "Base legal",
        body: "A LGPD, Lei nº 13.709/2018, regula o tratamento de dados pessoais em meios físicos e digitais e busca proteger liberdade, privacidade e desenvolvimento da personalidade."
      }
    ]
  }
};

export function LegalPage({ type }: { type: "termos" | "privacidade" | "lgpd" }) {
  const page = pages[type];

  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="legal-brand" to="/login">
          <img src="/logo.png" alt="Logo MalhaSys" />
          <span>MalhaSys</span>
        </Link>
        <Link className="button secondary compact-button" to="/login">Voltar ao login</Link>
      </header>
      <article className="legal-document">
        <p className="muted">Atualizado em {page.updatedAt}</p>
        <h1>{page.title}</h1>
        <p className="legal-intro">
          Este documento é um modelo informativo para uso no sistema. A empresa deve revisar e adaptar o conteúdo à sua operação e às suas obrigações legais.
        </p>
        <div className="legal-sections">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
        <footer className="legal-note">
          Referências: Lei nº 13.709/2018 e orientações públicas da Autoridade Nacional de Proteção de Dados.
        </footer>
      </article>
    </main>
  );
}
