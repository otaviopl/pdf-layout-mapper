export function slugifyTemplateId(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "");

  return (
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "template"
  );
}
