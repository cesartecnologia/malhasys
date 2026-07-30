type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf"
]);

function validateUpload(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("O arquivo deve ter no máximo 8 MB.");
  }

  if (extension === "svg" || file.type === "image/svg+xml") {
    throw new Error("Arquivos SVG não são permitidos por segurança.");
  }

  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new Error("Formato de arquivo não permitido. Use JPG, PNG, WebP, GIF ou PDF.");
  }
}

export async function uploadFile(folder: string, file?: File | null) {
  if (!file) return {};
  validateUpload(file);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("O envio de arquivos ainda não está disponível. Fale com o suporte.");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(cloudName)) {
    throw new Error("O envio de arquivos ainda não está disponível. Fale com o suporte.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder.replace(/^\/+|\/+$/g, ""));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData
  });

  const data = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || !data.secure_url) {
    throw new Error("Não foi possível enviar o arquivo.");
  }

  return { url: data.secure_url, path: data.public_id || "" };
}
