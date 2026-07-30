import { CheckCircle2, ClipboardList, Clock3, PackageCheck, Palette, Percent, Scissors, Shirt, Sparkles, SquareCheckBig } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import type { Empresa, Perfil } from "../types";
import { usePedidos } from "../hooks/usePedidos";
import { isCanceled, statusMatches } from "../lib/status";

export function Dashboard() {
  const { usuarioNome } = useOutletContext<{ perfil: Perfil; mostrarFinanceiro: boolean; empresa: Empresa; usuarioNome: string }>();
  const { pedidos, loading, error } = usePedidos();

  const ativos = pedidos.filter((pedido) => pedido.status !== "Entregue" && !isCanceled(pedido.status));
  const totalOrders = ativos.length;
  const preparandoEnvio = pedidos.filter((pedido) => pedido.status === "Em Preparação").length;
  const prontos = pedidos.filter((pedido) => pedido.status === "Entregue").length;
  const taxa = pedidos.length ? Math.round((prontos / pedidos.length) * 100) : 0;
  const statusCards = [
    { label: "Pedidos em aberto", status: "Aguardando Arte", icon: Clock3, color: "bg-gray" },
    { label: "Arte Aprovada", status: "Arte Aprovada", icon: CheckCircle2, color: "bg-blue" },
    { label: "Corte", status: "Corte", icon: Scissors, color: "bg-purple" },
    { label: "Estamparia", status: "Estamparia", icon: Palette, color: "bg-pink" },
    { label: "Costura", status: "Costura", icon: Shirt, color: "bg-orange" },
    { label: "Cancelado", status: "Cancelado", icon: ClipboardList, color: "bg-gray" }
  ];
  const tiposEstampa = [
    { label: "DTF", tipo: "DTF", icon: Sparkles, color: "bg-purple" },
    { label: "Silk", tipo: "Silk", icon: Palette, color: "bg-pink" },
    { label: "Outros tipos", tipo: "Outros", icon: ClipboardList, color: "bg-gray" }
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Bem-vindo, ${usuarioNome || "usuário"}!`} />
      {error ? <p className="muted">Erro ao carregar pedidos: {error}</p> : null}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <section className="dashboard-grid">
            {statusCards.map((item) => {
              const Icon = item.icon;
              const count = pedidos.filter((pedido) => statusMatches(pedido.status, item.status)).length;
              return (
                <Metric
                  key={item.status}
                  title={item.label}
                  value={count.toString()}
                  icon={Icon}
                  color={item.color}
                />
              );
            })}

            <Metric title="Pedidos preparando para envio" value={preparandoEnvio.toString()} icon={PackageCheck} color="bg-yellow" />
            <Metric title="Pedidos Prontos" value={prontos.toString()} icon={SquareCheckBig} color="bg-green" />
            <Metric title="Total de Pedidos" value={totalOrders.toString()} icon={ClipboardList} color="bg-blue" />
            <Metric title="Taxa de Conclusão" value={`${taxa}%`} icon={Percent} color="bg-emerald" />

            {tiposEstampa.map((item) => {
              const Icon = item.icon;
              const count = item.tipo === "Outros"
                ? pedidos.filter((pedido) => !["DTF", "Silk"].includes(pedido.tipoEstampa)).length
                : pedidos.filter((pedido) => pedido.tipoEstampa === item.tipo).length;
              return <Metric key={item.tipo} title={item.label} value={count.toString()} icon={Icon} color={item.color} />;
            })}
        </section>
      )}
    </>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string;
  value: string;
  icon: typeof CheckCircle2;
  color: string;
}) {
  return (
    <div className="card">
      <div className="card-content dashboard-metric-content">
        <div>
          <p className="muted dashboard-metric-title">{title}</p>
          <p className="dashboard-metric-value">{value}</p>
        </div>
        <div className={`dashboard-metric-icon ${color}`}>
          <Icon />
        </div>
      </div>
    </div>
  );
}
