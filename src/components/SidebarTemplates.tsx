import type { ChangeEvent, DragEvent } from "react";
import type { TemplateDefinition } from "../types";

type SidebarTemplatesProps = {
  templates: TemplateDefinition[];
  currentTemplateId: string | null;
  duplicateWarning: string | null;
  onSelectTemplate: (templateId: string) => void;
  onRemoveTemplate: (templateId: string) => void;
  onFilesSelected: (files: FileList | null) => void;
  onDropFiles: (files: FileList | null) => void;
  onExport: () => void;
};

export function SidebarTemplates({
  templates,
  currentTemplateId,
  duplicateWarning,
  onSelectTemplate,
  onRemoveTemplate,
  onFilesSelected,
  onDropFiles,
  onExport,
}: SidebarTemplatesProps) {
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    onDropFiles(event.dataTransfer.files);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Templates</h2>
        <button className="primary" onClick={onExport} disabled={templates.length === 0}>
          Exportar
        </button>
      </div>

      <label
        className="dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input type="file" accept="image/png,image/jpeg" multiple onChange={handleInput} />
        <span>Arraste PNG/JPG ou clique para selecionar</span>
      </label>

      {duplicateWarning ? <p className="hint warning">{duplicateWarning}</p> : null}

      <div className="template-list">
        {templates.length === 0 ? (
          <p className="hint">Nenhum template carregado.</p>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className={`template-item ${currentTemplateId === template.id ? "active" : ""}`}
            >
              <button className="template-select" onClick={() => onSelectTemplate(template.id)}>
                <strong>{template.fileName}</strong>
                <span>
                  {template.naturalWidthPx}x{template.naturalHeightPx}px
                </span>
              </button>
              <button className="ghost danger" onClick={() => onRemoveTemplate(template.id)}>
                remover
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
