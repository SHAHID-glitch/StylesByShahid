/**
 * AI Service - Generates presentation content using OpenAI
 */

const { OpenAI } = require('openai');

class AIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.isAvailable = true;
    } else {
      console.log('⚠️  OpenAI API key not found - using demo mode');
      this.isAvailable = false;
    }
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
    const { topic, numSlides = 5, tone = 'Professional' } = options;

    if (!this.isAvailable) {
      return this.generateDemoPresentation(topic, numSlides, tone);
    }

    try {
      const prompt = this.buildPrompt(topic, numSlides, tone);
      const response = await this.callOpenAI(prompt);
      const slides = this.parseAIResponse(response);
      
      return slides.length > 0 ? slides : this.generateDemoPresentation(topic, numSlides, tone);
    } catch (error) {
      console.error('AI Generation error:', error);
      return this.generateDemoPresentation(topic, numSlides, tone);
    }
  }

  buildPrompt(topic, numSlides, tone) {
    return `Generate a ${numSlides}-slide presentation on the topic: "${topic}"

Requirements:
- Tone: ${tone}
- Return ONLY valid JSON array, no markdown or extra text
- Each slide must have: "title" (string) and "points" (array of 3-4 bullet points)
- Keep bullet points concise (max 10 words each)
- Make it engaging and informative

Return exactly this JSON format:
[
  {
    "title": "Slide Title",
    "points": ["Point 1", "Point 2", "Point 3", "Point 4"]
  }
]`;
  }

  async callOpenAI(prompt) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional presentation writer. Always return valid JSON and nothing else.'
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
      // Extract JSON from the response
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
