import PDFDocument from 'pdfkit';

export interface TextOptions extends PDFKit.Mixins.TextOptions {
  lineSpacing?: number;
  preserveNewlines?: boolean;
}

export interface PageConfig {
  margin: number;
  maxY: number;
  defaultLineSpacing: number;
}

const DEFAULT_CONFIG: PageConfig = {
  margin: 50,
  maxY: 700,
  defaultLineSpacing: 1.1
};

export class PDFTemplateUtils {
  private doc: PDFKit.PDFDocument;
  private config: PageConfig;

  constructor(doc: PDFKit.PDFDocument, config: Partial<PageConfig> = {}) {
    this.doc = doc;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Adds a new page and resets the Y position
   * @returns The new Y position (at margin)
   */
  addPage(): number {
    this.doc.addPage();
    return this.config.margin;
  }

  /**
   * Checks if we need to add a new page based on current Y position
   * @param currentY The current Y position
   * @param requiredSpace Additional space needed (optional)
   * @returns The adjusted Y position, potentially on a new page
   */
  checkPageBreak(currentY: number, requiredSpace: number = 0): number {
    if (currentY + requiredSpace > this.config.maxY) {
      return this.addPage();
    }
    return currentY;
  }

  /**
   * Adds a section header with an underline
   * @param title The section title
   * @param y The Y position
   * @param color The text color (optional)
   * @returns The new Y position below the section header
   */
  addSection(title: string, y: number, color?: string): number {
    y = this.checkPageBreak(y, 50); // Ensure space for title and underline

    if (color) this.doc.fillColor(color);
    this.doc.fontSize(14).text(title, this.config.margin, y);

    // Add underline
    this.doc
      .moveTo(this.config.margin, y + 25)
      .lineTo(550, y + 25)
      .strokeColor(color || 'black')
      .stroke();

    return y + 40;
  }

  /**
   * Adds a labeled field with content
   */
  addField(label: string, content: string, y: number, options: TextOptions = {}): number {
    const lineSpacing = options.lineSpacing || this.config.defaultLineSpacing;
    const preserveNewlines = options.preserveNewlines || false;
    
    // Start a new page if we're too close to the bottom
    y = this.checkPageBreak(y, 50);
    
    // Save the current Y position
    const startY = y;
    
    // Add the bold label
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(label, this.config.margin + 20, y, {
        continued: false
      })
      .font('Helvetica'); // Switch back to regular font
    
    // Move down for content with increased spacing
    y += this.doc.currentLineHeight() * (lineSpacing + 0.5);
    
    // Handle the content
    const contentX = this.config.margin + 40;
    const contentWidth = 460;
    
    if (preserveNewlines) {
      // Split by newlines and handle each paragraph
      const paragraphs = content.split('\n').filter(p => p.trim());
      paragraphs.forEach((paragraph, index) => {
        // Check if we need a new page
        y = this.checkPageBreak(y, this.doc.currentLineHeight() * 2);
        
        this.doc.text(paragraph, contentX, y, {
          width: contentWidth,
          align: options.align,
          lineBreak: true
        });
        
        // Get the height of the rendered text
        const height = this.doc.heightOfString(paragraph, { width: contentWidth });
        y += height + (index < paragraphs.length - 1 ? this.doc.currentLineHeight() * 0.5 : 0);
      });
    } else {
      // Check if we need a new page
      y = this.checkPageBreak(y, this.doc.currentLineHeight() * 2);
      
      this.doc.text(content, contentX, y, {
        width: contentWidth,
        align: options.align,
        lineBreak: true
      });
      
      // Get the height of the rendered text
      const height = this.doc.heightOfString(content, { width: contentWidth });
      y += height;
    }
    
    // Add some padding after the field
    return y + this.doc.currentLineHeight() * 0.5;
  }

  /**
   * Adds wrapped text with proper page breaks
   */
  addWrappedText(text: string, x: number, y: number, width: number, options: TextOptions = {}): number {
    const lineSpacing = options.lineSpacing || this.config.defaultLineSpacing;
    
    // Start a new page if we're too close to the bottom
    y = this.checkPageBreak(y, this.doc.currentLineHeight() * 2);
    
    // Use PDFKit's built-in text wrapping
    this.doc.text(text, x, y, {
      width: width,
      align: options.align,
      lineBreak: true
    });
    
    // Get the height of the rendered text
    const height = this.doc.heightOfString(text, { width });
    
    // Return the new Y position
    return y + height + (this.doc.currentLineHeight() * (lineSpacing - 1));
  }
}
