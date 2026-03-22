/**
 * AI Service - Generates presentation content using OpenAI
 */

const path = require('path');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');

// Support both backend/.env and project-root .env.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

class AIService {
  constructor() {
    const groqApiKey = process.env.GROQ_API_KEY;
    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (groqApiKey) {
      this.client = new OpenAI({
        apiKey: groqApiKey,
        baseURL: 'https://api.groq.com/openai/v1'
      });
      this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      this.provider = 'groq';
      this.isAvailable = true;
      return;
    }

    if (openAiApiKey) {
      this.client = new OpenAI({ apiKey: openAiApiKey });
      this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      this.provider = 'openai';
      this.isAvailable = true;
      return;
    }

    console.log('⚠️  No GROQ_API_KEY or OPENAI_API_KEY found - using demo mode');
    this.isAvailable = false;
  }

  /**
   * Generate presentation content using AI
   * @param {Object} options - Generation options
   * @param {string} options.topic - Presentation topic
   * @param {number} options.numSlides - Number of slides to generate
   * @param {string} options.tone - Tone (Professional, Creative, Academic, etc)
   * @returns {Array} Array of slide objects
   */
  async generatePresentation(options) {
    const plan = await this.generatePresentationPlan(options);
    return plan.slides;
  }

  async generatePresentationPlan(options) {
    const { topic, numSlides = 5, tone = 'Professional', slideTitles = [] } = options;
    const sanitizedSlideTitles = this.sanitizeSlideTitles(slideTitles, numSlides);

    if (!this.isAvailable) {
      return {
        title: topic,
        tone,
        theme: 'default',
        slides: this.generateDemoPresentation(topic, numSlides, tone, sanitizedSlideTitles)
      };
    }

    try {
      const prompt = this.buildPrompt(topic, numSlides, tone, sanitizedSlideTitles);
      const response = await this.callOpenAI(prompt);
      const parsed = this.parseAIResponse(response);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalizedSlides = this.enforceOutlineOnSlides(parsed, sanitizedSlideTitles, topic);
        return {
          title: topic,
          tone,
          theme: 'default',
          slides: normalizedSlides
        };
      }

      if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        const normalizedSlides = this.enforceOutlineOnSlides(parsed.slides, sanitizedSlideTitles, topic);
        return {
          title: parsed.title || topic,
          tone: parsed.tone || tone,
          theme: this.normalizeTheme(parsed.theme),
          slides: normalizedSlides
        };
      }

      return {
        title: topic,
        tone,
        theme: 'default',
        slides: this.generateDemoPresentation(topic, numSlides, tone, sanitizedSlideTitles)
      };
    } catch (error) {
      console.error('AI Generation error:', error);
      return {
        title: topic,
        tone,
        theme: 'default',
        slides: this.generateDemoPresentation(topic, numSlides, tone, sanitizedSlideTitles)
      };
    }
  }

  async generateOutline(options) {
    const { topic, numSlides = 5, tone = 'Professional' } = options;

    if (!this.isAvailable) {
      return {
        title: topic,
        tone,
        slideTitles: this.generateDemoOutline(topic, numSlides)
      };
    }

    try {
      const prompt = this.buildOutlinePrompt(topic, numSlides, tone);
      const response = await this.callOpenAI(prompt);
      const parsed = this.parseAIResponse(response);

      if (parsed && Array.isArray(parsed.slideTitles) && parsed.slideTitles.length > 0) {
        return {
          title: parsed.title || topic,
          tone: parsed.tone || tone,
          slideTitles: this.sanitizeSlideTitles(parsed.slideTitles, numSlides)
        };
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          title: topic,
          tone,
          slideTitles: this.sanitizeSlideTitles(parsed, numSlides)
        };
      }

      return {
        title: topic,
        tone,
        slideTitles: this.generateDemoOutline(topic, numSlides)
      };
    } catch (error) {
      console.error('AI Outline generation error:', error);
      return {
        title: topic,
        tone,
        slideTitles: this.generateDemoOutline(topic, numSlides)
      };
    }
  }

  buildPrompt(topic, numSlides, tone, slideTitles = []) {
    const hasUserOutline = Array.isArray(slideTitles) && slideTitles.length > 0;
    const outlineInstruction = hasUserOutline
      ? `\nUser-provided slide titles (must use these exact titles in the same order):\n${slideTitles.map((title, index) => `${index + 1}. ${title}`).join('\n')}\n`
      : '';

    return `Generate a comprehensive ${numSlides}-slide presentation plan with detailed content.

Topic: "${topic}"
Requested tone: "${tone}"
${outlineInstruction}

Requirements:
- Return ONLY valid JSON object, no markdown or extra text
- Auto-decide the best theme from: default, corporate, creative
- Every slide's content must be relevant to the main topic and prompt context
- If user-provided titles exist, each slide must explain that title in relation to the topic
- Each slide MUST include:
  * "title": Main slide heading (max 8 words)
  * "subtitle": Supporting headline (optional, max 12 words)
  * "description": 2-3 sentences of detailed explanation (40-80 words)
  * "keyPoints": Array of 3-4 concise bullet points (5-8 words each)
  * "imageSuggestion": Description of what image would fit (e.g., "diagram", "chart", "photo of team", "infographic")
- Make content informative, well-explained, and professional
- Ensure proper flow between slides

Return exactly this JSON format:
{
  "title": "Complete Presentation Title",
  "tone": "Professional",
  "theme": "corporate",
  "slides": [
    {
      "title": "Main Heading",
      "subtitle": "Supporting Headline",
      "description": "Detailed explanation paragraph that provides context and valuable information to the audience. This should be 2-3 complete sentences.",
      "keyPoints": ["First key point", "Second key point", "Third key point"],
      "imageSuggestion": "diagram showing process flow"
    }
  ]
}`;
  }

  buildOutlinePrompt(topic, numSlides, tone) {
    return `Create a concise presentation outline with exactly ${numSlides} slide titles.

Topic: "${topic}"
Requested tone: "${tone}"

Requirements:
- Return ONLY valid JSON object, no markdown or extra text
- The outline must have a logical start-to-finish flow
- Each title should be clear, specific, and max 10 words
- Include one intro and one conclusion slide

Return exactly this JSON format:
{
  "title": "Presentation Title",
  "tone": "Professional",
  "slideTitles": [
    "Slide 1 title",
    "Slide 2 title"
  ]
}`;
  }

  async callOpenAI(prompt) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional presentation designer and writer. Always return valid JSON and nothing else.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2048
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  parseAIResponse(response) {
    try {
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }

  normalizeTheme(theme) {
    const safeTheme = (theme || '').toString().toLowerCase();
    if (safeTheme === 'corporate' || safeTheme === 'creative' || safeTheme === 'default') {
      return safeTheme;
    }
    return 'default';
  }

  sanitizeSlideTitles(slideTitles, numSlides) {
    if (!Array.isArray(slideTitles)) {
      return [];
    }

    const normalizedTitles = slideTitles
      .map(title => (title || '').toString().trim())
      .filter(Boolean)
      .slice(0, numSlides);

    return normalizedTitles;
  }

  enforceOutlineOnSlides(slides, slideTitles, topic) {
    if (!Array.isArray(slides) || slides.length === 0) {
      return [];
    }

    if (!Array.isArray(slideTitles) || slideTitles.length === 0) {
      return slides;
    }

    return slideTitles.map((fixedTitle, index) => {
      const existing = slides[index] || {};
      const fallbackDescription = `This slide explains ${fixedTitle} in the context of ${topic}. It highlights practical meaning, current relevance, and how this section connects to the overall presentation narrative.`;

      return {
        title: fixedTitle,
        subtitle: existing.subtitle || '',
        description: existing.description || fallbackDescription,
        keyPoints: Array.isArray(existing.keyPoints) && existing.keyPoints.length > 0
          ? existing.keyPoints
          : [
              `${fixedTitle} overview`,
              `Relation to ${topic}`,
              'Key insight and impact'
            ],
        imageSuggestion: existing.imageSuggestion || 'relevant diagram or visual'
      };
    });
  }

  generateDemoOutline(topic, numSlides) {
    const demoTitles = [
      `Introduction to ${topic}`,
      `${topic}: Current Landscape`,
      `Core Concepts of ${topic}`,
      `${topic} Use Cases`,
      `Benefits and Opportunities`,
      `Challenges and Risks`,
      `Implementation Strategy`,
      `Future of ${topic}`,
      `Key Takeaways`,
      `Conclusion and Next Steps`
    ];

    return demoTitles.slice(0, numSlides);
  }

  /**
   * Generate demo presentation (for testing without API key)
   */
  generateDemoPresentation(topic, numSlides, tone, slideTitles = []) {
    const slides = [];

    // Content slide templates with detailed information
    const contentTemplates = [
      {
        title: 'Introduction',
        subtitle: 'Understanding the Fundamentals',
        description: 'This section provides a comprehensive overview of the key concepts and foundational elements. We will explore the background, context, and importance of this topic in today\'s landscape.',
        keyPoints: ['Core concepts overview', 'Historical context', 'Current relevance'],
        imageSuggestion: 'conceptual diagram or introduction visual'
      },
      {
        title: 'Key Components',
        subtitle: 'Essential Elements and Features',
        description: 'Understanding the main components is crucial for grasping the full picture. These elements work together to create a cohesive framework that drives success and innovation.',
        keyPoints: ['Primary features', 'Core functionalities', 'Integration aspects'],
        imageSuggestion: 'infographic showing components'
      },
      {
        title: 'Applications',
        subtitle: 'Real-World Use Cases',
        description: 'Practical applications demonstrate the versatility and impact across various industries. From healthcare to finance, these implementations show tangible benefits and transformative potential.',
        keyPoints: ['Industry applications', 'Success stories', 'Implementation examples'],
        imageSuggestion: 'collage of industry applications'
      },
      {
        title: 'Benefits',
        subtitle: 'Value and Impact',
        description: 'The advantages extend beyond immediate gains, offering long-term strategic value. Organizations experience improved efficiency, cost savings, and enhanced outcomes through proper implementation.',
        keyPoints: ['Increased efficiency', 'Cost reduction', 'Better outcomes'],
        imageSuggestion: 'chart showing growth or improvement'
      },
      {
        title: 'Challenges',
        subtitle: 'Overcoming Obstacles',
        description: 'While the potential is significant, implementation comes with challenges that require careful consideration. Understanding these obstacles helps in developing effective mitigation strategies.',
        keyPoints: ['Common roadblocks', 'Technical hurdles', 'Solution approaches'],
        imageSuggestion: 'problem-solution visual'
      },
      {
        title: 'Future Outlook',
        subtitle: 'Trends and Opportunities',
        description: 'The landscape continues to evolve with emerging technologies and innovative approaches. Staying ahead requires awareness of upcoming trends and strategic positioning for future opportunities.',
        keyPoints: ['Emerging trends', 'Growth opportunities', 'Innovation roadmap'],
        imageSuggestion: 'futuristic or trend visualization'
      },
      {
        title: 'Best Practices',
        subtitle: 'Proven Strategies for Success',
        description: 'Learning from successful implementations provides valuable insights for optimization. These proven methodologies ensure smoother deployment and better results across various scenarios.',
        keyPoints: ['Strategic approach', 'Quality standards', 'Performance optimization'],
        imageSuggestion: 'checklist or best practice framework'
      },
      {
        title: 'Conclusion',
        subtitle: 'Key Takeaways and Next Steps',
        description: 'This presentation has covered essential aspects from fundamentals to implementation. Moving forward, focus on applying these insights to achieve measurable results and continuous improvement.',
        keyPoints: ['Summary of key points', 'Action items', 'Recommended next steps'],
        imageSuggestion: 'summary graphic or call-to-action visual'
      }
    ];

    for (let i = 0; i < numSlides; i++) {
      const template = contentTemplates[i % contentTemplates.length];
      const customTitle = slideTitles[i];
      slides.push({
        title: customTitle || template.title,
        subtitle: template.subtitle,
        description: template.description,
        keyPoints: template.keyPoints,
        imageSuggestion: template.imageSuggestion
      });
    }

    return slides;
  }
}

module.exports = new AIService();
