/**
 * PPT Export Service - Generates PowerPoint files
 */

const PptxGenJS = require('pptxgenjs');

class PPTExportService {
  constructor() {
    this.prs = null;
  }

  /**
   * Create a presentation from slides
   * @param {string} title - Presentation title
   * @param {Array} slides - Array of slide objects
   * @param {string} theme - Theme name (default, corporate, creative)
   * @returns {Promise<Buffer>} PPT file buffer
   */
  async createPresentation(title, slides, theme = 'default') {
    this.prs = new PptxGenJS();
    
    // Set presentation properties
    this.prs.defineLayout({ name: 'LAYOUT1', width: 10, height: 7.5 });
    this.prs.defineLayout({ name: 'TITLE_SLIDE', width: 10, height: 7.5 });

    // Apply theme
    this.applyTheme(theme);

    // Add title slide
    this.addTitleSlide(title);

    // Add content slides
    slides.forEach((slide, index) => {
      this.addContentSlide(slide, index);
    });

    return this.prs;
  }

  applyTheme(theme) {
    const themes = {
      default: {
        bgColor: { type: 'solid', color: 'FFFFFF' },
        titleColor: '003366',
        bodyColor: '444444',
        accentColor: '0066CC'
      },
      corporate: {
        bgColor: { type: 'solid', color: 'F5F5F5' },
        titleColor: '1F4E78',
        bodyColor: '333333',
        accentColor: '4472C4'
      },
      creative: {
        bgColor: { type: 'solid', color: 'FAFAFA' },
        titleColor: 'C55A11',
        bodyColor: '2F5233',
        accentColor: 'F2CC8F'
      }
    };

    this.theme = themes[theme] || themes.default;
  }

  addTitleSlide(title) {
    const slide = this.prs.addSlide();
    
    // Background
    slide.background = this.theme.bgColor;

    // Add background shape
    slide.addShape(this.prs.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: '30%',
      fill: { color: this.theme.titleColor }
    });

    // Title
    slide.addText(title, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1.5,
      fontSize: 48,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial'
    });

    // Subtitle
    slide.addText('StylesByShahid - AI Presentation Maker', {
      x: 0.5,
      y: 4.5,
      w: 9,
      h: 0.8,
      fontSize: 20,
      color: this.theme.accentColor,
      align: 'center',
      fontFace: 'Arial'
    });

    // Date
    slide.addText(new Date().toLocaleDateString(), {
      x: 0.5,
      y: 6.5,
      w: 9,
      h: 0.5,
      fontSize: 12,
      color: this.theme.bodyColor,
      align: 'center',
      fontFace: 'Arial'
    });
  }

  addContentSlide(slideData, index) {
    const slide = this.prs.addSlide();

    // Background
    slide.background = this.theme.bgColor;

    // Header line
    slide.addShape(this.prs.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.15,
      fill: { color: this.theme.titleColor }
    });

    // Slide number badge
    slide.addShape(this.prs.ShapeType.rect, {
      x: 0.3,
      y: 0.35,
      w: 0.6,
      h: 0.6,
      fill: { color: this.theme.accentColor }
    });

    slide.addText((index + 1).toString(), {
      x: 0.3,
      y: 0.35,
      w: 0.6,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial'
    });

    // Title
    slide.addText(slideData.title, {
      x: 1.1,
      y: 0.4,
      w: 5,
      h: 0.7,
      fontSize: 32,
      bold: true,
      color: this.theme.titleColor,
      fontFace: 'Arial'
    });

    // Subtitle (if present)
    if (slideData.subtitle) {
      slide.addText(slideData.subtitle, {
        x: 1.1,
        y: 1.0,
        w: 5,
        h: 0.4,
        fontSize: 16,
        italic: true,
        color: this.theme.accentColor,
        fontFace: 'Arial'
      });
    }

    // Image placeholder on the right side
    const imgX = 6.5;
    const imgY = 1.5;
    const imgW = 3;
    const imgH = 2.5;

    // Image placeholder box with slight shadow effect
    slide.addShape(this.prs.ShapeType.rect, {
      x: imgX + 0.05,
      y: imgY + 0.05,
      w: imgW,
      h: imgH,
      fill: { color: 'CCCCCC' }
    });

    slide.addShape(this.prs.ShapeType.rect, {
      x: imgX,
      y: imgY,
      w: imgW,
      h: imgH,
      fill: { color: 'F8F8F8' },
      line: { color: this.theme.accentColor, width: 2 }
    });

    // Image icon/placeholder text
    slide.addText('🖼️\n\nImage Placeholder', {
      x: imgX,
      y: imgY + 0.8,
      w: imgW,
      h: 1,
      fontSize: 14,
      color: '999999',
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial'
    });

    // Image suggestion caption
    if (slideData.imageSuggestion) {
      slide.addText(`Suggest: ${slideData.imageSuggestion}`, {
        x: imgX,
        y: imgY + imgH + 0.1,
        w: imgW,
        h: 0.3,
        fontSize: 9,
        italic: true,
        color: '888888',
        align: 'center',
        fontFace: 'Arial'
      });
    }

    // Description text (detailed explanation)
    const descStartY = slideData.subtitle ? 1.6 : 1.5;
    if (slideData.description) {
      slide.addText(slideData.description, {
        x: 0.5,
        y: descStartY,
        w: 5.5,
        h: 1.2,
        fontSize: 13,
        color: this.theme.bodyColor,
        fontFace: 'Arial',
        align: 'left',
        valign: 'top'
      });
    }

    // Key Points section
    const keyPointsStartY = descStartY + 1.3;
    
    slide.addText('Key Points:', {
      x: 0.5,
      y: keyPointsStartY,
      w: 5.5,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: this.theme.titleColor,
      fontFace: 'Arial'
    });

    // Key points bullets
    let yPos = keyPointsStartY + 0.5;
    const keyPoints = slideData.keyPoints || slideData.points || [];

    keyPoints.slice(0, 4).forEach((point, i) => {
      // Bullet point with custom styling
      slide.addText('▸', {
        x: 0.7,
        y: yPos,
        w: 0.3,
        h: 0.5,
        fontSize: 16,
        color: this.theme.accentColor,
        fontFace: 'Arial',
        bold: true
      });

      slide.addText(point, {
        x: 1.1,
        y: yPos,
        w: 5,
        h: 0.5,
        fontSize: 14,
        color: this.theme.bodyColor,
        fontFace: 'Arial'
      });
      yPos += 0.6;
    });

    // Footer
    slide.addText(`StylesByShahid | Slide ${index + 2}`, {
      x: 0.5,
      y: 7,
      w: 9,
      h: 0.4,
      fontSize: 10,
      color: '#AAAAAA',
      align: 'right',
      fontFace: 'Arial'
    });
  }

  /**
   * Export presentation to file
   * @param {Object} prs - PptxGenJS presentation object
   * @param {string} filename - Output filename
   * @returns {Promise<Buffer>} Buffer of PPT file
   */
  async exportToFile(prs, filename) {
    try {
      // Save to buffer
      const buffer = await prs.write({ outputType: 'arraybuffer' });
      return Buffer.from(buffer);
    } catch (error) {
      console.error('PPT export error:', error);
      throw error;
    }
  }

  /**
   * Get a Dropbox-compatible download stream
   */
  getDownloadBuffer(prs) {
    return prs.write({ outputType: 'arraybuffer' });
  }
}

module.exports = new PPTExportService();
