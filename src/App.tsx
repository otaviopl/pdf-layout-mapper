import { useEffect, useMemo, useRef, useState } from "react";
import { SidebarFields } from "./components/SidebarFields";
import { SidebarTemplates } from "./components/SidebarTemplates";
import { TemplateViewer } from "./components/TemplateViewer";
import type { FieldDefinition, FieldMapExport, SnapMode, TemplateDefinition } from "./types";
import { PAGE_H, PAGE_W, fieldPxToPt } from "./utils/coords";
import { slugifyTemplateId } from "./utils/slug";

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function loadImageDimensions(file: File) {
  const src = URL.createObjectURL(file);

  return new Promise<{
    fileName: string;
    size: number;
    src: string;
    naturalWidthPx: number;
    naturalHeightPx: number;
  }>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        fileName: file.name,
        size: file.size,
        src,
        naturalWidthPx: image.naturalWidth,
        naturalHeightPx: image.naturalHeight,
      });
    image.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error(`Falha ao carregar ${file.name}`));
    };
    image.src = src;
  });
}

export default function App() {
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [snapMode, setSnapMode] = useState<SnapMode>("0.5");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [packageName, setPackageName] = useState("field-map");
  const templatesRef = useRef<TemplateDefinition[]>([]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  useEffect(() => {
    return () => {
      templatesRef.current.forEach((template) => URL.revokeObjectURL(template.src));
    };
  }, []);

  const currentTemplate =
    templates.find((template) => template.id === currentTemplateId) ?? null;

  const duplicateKeys = useMemo(
    () => new Set(templates.map((template) => `${template.fileName}:${template.size}`)),
    [templates],
  );

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) {
      return;
    }

    const imageFiles = Array.from(fileList).filter((file) =>
      ["image/png", "image/jpeg"].includes(file.type),
    );

    if (imageFiles.length === 0) {
      return;
    }

    const seenInBatch = new Set<string>();
    const freshFiles = imageFiles.filter((file) => {
      const key = `${file.name}:${file.size}`;
      if (duplicateKeys.has(key) || seenInBatch.has(key)) {
        return false;
      }

      seenInBatch.add(key);
      return true;
    });
    const duplicates = imageFiles.length - freshFiles.length;

    if (duplicates > 0) {
      setDuplicateWarning(`${duplicates} template(s) duplicado(s) ignorado(s).`);
    } else {
      setDuplicateWarning(null);
    }

    const nextTemplates = await Promise.all(freshFiles.map(loadImageDimensions));
    if (nextTemplates.length === 0) {
      return;
    }

    const createdTemplates: TemplateDefinition[] = nextTemplates.map((item) => ({
      id: createId("template"),
      templateId: slugifyTemplateId(item.fileName),
      fileName: item.fileName,
      size: item.size,
      src: item.src,
      naturalWidthPx: item.naturalWidthPx,
      naturalHeightPx: item.naturalHeightPx,
      fields: [],
    }));

    setTemplates((current) => [...current, ...createdTemplates]);
    setCurrentTemplateId((current) => current ?? createdTemplates[0].id);
  };

  const updateCurrentTemplate = (
    updater: (template: TemplateDefinition) => TemplateDefinition,
  ) => {
    if (!currentTemplateId) {
      return;
    }

    setTemplates((current) =>
      current.map((template) =>
        template.id === currentTemplateId ? updater(template) : template,
      ),
    );
  };

  const handleCreateField = (
    rect: Pick<FieldDefinition, "xPx" | "yPx" | "widthPx" | "heightPx"> &
      Pick<FieldDefinition, "name" | "fontSize" | "align" | "lineClamp">,
  ) => {
    updateCurrentTemplate((template) => {
      const field: FieldDefinition = {
        id: createId("field"),
        ...rect,
      };

      setSelectedFieldId(field.id);
      return { ...template, fields: [...template.fields, field] };
    });
  };

  const handleUpdateField = (
    fieldId: string,
    patch: Partial<
      Pick<
        FieldDefinition,
        "name" | "fontSize" | "align" | "lineClamp" | "xPx" | "yPx" | "widthPx" | "heightPx"
      >
    >,
  ) => {
    updateCurrentTemplate((template) => ({
      ...template,
      fields: template.fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    }));
  };

  const handleDeleteField = (fieldId: string) => {
    updateCurrentTemplate((template) => ({
      ...template,
      fields: template.fields.filter((field) => field.id !== fieldId),
    }));
    setSelectedFieldId((current) => (current === fieldId ? null : current));
  };

  const handleDuplicateField = (fieldId: string) => {
    updateCurrentTemplate((template) => {
      const original = template.fields.find((field) => field.id === fieldId);
      if (!original) {
        return template;
      }

      const duplicate: FieldDefinition = {
        ...original,
        id: createId("field"),
        name: `${original.name} copy`,
        xPx: Math.min(original.xPx + 12, template.naturalWidthPx - original.widthPx),
        yPx: Math.min(original.yPx + 12, template.naturalHeightPx - original.heightPx),
      };

      setSelectedFieldId(duplicate.id);
      return { ...template, fields: [...template.fields, duplicate] };
    });
  };

  const handleRemoveTemplate = (templateId: string) => {
    setTemplates((current) => {
      const template = current.find((item) => item.id === templateId);
      if (template) {
        URL.revokeObjectURL(template.src);
      }
      const remaining = current.filter((item) => item.id !== templateId);

      if (currentTemplateId === templateId) {
        setCurrentTemplateId(remaining[0]?.id ?? null);
        setSelectedFieldId(null);
      }

      return remaining;
    });
  };

  const buildExportPayload = (packageName: string): FieldMapExport => ({
    packageName,
    page: { w: PAGE_W, h: PAGE_H, unit: "pt" },
    templates: templates.map((template) => ({
      templateId: template.templateId,
      fileName: template.fileName,
      image: {
        naturalWidthPx: template.naturalWidthPx,
        naturalHeightPx: template.naturalHeightPx,
      },
      fields: template.fields.map((field) =>
        fieldPxToPt(field, template.naturalWidthPx, template.naturalHeightPx),
      ),
    })),
  });

  const copyJson = async (json: string) => {
    try {
      await navigator.clipboard.writeText(json);
      setToast("JSON copiado");
      return true;
    } catch {
      setToast("Falha ao copiar para a área de transferência.");
      return false;
    }
  };

  const handleDownloadExport = async () => {
    if (templates.length === 0) {
      return;
    }

    const normalizedPackageName = packageName.trim() || "field-map";
    const payload = buildExportPayload(normalizedPackageName);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${normalizedPackageName}.fieldmap.json`;
    link.click();
    URL.revokeObjectURL(url);
    await copyJson(json);
    setToast("Exportado com sucesso");
    setIsExportModalOpen(false);
  };

  const handleCopyExport = async () => {
    if (templates.length === 0) {
      return;
    }

    const normalizedPackageName = packageName.trim() || "field-map";
    const payload = buildExportPayload(normalizedPackageName);
    const json = JSON.stringify(payload, null, 2);
    await copyJson(json);
  };

  return (
    <div className="app-shell">
      <SidebarTemplates
        templates={templates}
        currentTemplateId={currentTemplateId}
        duplicateWarning={duplicateWarning}
        onSelectTemplate={(templateId) => {
          setCurrentTemplateId(templateId);
          setSelectedFieldId(null);
        }}
        onRemoveTemplate={handleRemoveTemplate}
        onFilesSelected={handleFiles}
        onDropFiles={handleFiles}
        onExport={() => setIsExportModalOpen(true)}
      />

      <main className="app-main">
        <div className="toolbar">
          <div className="snap-switcher">
            <span>Snap</span>
            <button
              className={snapMode === "0.5" ? "active" : ""}
              onClick={() => setSnapMode("0.5")}
            >
              0.5 pt
            </button>
            <button
              className={snapMode === "1.0" ? "active" : ""}
              onClick={() => setSnapMode("1.0")}
            >
              1.0 pt
            </button>
            <button
              className={snapMode === "free" ? "active" : ""}
              onClick={() => setSnapMode("free")}
            >
              livre
            </button>
          </div>
          <p className="hint">SHIFT força snap 1pt ao mover/redimensionar.</p>
        </div>

        <TemplateViewer
          template={currentTemplate}
          selectedFieldId={selectedFieldId}
          snapMode={snapMode}
          onSelectField={setSelectedFieldId}
          onCreateField={handleCreateField}
          onUpdateFieldRect={handleUpdateField}
        />
      </main>

      <SidebarFields
        template={currentTemplate}
        selectedFieldId={selectedFieldId}
        onSelectField={setSelectedFieldId}
        onUpdateField={handleUpdateField}
        onDeleteField={handleDeleteField}
        onDuplicateField={handleDuplicateField}
      />

      {toast ? <div className="toast">{toast}</div> : null}

      {isExportModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsExportModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="sidebar-header">
              <h2>Exportar</h2>
              <button className="ghost" onClick={() => setIsExportModalOpen(false)}>
                fechar
              </button>
            </div>

            <label>
              <span>Nome do pacote</span>
              <input
                type="text"
                value={packageName}
                onChange={(event) => setPackageName(event.target.value)}
              />
            </label>

            <p className="hint">
              O arquivo será salvo como <strong>{packageName.trim() || "field-map"}.fieldmap.json</strong>.
            </p>

            <div className="field-actions">
              <button className="ghost" onClick={handleCopyExport}>
                Copiar
              </button>
              <button className="primary" onClick={handleDownloadExport}>
                Exportar JSON
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
