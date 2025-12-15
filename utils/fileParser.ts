// We use dynamic imports to ensure the app loads even if these heavy libraries
// fail to initialize immediately or if the network is slow.

export const parseFile = async (file: File): Promise<string> => {
  const fileType = file.type;

  if (fileType === "application/pdf") {
    return parsePDF(file);
  } else if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
    fileType === "application/msword"
  ) {
    return parseDocx(file);
  } else if (fileType === "text/plain") {
    return parseTxt(file);
  } else {
    throw new Error("Định dạng file không hỗ trợ. Vui lòng tải file .txt, .pdf, hoặc .docx");
  }
};

const parseTxt = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(new Error("Lỗi đọc file text."));
    reader.readAsText(file);
  });
};

const parseDocx = async (file: File): Promise<string> => {
  try {
    // Dynamic import for mammoth with explicit default fallback
    // @ts-ignore
    const mammothModule = await import('https://esm.sh/mammoth@1.6.0');
    const mammoth = mammothModule.default || mammothModule;

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    throw new Error("Không thể đọc file Word. Vui lòng kiểm tra lại file.");
  }
};

const parsePDF = async (file: File): Promise<string> => {
  try {
    // Dynamic import for PDF.js with explicit default fallback
    // @ts-ignore
    const pdfjsDist = await import('https://esm.sh/pdfjs-dist@3.11.174');
    const pdfjsLib = pdfjsDist.default || pdfjsDist;
    
    // Set worker source dynamically ensuring version match
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
       pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Không thể đọc file PDF. Có thể file bị mã hóa hoặc chứa ảnh.");
  }
};