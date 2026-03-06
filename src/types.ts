export type Align = "left" | "center" | "right";

export type SnapMode = "free" | "0.5" | "1.0";

export type FieldExport = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  align: Align;
  lineClamp: number;
};

export type TemplateExport = {
  templateId: string;
  fileName: string;
  image: {
    naturalWidthPx: number;
    naturalHeightPx: number;
  };
  fields: FieldExport[];
};

export type FieldMapExport = {
  packageName: string;
  page: {
    w: number;
    h: number;
    unit: "pt";
  };
  templates: TemplateExport[];
};

export type FieldDefinition = {
  id: string;
  name: string;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  fontSize: number;
  align: Align;
  lineClamp: number;
};

export type TemplateDefinition = {
  id: string;
  templateId: string;
  fileName: string;
  size: number;
  src: string;
  naturalWidthPx: number;
  naturalHeightPx: number;
  fields: FieldDefinition[];
};
