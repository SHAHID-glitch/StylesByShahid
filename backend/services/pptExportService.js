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

    // Title
    slide.addText((index + 1) + '. ' + slideData.title, {
      x: 0.5,
      y: 0.4,
      w: 9,
      h: 0.8,
      fontSize: 32,
      bold: true,
      color: this.theme.titleColor,
      fontFace: 'Arial'
    });

    // Content bullets
    let yPos = 1.5;
    const bulletPoints = slideData.points || [];

    bulletPoints.forEach((point, i) => {
      slide.addText(point, {
        x: 1,
        y: yPos,
        w: 8,
        h: 0.6,
        fontSize: 16,
        color: this.theme.bodyColor,
        fontFace: 'Arial',
        bullet: true
      });
      yPos += 0.8;
    });

    // Footer
    slide.addText(`StylesByShahid | Page ${index + 2}`, {
      x: 0.5,
      y: 7,
      w: 9,
      h: 0.4,
      fontSize: 10,
      color: '#CCCCCC',
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
