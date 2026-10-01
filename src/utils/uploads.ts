// Leave room for multipart headers under Vercel's 4.5 MB request limit.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function prepareUpload(form: FormData): Promise<FormData> {
  const prepared = new FormData();
  let bytes = 0;
  for (const [key, value] of form.entries()) {
    let result = value;
    if (value instanceof File && /^image\/(jpeg|png|webp)$/.test(value.type) && value.size > 600_000) {
      const bitmap = await createImageBitmap(value);
      try {
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No se pudo preparar la imagen.');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        let blob: Blob | null = null;
        for (const quality of [0.85, 0.7, 0.55, 0.4]) {
          blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
          if (blob && blob.size <= 600_000) break;
        }
        if (blob) result = new File([blob], value.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      } finally { bitmap.close(); }
    }
    bytes += typeof result === 'string' ? new TextEncoder().encode(result).length : result.size;
    prepared.append(key, result);
  }
  if (bytes > MAX_UPLOAD_BYTES) throw new Error('La carga supera 4 MB. Reduce el tamaño de los archivos o súbelos por separado.');
  return prepared;
}

export async function uploadError(response: Response): Promise<Error> {
  if (response.status === 413) return new Error('La carga supera el tamaño permitido. Reduce el archivo e inténtalo de nuevo.');
  const body = await response.json().catch(() => null);
  return new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message || `No se pudo cargar el archivo (${response.status}).`);
}
