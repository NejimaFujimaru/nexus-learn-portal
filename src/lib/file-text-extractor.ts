// File text extraction utilities for TXT, DOCX, and PDF files
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export type SupportedFileType = 'txt' | 'docx' | 'pdf';

export const getSupportedFileTypes = (): string => {
  return '.txt,.docx,.pdf';
};

export const getFileType = (file: File): SupportedFileType | null => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'txt') return 'txt';
  if (extension === 'docx') return 'docx';
  if (extension === 'pdf') return 'pdf';
  return null;
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = getFileType(file);
  
  if (!fileType) {
    throw new Error('Unsupported file type. Please use TXT, DOCX, or PDF files.');
  }

  switch (fileType) {
    case 'txt':
      return extractFromTxt(file);
    case 'docx':
      return extractFromDocx(file);
    case 'pdf':
      return extractFromPdf(file);
    default:
      throw new Error('Unsupported file type');
  }
};

const extractFromTxt = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Failed to read TXT file'));
    reader.readAsText(file);
  });
};

const extractFromDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const extractFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText.trim();
};
