import { doc, updateDoc } from "firebase/firestore";
import { ExternalLink, MessageCircle, Package, Save, Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/Badges";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { usePedidos } from "../hooks/usePedidos";
import { db, ensureAuthenticated } from "../lib/firebase";
import { buildPedidoNumberMap, onlyDigits, pedidoNumber } from "../lib/format";
import type { Pedido } from "../types";

export function EnvioPage() {
  const { pedidos } = usePedidos();
  const numeroMap = buildPedidoNumberMap(pedidos);
  const envios = pedidos.filter((pedido) => ["Em Preparação", "Enviado", "Entregue"].includes(pedido.status));
  const [rastreios, setRastreios] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");

  async function salvarRastreio(pedido: Pedido) {
    const rastreio = (rastreios[pedido.id] ?? pedido.rastreio ?? "").trim();
    setSavingId(pedido.id);
    setMessage("");
    try {
      await ensureAuthenticated();
      await updateDoc(doc(db, "pedidos", pedido.id), { rastreio });
      setMessage("Rastreio salvo.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar o rastreio.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <>
      <PageHeader title="Envio" subtitle="Acompanhe preparação, rastreio e entregas" />
      {envios.length === 0 ? <EmptyState title="Nenhum pedido em envio." /> : null}
      <div className="grid cols-3">
        {envios.map((pedido) => {
          const rastreio = rastreios[pedido.id] ?? pedido.rastreio ?? "";
          const whatsapp = buildTrackingWhatsapp(pedido, rastreio);
          return (
          <article className="card envio-card" key={pedido.id}>
            <div className="card-content grid envio-card-content">
              <div className="envio-card-top">
                <div>
                  <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Pedido</p>
                  <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800 }}>{pedidoNumber(pedido.id, numeroMap)}</p>
                </div>
                {pedido.status === "Enviado" ? <Truck color="#22c55e" /> : <Package color="#eab308" />}
              </div>
              <p style={{ margin: 0 }}>{pedido.clienteNome}</p>
              <StatusBadge status={pedido.status} />
              <label className="field">
                <span>Código de rastreio</span>
                <input
                  value={rastreio}
                  placeholder="Informe o código de rastreio"
                  onChange={(event) => setRastreios((current) => ({ ...current, [pedido.id]: event.target.value }))}
                />
              </label>
              <div className="envio-actions">
                <button className="secondary compact-button" type="button" disabled={savingId === pedido.id} onClick={() => void salvarRastreio(pedido)}>
                  <Save size={16} /> {savingId === pedido.id ? "Salvando..." : "Salvar"}
                </button>
                <a className={`button compact-button ${rastreio.trim() ? "" : "disabled"}`} href={rastreio.trim() ? whatsapp : undefined} target="_blank" rel="noreferrer" aria-disabled={!rastreio.trim()}>
                  <MessageCircle size={16} /> WhatsApp
                </a>
                <Link className="button secondary compact-button" to={`/pedidos/${pedido.id}`}>
                  <ExternalLink size={16} /> Abrir
                </Link>
              </div>
            </div>
          </article>
        );
        })}
      </div>
      {message ? <p className="muted envio-message">{message}</p> : null}
    </>
  );
}

function buildTrackingWhatsapp(pedido: Pedido, rastreio: string) {
  const text = [
    `Olá, ${pedido.clienteNome}! 😊`,
    "",
    "Passando para avisar que o seu Pedido foi enviado.",
    `Código de rastreio: ${rastreio.trim()}`,
    "",
    "Assim que houver atualização da transportadora, você poderá acompanhar por esse código. Obrigado pela confiança! ✨"
  ].join("\n");
  return `https://wa.me/55${onlyDigits(pedido.whatsapp)}?text=${encodeURIComponent(text)}`;
}
