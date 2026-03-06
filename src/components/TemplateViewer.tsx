import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Align, FieldDefinition, SnapMode, TemplateDefinition } from "../types";
import { snapPxX, snapPxY } from "../utils/coords";

type DraftField = {
  name: string;
  fontSize: number;
  align: Align;
  lineClamp: number;
};

type Rect = {
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
};

type Interaction =
  | {
      type: "draw";
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      shiftKey: boolean;
    }
  | {
      type: "move";
      fieldId: string;
      startX: number;
      startY: number;
      origin: Rect;
      shiftKey: boolean;
    }
  | {
      type: "resize";
      fieldId: string;
      startX: number;
      startY: number;
      origin: Rect;
      shiftKey: boolean;
    };

type PendingField = Rect & {
  draft: DraftField;
};

type TemplateViewerProps = {
  template: TemplateDefinition | null;
  selectedFieldId: string | null;
  snapMode: SnapMode;
  onSelectField: (fieldId: string | null) => void;
  onCreateField: (rect: Rect & DraftField) => void;
  onUpdateFieldRect: (fieldId: string, rect: Partial<FieldDefinition>) => void;
};

const MIN_SIZE_PX = 5;

const defaultDraft: DraftField = {
  name: "",
  fontSize: 7,
  align: "left",
  lineClamp: 1,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRect(startX: number, startY: number, endX: number, endY: number): Rect {
  return {
    xPx: Math.min(startX, endX),
    yPx: Math.min(startY, endY),
    widthPx: Math.abs(endX - startX),
    heightPx: Math.abs(endY - startY),
  };
}

function snapRect(rect: Rect, template: TemplateDefinition, mode: SnapMode): Rect {
  const xPx = snapPxX(rect.xPx, template.naturalWidthPx, mode);
  const yPx = snapPxY(rect.yPx, template.naturalHeightPx, mode);
  const maxWidth = template.naturalWidthPx - xPx;
  const maxHeight = template.naturalHeightPx - yPx;

  return {
    xPx,
    yPx,
    widthPx: clamp(snapPxX(rect.widthPx, template.naturalWidthPx, mode), MIN_SIZE_PX, maxWidth),
    heightPx: clamp(
      snapPxY(rect.heightPx, template.naturalHeightPx, mode),
      MIN_SIZE_PX,
      maxHeight,
    ),
  };
}

export function TemplateViewer({
  template,
  selectedFieldId,
  snapMode,
  onSelectField,
  onCreateField,
  onUpdateFieldRect,
}: TemplateViewerProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [pendingField, setPendingField] = useState<PendingField | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setInteraction(null);
    setPendingField(null);
  }, [template?.id]);

  useEffect(() => {
    if (!interaction || !template) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const nextSnap = event.shiftKey ? "1.0" : snapMode;

      if (interaction.type === "draw") {
        setInteraction((current) =>
          current && current.type === "draw"
            ? {
                ...current,
                currentX: clampCoordinateX(event),
                currentY: clampCoordinateY(event),
                shiftKey: event.shiftKey,
              }
            : current,
        );
        return;
      }

      if (interaction.type === "move") {
        const dx = clampCoordinateX(event) - interaction.startX;
        const dy = clampCoordinateY(event) - interaction.startY;

        const maxX = template.naturalWidthPx - interaction.origin.widthPx;
        const maxY = template.naturalHeightPx - interaction.origin.heightPx;

        const xPx = clamp(
          snapPxX(
            clamp(interaction.origin.xPx + dx, 0, maxX),
            template.naturalWidthPx,
            nextSnap,
          ),
          0,
          maxX,
        );
        const yPx = clamp(
          snapPxY(
            clamp(interaction.origin.yPx + dy, 0, maxY),
            template.naturalHeightPx,
            nextSnap,
          ),
          0,
          maxY,
        );

        onUpdateFieldRect(interaction.fieldId, { xPx, yPx });
        return;
      }

      const dx = clampCoordinateX(event) - interaction.startX;
      const dy = clampCoordinateY(event) - interaction.startY;

      const widthPx = snapPxX(
        clamp(interaction.origin.widthPx + dx, MIN_SIZE_PX, template.naturalWidthPx - interaction.origin.xPx),
        template.naturalWidthPx,
        nextSnap,
      );
      const heightPx = snapPxY(
        clamp(
          interaction.origin.heightPx + dy,
          MIN_SIZE_PX,
          template.naturalHeightPx - interaction.origin.yPx,
        ),
        template.naturalHeightPx,
        nextSnap,
      );

      onUpdateFieldRect(interaction.fieldId, { widthPx, heightPx });
    };

    const handlePointerUp = () => {
      if (interaction.type === "draw") {
        const rect = snapRect(
          normalizeRect(
            interaction.startX,
            interaction.startY,
            interaction.currentX,
            interaction.currentY,
          ),
          template,
          interaction.shiftKey ? "1.0" : snapMode,
        );

        if (rect.widthPx >= MIN_SIZE_PX && rect.heightPx >= MIN_SIZE_PX) {
          setPendingField({ ...rect, draft: defaultDraft });
        }
      }

      setInteraction(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [interaction, onUpdateFieldRect, snapMode, template]);

  const clampCoordinateX = (event: PointerEvent | ReactPointerEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || !template) {
      return 0;
    }

    return clamp(event.clientX - rect.left, 0, template.naturalWidthPx);
  };

  const clampCoordinateY = (event: PointerEvent | ReactPointerEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || !template) {
      return 0;
    }

    return clamp(event.clientY - rect.top, 0, template.naturalHeightPx);
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!template || event.target !== event.currentTarget) {
      return;
    }

    onSelectField(null);
    setPendingField(null);

    setInteraction({
      type: "draw",
      startX: clampCoordinateX(event),
      startY: clampCoordinateY(event),
      currentX: clampCoordinateX(event),
      currentY: clampCoordinateY(event),
      shiftKey: event.shiftKey,
    });
  };

  if (!template) {
    return (
      <section className="viewer-empty">
        <p>Carregue um ou mais templates para começar.</p>
      </section>
    );
  }

  const draftRect =
    interaction?.type === "draw"
      ? normalizeRect(
          interaction.startX,
          interaction.startY,
          interaction.currentX,
          interaction.currentY,
        )
      : null;

  return (
    <section className="viewer-shell">
      <div className="viewer-meta">
        <strong>{template.fileName}</strong>
        <span>
          {cursor ? `${cursor.x.toFixed(0)}px, ${cursor.y.toFixed(0)}px` : "mova o cursor"}
        </span>
      </div>

      <div className="viewer-scroll">
        <div
          ref={overlayRef}
          className="viewer-stage"
          style={{ width: template.naturalWidthPx, height: template.naturalHeightPx }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={(event) =>
            setCursor({ x: clampCoordinateX(event), y: clampCoordinateY(event) })
          }
          onPointerLeave={() => setCursor(null)}
        >
          <img src={template.src} alt={template.fileName} draggable={false} />

          {template.fields.map((field) => (
            <button
              key={field.id}
              className={`field-rect ${field.id === selectedFieldId ? "selected" : ""}`}
              style={{
                left: field.xPx,
                top: field.yPx,
                width: field.widthPx,
                height: field.heightPx,
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectField(field.id);
                setInteraction({
                  type: "move",
                  fieldId: field.id,
                  startX: clampCoordinateX(event),
                  startY: clampCoordinateY(event),
                  origin: {
                    xPx: field.xPx,
                    yPx: field.yPx,
                    widthPx: field.widthPx,
                    heightPx: field.heightPx,
                  },
                  shiftKey: event.shiftKey,
                });
              }}
            >
              <span>{field.name}</span>
              <span
                className="resize-handle"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectField(field.id);
                  setInteraction({
                    type: "resize",
                    fieldId: field.id,
                    startX: clampCoordinateX(event),
                    startY: clampCoordinateY(event),
                    origin: {
                      xPx: field.xPx,
                      yPx: field.yPx,
                      widthPx: field.widthPx,
                      heightPx: field.heightPx,
                    },
                    shiftKey: event.shiftKey,
                  });
                }}
              />
            </button>
          ))}

          {draftRect ? (
            <div
              className="field-rect draft"
              style={{
                left: draftRect.xPx,
                top: draftRect.yPx,
                width: draftRect.widthPx,
                height: draftRect.heightPx,
              }}
            />
          ) : null}
        </div>
      </div>

      {pendingField ? (
        <div className="inline-editor">
          <div className="inline-editor-header">
            <strong>Novo campo</strong>
            <button className="ghost" onClick={() => setPendingField(null)}>
              cancelar
            </button>
          </div>

          <label>
            <span>Nome</span>
            <input
              autoFocus
              type="text"
              value={pendingField.draft.name}
              onChange={(event) =>
                setPendingField((current) =>
                  current
                    ? {
                        ...current,
                        draft: { ...current.draft, name: event.target.value },
                      }
                    : null,
                )
              }
            />
          </label>

          <div className="inline-grid">
            <label>
              <span>Font</span>
              <input
                type="number"
                min={1}
                step={1}
                value={pendingField.draft.fontSize}
                onChange={(event) =>
                  setPendingField((current) =>
                    current
                      ? {
                          ...current,
                          draft: {
                            ...current.draft,
                            fontSize: Number(event.target.value) || 7,
                          },
                        }
                      : null,
                  )
                }
              />
            </label>

            <label>
              <span>Align</span>
              <select
                value={pendingField.draft.align}
                onChange={(event) =>
                  setPendingField((current) =>
                    current
                      ? {
                          ...current,
                          draft: {
                            ...current.draft,
                            align: event.target.value as Align,
                          },
                        }
                      : null,
                  )
                }
              >
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
              </select>
            </label>

            <label>
              <span>Clamp</span>
              <input
                type="number"
                min={1}
                step={1}
                value={pendingField.draft.lineClamp}
                onChange={(event) =>
                  setPendingField((current) =>
                    current
                      ? {
                          ...current,
                          draft: {
                            ...current.draft,
                            lineClamp: Number(event.target.value) || 1,
                          },
                        }
                      : null,
                  )
                }
              />
            </label>
          </div>

          <button
            className="primary"
            onClick={() => {
              const name = pendingField.draft.name.trim();
              if (!name) {
                setPendingField(null);
                return;
              }

              onCreateField({ ...pendingField, ...pendingField.draft, name });
              setPendingField(null);
            }}
          >
            Criar campo
          </button>
        </div>
      ) : null}
    </section>
  );
}
