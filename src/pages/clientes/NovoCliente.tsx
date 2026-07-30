import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { db, ensureAuthenticated } from "../../lib/firebase";
import { friendlyErrorMessage } from "../../lib/publicErrors";
import { uploadFile } from "../../lib/storage";

export function NovoCliente() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({
    nome: "",
    documento: "",
    cidade: "",
    estado: "",
    endereco: "",
    email: "",
    whatsapp: ""
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function updateField(name: string, value: string) {
    const formattedValue =
      name === "documento"
        ? formatDocument(value)
        : name === "whatsapp"
          ? formatPhone(value)
          : name === "estado"
            ? value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2)
            : value;
    setFormValues((current) => ({ ...current, [name]: formattedValue }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await ensureAuthenticated();
      const foto = await uploadFile("clientes/fotos", file);
      const docRef = await addDoc(collection(db, "clientes"), {
        nome: form.get("nome"),
        documento: form.get("documento"),
        cidade: form.get("cidade"),
        estado: form.get("estado"),
        endereco: form.get("endereco"),
        email: form.get("email"),
        whatsapp: form.get("whatsapp"),
        ativo: true,
        fotoUrl: foto.url || "",
        fotoPath: foto.path || "",
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      setSaving(false);
      window.setTimeout(() => navigate(`/clientes/${docRef.id}`), 1200);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Não foi possível salvar o cliente."));
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Novo Cliente" subtitle="Cadastre os dados do cliente." />
      <form className="form-card form-grid" onSubmit={submit}>
        {["nome", "documento", "endereco", "cidade", "estado", "email", "whatsapp"].map((name) => (
          <label className="field" key={name}>
            <span>{label(name)}</span>
            <input
              name={name}
              required={name === "nome"}
              type={name === "email" ? "email" : "text"}
              inputMode={name === "documento" || name === "whatsapp" ? "numeric" : undefined}
              maxLength={name === "documento" ? 18 : name === "whatsapp" ? 15 : name === "estado" ? 2 : undefined}
              value={formValues[name]}
              onChange={(event) => updateField(name, event.target.value)}
            />
          </label>
        ))}
        <label className="field full">
          <span>Foto</span>
          <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        <div className="form-actions-line">
          <button className="compact-button" type="submit" disabled={saving}>
            <Save size={18} /> {saving ? "Salvando..." : "Salvar cliente"}
          </button>
        </div>
      </form>
      {success ? (
        <div className="notify success">
          <div>
            <strong>Cliente cadastrado</strong>
            <p>O cadastro foi concluído com sucesso.</p>
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
}

function label(name: string) {
  return ({ nome: "Nome", documento: "CNPJ/CPF", endereco: "Endereço", cidade: "Cidade", estado: "Estado", email: "Email", whatsapp: "WhatsApp" } as Record<string, string>)[name];
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDocument(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d)/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d)/, "($1) $2-$3");

  return digits.replace(/^(\d{2})(\d{5})(\d)/, "($1) $2-$3");
}
