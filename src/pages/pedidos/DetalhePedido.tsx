import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ArrowLeft, Download, MessageCircle, SkipForward, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../../components/Badges";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { PageHeader } from "../../components/PageHeader";
import { SystemNotify } from "../../components/SystemNotify";
import { usePedidos } from "../../hooks/usePedidos";
import { db, ensureAuthenticated } from "../../lib/firebase";
import { buildPedidoNumberMap, formatCurrencyInput, money, parseCurrency, pedidoNumber } from "../../lib/format";
import { normalizePedidoArtes } from "../../lib/pedidoArtes";
import { ARTE_FINAL_OBRIGATORIA, pedidoPodeEntrarNoStatus } from "../../lib/pedidoWorkflow";
import { friendlyErrorMessage } from "../../lib/publicErrors";
import { isCanceled, normalizeStatus } from "../../lib/status";
import { buildPedidoStatusWhatsapp } from "../../lib/whatsapp";
import type { Empresa, Pedido, Perfil } from "../../types";
import { etapas } from "../../types";

export function DetalhePedido() {
  const { id } = useParams();
  return <PedidoDetail id={id || ""} backTo="/pedidos" />;
}

export function PedidoDetail({ id, backTo }: { id: string; backTo: string }) {
  const navigate = useNavigate();
  const { mostrarFinanceiro, empresa } = useOutletContext<{ perfil: Perfil; mostrarFinanceiro: boolean; empresa: Empresa }>();
  const { pedidos } = usePedidos();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rastreio, setRastreio] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [workflowNotice, setWorkflowNotice] = useState(false);

  useEffect(() => {
    if (!id) return;
    let unsubscribe = () => {};
    let cancelled = false;
    ensureAuthenticated()
      .then(() => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(db, "pedidos", id),
          (snapshot) => {
            if (!snapshot.exists()) {
              setPedido(null);
            } else {
              const data = { id: snapshot.id, ...snapshot.data() } as Pedido;
              setPedido(data);
              setRastreio(data.rastreio || "");
              setValorPago(money(Number(data.valorPago || data.valorEntrada || 0)));
            }
            setLoading(false);
          },
          (err) => {
            setError(friendlyErrorMessage(err, "Não foi possível carregar o pedido."));
            setLoading(false);
          }
        );
      })
      .catch((err) => {
        setError(friendlyErrorMessage(err, "Não foi possível carregar o pedido."));
        setLoading(false);
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id]);

  const numeroMap = useMemo(() => buildPedidoNumberMap(pedidos), [pedidos]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="muted">Erro ao carregar pedido: {error}</p>;
  if (!pedido) return <p className="muted">Pedido não encontrado.</p>;

  const etapaAtual = etapas.indexOf(normalizeStatus(pedido.status) as typeof etapas[number]);
  const proxima = etapas[Math.min(etapaAtual + 1, etapas.length - 1)];
  const currentPedidoLabel = pedidoNumber(pedido.id, numeroMap);
  const pedidoArtes = normalizePedidoArtes(pedido);
  const aguardandoArte = pedido.status === "Aguardando Arte";
  const encerrado = pedido.status === "Entregue" || isCanceled(pedido.status);
  const bloqueadoSemArte = !pedidoPodeEntrarNoStatus(pedido, proxima);
  const whatsapp = buildPedidoStatusWhatsapp(pedido, empresa);

  async function avancar() {
    if (!pedido || encerrado) return;
    if (aguardandoArte || bloqueadoSemArte) {
      setWorkflowNotice(true);
      return;
    }
    await ensureAuthenticated();
    await updateDoc(doc(db, "pedidos", pedido.id), { status: proxima });
  }

  async function salvarInline() {
    if (!pedido) return;
    await ensureAuthenticated();
    await updateDoc(doc(db, "pedidos", pedido.id), {
      rastreio,
      ...(mostrarFinanceiro ? { valorPago: parseCurrency(valorPago) } : {})
    });
  }

  return (
    <>
      <PageHeader
        title={currentPedidoLabel}
        subtitle={`${pedido.clienteNome} · ${pedido.cidade}`}
        actions={
          <>
            <button className="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} /> Voltar
            </button>
            <Link className="button secondary" to={backTo}>Listagem</Link>
          </>
        }
      />
      <div className="detail-layout">
        <section className="panel grid">
          <div className="row-title">
            <StatusBadge status={pedido.status} />
            <PriorityBadge prioridade={pedido.prioridade} />
          </div>
          <div className="key-values">
            <div><span>Tipo de estampa</span><strong>{pedido.tipoEstampa}</strong></div>
            <div><span>Designer</span><strong>{pedido.designer || "-"}</strong></div>
            <div><span>Forma de pagamento</span><strong>{pedido.formaPagamento}</strong></div>
            <div><span>Observações</span><strong>{pedido.observacoes || "-"}</strong></div>
            <div><span>Detalhes da arte</span><strong>{pedido.detalhesArte || "-"}</strong></div>
          </div>

          {pedidoArtes.length > 0 ? (
            <div className="pedido-detail-art">
              <span>Artes do pedido</span>
              <div className="pedido-detail-art-grid">
                {pedidoArtes.map((arte, index) => {
                  const arteUrl = arte.arteFinalUrl || arte.referenciaUrl || "";
                  return (
                    <div className="pedido-detail-art-card" key={arte.id}>
                      <strong>{arte.nome || `Arte ${index + 1}`}</strong>
                      {arteUrl ? (
                        <>
                          {arteUrl.toLowerCase().includes(".pdf") ? (
                            <a className="empty-inline designer-file-preview" href={arteUrl} target="_blank" rel="noreferrer">
                              <Download size={24} />
                              <span>Abrir PDF</span>
                            </a>
                          ) : (
                            <a href={arteUrl} target="_blank" rel="noreferrer">
                              <img src={arteUrl} alt={`${arte.nome || "Arte"} do ${currentPedidoLabel}`} />
                            </a>
                          )}
                          <a className="button secondary" href={arteUrl} target="_blank" rel="noreferrer">
                            <Download size={18} /> Abrir em tamanho completo
                          </a>
                        </>
                      ) : (
                        <div className="empty-inline">Sem arte enviada</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <table className="items-table">
            <thead>
              <tr><th>Peça</th><th>Tamanho</th><th>Cor</th><th>Gola</th><th>Qtd.</th></tr>
            </thead>
            <tbody>
              {pedido.itens.map((item, index) => (
                <tr key={index}>
                  <td>{item.tipo}</td>
                  <td>{item.tamanho}</td>
                  <td>{item.cor}</td>
                  <td>{item.gola}</td>
                  <td>{item.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="panel grid order-side-panel">
          <label className="field">
            <span>Rastreio</span>
            <input value={rastreio} onChange={(event) => setRastreio(event.target.value)} />
          </label>

          {mostrarFinanceiro ? (
            <>
              <div className="key-values">
                <div><span>Valor total</span><strong>{money(pedido.valorTotal)}</strong></div>
                <div><span>Entrada</span><strong>{money(pedido.valorEntrada)}</strong></div>
              </div>
              <label className="field">
                <span>Valor pago</span>
                <input
                  inputMode="numeric"
                  value={valorPago}
                  onChange={(event) => setValorPago(formatCurrencyInput(event.target.value))}
                  placeholder="R$ 0,00"
                />
              </label>
            </>
          ) : null}

          <button className="secondary" onClick={salvarInline}>
            <Save size={18} /> Salvar campos
          </button>
          <button
            onClick={avancar}
            disabled={encerrado}
            title={bloqueadoSemArte ? ARTE_FINAL_OBRIGATORIA : undefined}
          >
            <SkipForward size={18} /> {isCanceled(pedido.status) ? "Pedido cancelado" : aguardandoArte || bloqueadoSemArte ? "Arte final obrigatória" : "Avançar para próxima etapa"}
          </button>
          <a className="button secondary" href={whatsapp} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> Enviar status do pedido
          </a>
        </aside>
      </div>
      {workflowNotice ? (
        <SystemNotify
          title="Arte final obrigatória"
          message={ARTE_FINAL_OBRIGATORIA}
          onClose={() => setWorkflowNotice(false)}
        />
      ) : null}
    </>
  );
}
