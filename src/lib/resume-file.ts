export async function readResumeFileText(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return file.text();
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const text = await page.getTextContent();
      pages.push(text.items.map((item: { str?: string }) => item.str ?? "").join(" "));
    }
    return pages.join("\n").replace(/\s+\n/g, "\n").trim();
  }
  throw new Error("Use a PDF or TXT file, or paste the resume / LinkedIn text.");
}
