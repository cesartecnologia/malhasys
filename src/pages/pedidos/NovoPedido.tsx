import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, InputHTMLAttributes, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useClientes } from "../../hooks/useClientes";
import { db, ensureAuthenticated } from "../../lib/firebase";
import { formatCurrencyInput, parseCurrency } from "../../lib/format";
import { uploadFile } from "../../lib/storage";
import type { PedidoItem } from "../../types";

const emptyItem: PedidoItem = { tipo: "", tamanho: "", quantidade: 0, cor: "", gola: "" };
type ArteDraft = { id: string; nome: string; file: File | null };

function newArteDraft(index: number): ArteDraft {
  return { id: `arte-${Date.now()}-${index}`, nome: `Arte ${index}`, file: null };
}

export function NovoPedido() {
  const navigate = useNavigate();
  const { clientes } = useClientes();
  const [clienteId, setClienteId] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);
  const [itens, setItens] = useState<PedidoItem[]>([{ ...emptyItem }]);
  const [artes, setArtes] = useState<ArteDraft[]>([newArteDraft(1)]);
  const [valorTotal, setValorTotal] = useState("");
  const [valorEntrada, setValorEntrada] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleteArteIndex, setDeleteArteIndex] = useState<number | null>(null);
  const [error, setError] = useState("");

  const cliente = clientes.find((item) => item.id === clienteId);
  const clientesFiltrados = useMemo(() => {
    const termo = clienteBusca.trim().toLowerCase();
    if (!termo) return clientes.slice(0, 6);
    return clientes
      .filter((item) => `${item.nome} ${item.cidade} ${item.endereco} ${item.whatsapp}`.toLowerCase().includes(termo))
      .slice(0, 8);
  }, [clientes, clienteBusca]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clienteId) {
      setClienteOpen(true);
      return;
    }
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await ensureAuthenticated();
      const uploadedArtes = await Promise.all(
        artes.map(async (arte, index) => {
          const referencia = await uploadFile("pedidos/referencias", arte.file);
          return {
            id: arte.id,
            nome: arte.nome.trim() || `Arte ${index + 1}`,
            referenciaUrl: referencia.url || "",
            referenciaPath: referencia.path || "",
            arteFinalUrl: "",
            arteFinalPath: ""
          };
        })
      );
      const primeiraReferencia = uploadedArtes.find((arte) => arte.referenciaUrl);
      const docRef = await addDoc(collection(db, "pedidos"), {
        clienteId,
        clienteNome: cliente?.nome || "",
        whatsapp: cliente?.whatsapp || "",
        cidade: cliente?.cidade || "",
        endereco: cliente?.endereco || "",
        tipoEstampa: form.get("tipoEstampa"),
        valorTotal: parseCurrency(form.get("valorTotal")),
        valorEntrada: parseCurrency(form.get("valorEntrada")),
        valorPago: parseCurrency(form.get("valorEntrada")),
        formaPagamento: form.get("formaPagamento"),
        prioridade: form.get("prioridade"),
        status: "Aguardando Arte",
        observacoes: form.get("observacoes"),
        logoUrl: primeiraReferencia?.referenciaUrl || "",
        logoPath: primeiraReferencia?.referenciaPath || "",
        artes: uploadedArtes,
        artesFinalizadas: false,
        ativo: true,
        itens,
        createdAt: serverTimestamp()
      });
      navigate(`/pedidos/${docRef.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o pedido.");
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Novo Pedido" subtitle="Crie um novo pedido" />
      <form className="form-card grid" onSubmit={submit}>
        <div className="form-grid">
          <label className="field client-search">
            <span>Cliente</span>
            <input
              required
              value={clienteBusca}
              placeholder="Buscar cliente por nome, endereço ou WhatsApp"
              onChange={(event) => {
                setClienteBusca(event.target.value);
                setClienteId("");
                setClienteOpen(true);
              }}
              onFocus={() => setClienteOpen(true)}
            />
            {clienteOpen ? (
              <div className="client-results">
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map((item) => (
                    <button
                      className="client-option"
                      type="button"
                      key={item.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setClienteId(item.id);
                        setClienteBusca(item.nome);
                        setClienteOpen(false);
                      }}
                    >
                      <strong>{item.nome}</strong>
                      <small>{item.endereco || item.cidade || "Endereço não informado"} · {item.whatsapp || "sem WhatsApp"}</small>
                    </button>
                  ))
                ) : (
                  <div className="client-option empty">Nenhum cliente encontrado</div>
                )}
              </div>
            ) : null}
          </label>
          <Field label="WhatsApp" value={cliente?.whatsapp || ""} readOnly />
          <Field label="Endereço" value={cliente?.endereco || ""} readOnly />
          <Select name="tipoEstampa" label="Tipo de estampa" options={["DTF", "Silk"]} />
          <Field name="valorTotal" label="Valor total" inputMode="numeric" placeholder="R$ 0,00" value={valorTotal} onValueChange={(value) => setValorTotal(formatCurrencyInput(value))} required />
          <Field name="valorEntrada" label="Valor de entrada" inputMode="numeric" placeholder="R$ 0,00" value={valorEntrada} onValueChange={(value) => setValorEntrada(formatCurrencyInput(value))} required />
          <Select name="formaPagamento" label="Forma de pagamento" options={["Pix", "Cartão", "Boleto", "Dinheiro", "Transferência"]} />
          <Select name="prioridade" label="Prioridade" options={["Normal", "Alta", "Urgente"]} />
          <label className="field full">
            <span>Detalhes/observações</span>
            <textarea name="observacoes" />
          </label>
        </div>

        <section className="grid">
          <div className="section-heading-line">
            <h2>Artes do pedido</h2>
            <button className="secondary compact-button" type="button" onClick={() => setArtes((current) => [...current, newArteDraft(current.length + 1)])}>
              <Plus size={17} /> Adicionar arte
            </button>
          </div>
          <div className="order-art-fields">
            {artes.map((arte, index) => (
              <div className="order-art-field" key={arte.id}>
                <Field label="Nome da arte" value={arte.nome} onValueChange={(value) => updateArte(index, "nome", value)} />
                <label className="field">
                  <span>Arquivo de referência</span>
                  <input type="file" accept="image/*,.pdf" onChange={(event) => updateArte(index, "file", event.target.files?.[0] || null)} />
                </label>
                <button
                  className="secondary icon-button danger"
                  type="button"
                  aria-label="Remover arte"
                  disabled={artes.length === 1}
                  onClick={() => setDeleteArteIndex(index)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid">
          <h2>Itens do pedido</h2>
          {itens.map((item, index) => (
            <div className="form-grid" key={index}>
              <Field label="Tipo de peça" value={item.tipo} placeholder="Ex: Camiseta" onValueChange={(value) => update(index, "tipo", value)} />
              <Field label="Tamanho" value={item.tamanho} placeholder="Ex: M" onValueChange={(value) => update(index, "tamanho", value)} />
              <Field label="Quantidade" inputMode="numeric" value={item.quantidade || ""} onValueChange={(value) => update(index, "quantidade", Number(value || 0))} />
              <Field label="Cor" value={item.cor} onValueChange={(value) => update(index, "cor", value)} />
              <div className="item-gola-row">
                <Field label="Gola" value={item.gola} placeholder="Ex: Redonda" onValueChange={(value) => update(index, "gola", value)} />
                <button className="secondary icon-button danger" type="button" aria-label="Remover item" onClick={() => setDeleteIndex(index)}>
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
          <div className="form-actions-line">
            <button className="secondary compact-button" type="button" onClick={() => setItens((current) => [...current, { ...emptyItem }])}>
              <Plus size={17} /> Adicionar item
            </button>
            <button className="compact-button" type="submit" disabled={saving}>
              <Save size={18} /> {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </section>
      </form>
      {deleteIndex !== null ? (
        <div className="notify">
          <div>
            <strong>Excluir item?</strong>
            <p>Confirme para remover este item do pedido.</p>
          </div>
          <div className="notify-actions">
            <button className="secondary compact-button" type="button" onClick={() => setDeleteIndex(null)}>Cancelar</button>
            <button
              className="compact-button danger"
              type="button"
              onClick={() => {
                setItens((current) => current.filter((_, i) => i !== deleteIndex));
                setDeleteIndex(null);
              }}
            >
              Excluir
            </button>
          </div>
        </div>
      ) : null}
      {deleteArteIndex !== null ? (
        <div className="notify">
          <div>
            <strong>Excluir arte?</strong>
            <p>Confirme para remover esta arte do pedido.</p>
          </div>
          <div className="notify-actions">
            <button className="secondary compact-button" type="button" onClick={() => setDeleteArteIndex(null)}>Cancelar</button>
            <button
              className="compact-button danger"
              type="button"
              onClick={() => {
                setArtes((current) => current.filter((_, i) => i !== deleteArteIndex));
                setDeleteArteIndex(null);
              }}
            >
              Excluir
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="notify error">
          <div>
            <strong>Erro ao salvar</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}
    </>
  );

  function update<K extends keyof PedidoItem>(index: number, key: K, value: PedidoItem[K]) {
    setItens((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  function updateArte<K extends keyof ArteDraft>(index: number, key: K, value: ArteDraft[K]) {
    setArtes((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  onValueChange?: (value: string) => void;
};

function Field(props: FieldProps) {
  const { label, onValueChange, ...inputProps } = props;
  return (
    <label className="field">
      <span>{label}</span>
      <input {...inputProps} onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined} />
    </label>
  );
}

function Select({ label, options, value, name, onChange }: { label: string; options: string[]; value?: string; name?: string; onChange?: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
