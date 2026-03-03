/**
 * AI Service - Generates presentation content using OpenAI
 */

const { OpenAI } = require('openai');

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
    const { topic, numSlides = 5, tone = 'Professional' } = options;

    if (!this.isAvailable) {
      return {
        title: topic,
        tone,
        theme: 'default',
        slides: this.generateDemoPresentation(topic, numSlides, tone)
      };
    }

    try {
      const prompt = this.buildPrompt(topic, numSlides, tone);
      const response = await this.callOpenAI(prompt);
      const parsed = this.parseAIResponse(response);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          title: topic,
          tone,
          theme: 'default',
          slides: parsed
        };
      }

      if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        return {
          title: parsed.title || topic,
          tone: parsed.tone || tone,
          theme: this.normalizeTheme(parsed.theme),
          slides: parsed.slides
        };
      }

      return {
        title: topic,
        tone,
        theme: 'default',
        slides: this.generateDemoPresentation(topic, numSlides, tone)
      };
    } catch (error) {
      console.error('AI Generation error:', error);
      return {
        title: topic,
        tone,
        theme: 'default',
        slides: this.generateDemoPresentation(topic, numSlides, tone)
      };
    }
  }

  buildPrompt(topic, numSlides, tone) {
    return `Generate a complete ${numSlides}-slide presentation plan.

Topic: "${topic}"
Requested tone: "${tone}"

Requirements:
- Return ONLY valid JSON object, no markdown or extra text
- Auto-decide the best theme from: default, corporate, creative
- Each slide must have: "title" (string) and "points" (array of 3-5 bullet points)
- Keep bullet points concise (max 10 words each)
- Make it engaging and informative

Return exactly this JSON format:
{
  "title": "Presentation Title",
  "tone": "Professional",
  "theme": "corporate",
  "slides": [
    {
      "title": "Slide Title",
      "points": ["Point 1", "Point 2", "Point 3", "Point 4"]
    }
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

  /**
   * Generate demo presentation (for testing without API key)
   */
  generateDemoPresentation(topic, numSlides, tone) {
    const slides = [];
    
    // Title slide
    slides.push({
      title: `${topic}`,
      points: ['A Comprehensive Overview', `${new Date().getFullYear()}`, 'Demo Mode', 'StylesByShahid']
    });

    // Content slides
    const contentTemplates = [
      {
        points: [
          'Definition and core concepts',
          'Historical context and evolution',
          'Key terminology',
          'Common misconceptions'
        ]
      },
      {
        points: [
          'Major applications',
          'Real-world examples',
          'Industry impact',
          'Current trends'
        ]
      },
      {
        points: [
          'Advantages and benefits',
          'Increased efficiency',
          'Cost savings',
          'Improved outcomes'
        ]
      },
      {
        points: [
          'Challenges and limitations',
          'Technical obstacles',
          'Ethical considerations',
          'Future improvements needed'
        ]
      }
    ];

    for (let i = 1; i < Math.min(numSlides, contentTemplates.length + 1); i++) {
      slides.push({
        title: `${topic} - Part ${i}`,
        points: contentTemplates[i - 1]?.points || contentTemplates[0].points
      });
    }

    // Conclusion slide
    if (slides.length < numSlides) {
      slides.push({
        title: 'Conclusion',
        points: [
          'Key takeaways',
          'Impact and significance',
          'Future opportunities',
          'Questions?'
        ]
      });
    }

    return slides.slice(0, numSlides);
  }
}

module.exports = new AIService();
