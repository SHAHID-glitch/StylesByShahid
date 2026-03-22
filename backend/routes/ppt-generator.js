/**
 * AI PPT Generation Routes
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const pptExportService = require('../services/pptExportService');
const { authMiddleware } = require('../middleware/auth');
const DatabaseAdapter = require('../models/DatabaseAdapter');

function parseSlideTitles(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(title => (title || '').toString().trim())
    .filter(Boolean);
}

/**
 * POST /api/ppt-generator/generate-outline
 * Generate an outline from a prompt/topic
 */
router.post('/generate-outline', async (req, res) => {
  try {
    const { topic, numSlides = 5, tone = 'Professional' } = req.body;

    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    if (numSlides < 3 || numSlides > 20) {
      return res.status(400).json({ message: 'Number of slides must be between 3 and 20' });
    }

    const outline = await aiService.generateOutline({
      topic,
      numSlides,
      tone
    });

    res.status(200).json({
      message: 'Outline generated successfully',
      outline: {
        title: outline.title || topic,
        tone: outline.tone || tone,
        slideTitles: outline.slideTitles || []
      }
    });
  } catch (error) {
    console.error('Generate outline error:', error);
    res.status(500).json({ message: 'Error generating outline' });
  }
});

/**
 * POST /api/presentations/generate
 * Generate a presentation from a given topic
 */
router.post('/generate', async (req, res) => {
  try {
    const { topic, numSlides = 5, tone = 'Professional', slideTitles = [] } = req.body;

    // Validate input
    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    if (numSlides < 3 || numSlides > 20) {
      return res.status(400).json({ message: 'Number of slides must be between 3 and 20' });
    }

    console.log(`🤖 Generating presentation: "${topic}" (${numSlides} slides, ${tone} tone)`);

    const plan = await aiService.generatePresentationPlan({
      topic,
      numSlides,
      tone,
      slideTitles: parseSlideTitles(slideTitles)
    });

    res.status(200).json({
      message: 'Presentation generated successfully',
      presentation: {
        title: plan.title,
        slides: plan.slides,
        template: plan.theme,
        tone: plan.tone,
        generatedAt: new Date(),
        slideCount: plan.slides.length,
        aiDecidedTheme: true
      }
    });

  } catch (error) {
    console.error('Generate presentation error:', error);
    res.status(500).json({ message: 'Error generating presentation' });
  }
});

/**
 * POST /api/presentations/generate-and-export
 * Generate presentation and export directly to PPT
 */
router.post('/generate-and-export', async (req, res) => {
  try {
    const { topic, numSlides = 5, tone = 'Professional', slideTitles = [] } = req.body;

    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    console.log(`📊 Generating and exporting: "${topic}"`);

    const plan = await aiService.generatePresentationPlan({
      topic,
      numSlides,
      tone,
      slideTitles: parseSlideTitles(slideTitles)
    });

    // Create presentation
    const prs = await pptExportService.createPresentation(plan.title, plan.slides, plan.theme);

    // Export to buffer
    const buffer = await pptExportService.getDownloadBuffer(prs);

    // Send as downloadable file
    const filename = `${plan.title.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Generate and export error:', error);
    res.status(500).json({ message: 'Error generating presentation' });
  }
});

/**
 * POST /api/presentations/export
 * Export existing presentation to PPT
 */
router.post('/export', async (req, res) => {
  try {
    const { title, slides, template = 'default' } = req.body;

    if (!title || !slides || !Array.isArray(slides)) {
      return res.status(400).json({ message: 'Title and slides are required' });
    }

    console.log(`📥 Exporting presentation: "${title}"`);

    // Create presentation
    const prs = await pptExportService.createPresentation(title, slides, template);

    // Export to buffer
    const buffer = await pptExportService.getDownloadBuffer(prs);

    // Send as downloadable file
    const filename = `${title.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Error exporting presentation' });
  }
});

/**
 * POST /api/presentations/save
 * Save a presentation to database
 */
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { title, slides, template = 'default', isPublic = false } = req.body;

    if (!title || !slides) {
      return res.status(400).json({ message: 'Title and slides are required' });
    }

    const presentation = {
      title,
      slides,
      template,
      isPublic,
      ownerId: req.user?.id || 'demo_user',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.status(201).json({
      message: 'Presentation saved successfully',
      presentation: presentation
    });

  } catch (error) {
    console.error('Save presentation error:', error);
    res.status(500).json({ message: 'Error saving presentation' });
  }
});

/**
 * GET /api/presentations
 * Get user's presentations
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'demo_user';

    // Mock data - in real app would query database
    const presentations = [
      {
        _id: '1',
        title: 'AI in Healthcare',
        slides: [],
        createdAt: new Date(),
        slideCount: 5
      }
    ];

    res.status(200).json({
      message: 'Presentations retrieved successfully',
      presentations: presentations
    });

  } catch (error) {
    console.error('Get presentations error:', error);
    res.status(500).json({ message: 'Error retrieving presentations' });
  }
});

/**
 * GET /api/presentations/templates
 * Get available templates
 */
router.get('/templates', (req, res) => {
  const templates = [
    {
      id: 'default',
      name: 'Default',
      description: 'Clean and professional template',
      bgColor: '#FFFFFF',
      titleColor: '#003366',
      accentColor: '#0066CC'
    },
    {
      id: 'corporate',
      name: 'Corporate',
      description: 'Modern corporate template',
      bgColor: '#F5F5F5',
      titleColor: '#1F4E78',
      accentColor: '#4472C4'
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Creative and modern template',
      bgColor: '#FAFAFA',
      titleColor: '#C55A11',
      accentColor: '#F2CC8F'
    }
  ];

  res.status(200).json({
    message: 'Templates retrieved successfully',
    templates: templates
  });
});

module.exports = router;
