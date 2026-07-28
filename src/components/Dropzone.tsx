import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { isMaterialList, type MaterialList } from "../types";

interface DropzoneProps {
  onLoaded: (list: MaterialList) => void;
}

export default function Dropzone({ onLoaded }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isMaterialList(parsed)) {
        setError("El JSON no tiene el formato esperado: { name, items: [{ id, count }] }");
        return;
      }
      onLoaded(parsed);
    } catch {
      setError("No se pudo leer el archivo. Verifica que sea un JSON válido.");
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="dropzone-wrap">
      <div
        className={`dropzone ${dragging ? "dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="dropzone-icon" />
        <p className="dropzone-title">Arrastra tu material list JSON aquí</p>
        <p className="dropzone-subtitle">o haz clic para elegir un archivo</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="dropzone-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="dropzone-error">{error}</p>}
    </div>
  );
}
