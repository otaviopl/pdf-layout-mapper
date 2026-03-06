import type { ChangeEvent } from "react";
import type { FieldDefinition, TemplateDefinition } from "../types";
import { fieldMetricsPt } from "../utils/coords";

type SidebarFieldsProps = {
  template: TemplateDefinition | null;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onUpdateField: (
    fieldId: string,
    patch: Partial<Pick<FieldDefinition, "name" | "fontSize" | "align" | "lineClamp">>,
  ) => void;
  onDeleteField: (fieldId: string) => void;
  onDuplicateField: (fieldId: string) => void;
};

export function SidebarFields({
  template,
  selectedFieldId,
  onSelectField,
  onUpdateField,
  onDeleteField,
  onDuplicateField,
}: SidebarFieldsProps) {
  const selectedField =
    template?.fields.find((field) => field.id === selectedFieldId) ?? null;

  const handleNumberChange =
    (fieldId: string, key: "fontSize" | "lineClamp") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value);
      if (Number.isNaN(nextValue)) {
        return;
      }

      onUpdateField(fieldId, {
        [key]: Math.max(1, Math.round(nextValue)),
      } as Partial<Pick<FieldDefinition, "fontSize" | "lineClamp">>);
    };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Campos</h2>
        {template ? <span>{template.fields.length} itens</span> : null}
      </div>

      {!template ? (
        <p className="hint">Selecione ou carregue um template.</p>
      ) : (
        <>
          <div className="field-list">
            {template.fields.length === 0 ? (
              <p className="hint">Desenhe um retângulo para criar o primeiro campo.</p>
            ) : (
              template.fields.map((field) => (
                <button
                  key={field.id}
                  className={`field-item ${field.id === selectedFieldId ? "active" : ""}`}
                  onClick={() => onSelectField(field.id)}
                >
                  <strong>{field.name}</strong>
                  <span>
                    {field.widthPx.toFixed(0)}x{field.heightPx.toFixed(0)}px
                  </span>
                </button>
              ))
            )}
          </div>

          {selectedField ? (
            <div className="field-editor">
              <label>
                <span>Nome</span>
                <input
                  type="text"
                  value={selectedField.name}
                  onChange={(event) =>
                    onUpdateField(selectedField.id, { name: event.target.value })
                  }
                />
              </label>

              <label>
                <span>Font size</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={selectedField.fontSize}
                  onChange={handleNumberChange(selectedField.id, "fontSize")}
                />
              </label>

              <label>
                <span>Align</span>
                <select
                  value={selectedField.align}
                  onChange={(event) =>
                    onUpdateField(selectedField.id, {
                      align: event.target.value as FieldDefinition["align"],
                    })
                  }
                >
                  <option value="left">left</option>
                  <option value="center">center</option>
                  <option value="right">right</option>
                </select>
              </label>

              <label>
                <span>Line clamp</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={selectedField.lineClamp}
                  onChange={handleNumberChange(selectedField.id, "lineClamp")}
                />
              </label>

              <div className="metrics">
                {(() => {
                  const metrics = fieldMetricsPt(
                    selectedField,
                    template.naturalWidthPx,
                    template.naturalHeightPx,
                  );

                  return (
                    <>
                      <span>x: {metrics.x} pt</span>
                      <span>y: {metrics.y} pt</span>
                      <span>w: {metrics.width} pt</span>
                      <span>h: {metrics.height} pt</span>
                    </>
                  );
                })()}
              </div>

              <div className="field-actions">
                <button className="ghost" onClick={() => onDuplicateField(selectedField.id)}>
                  Duplicar
                </button>
                <button className="ghost danger" onClick={() => onDeleteField(selectedField.id)}>
                  Deletar
                </button>
              </div>
            </div>
          ) : (
            <p className="hint">Selecione um campo para editar.</p>
          )}
        </>
      )}
    </aside>
  );
}
