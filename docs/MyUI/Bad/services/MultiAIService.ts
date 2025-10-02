/**
 * MultiAI Service - Parallel AI Model Querying
 * Handles simultaneous requests to multiple AI providers
 */

import { 
  AIModel, 
  AIModelResponse, 
  PromptQuery, 
  ProjectContext, 
  SynthesisRequest 
} from '../types/myui.types';
import { breadcrumb } from '../../../src/lib/breadcrumbs';

export class MultiAIService {
  private models: AIModel[] = [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      cost: 'cheap',
      enabled: true
    },
    {
      id: 'claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      apiEndpoint: 'https://api.anthropic.com/v1/messages',
      cost: 'premium',
      enabled: true
    },
    {
      id: 'grok-beta',
      name: 'Grok Beta',
      provider: 'xai',
      apiEndpoint: 'https://api.x.ai/v1/chat/completions',
      cost: 'medium',
      enabled: true
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      cost: 'medium',
      enabled: true
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'google',
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      cost: 'medium',
      enabled: true
    },
    {
      id: 'mistral-large',
      name: 'Mistral Large',
      provider: 'mistral',
      apiEndpoint: 'https://api.mistral.ai/v1/chat/completions',
      cost: 'premium',
      enabled: true
    }
  ];

  private apiKeys: Record<string, string> = {};

  constructor() {
    breadcrumb(7001, 'MultiAIService initialized');
    this.loadApiKeys();
  }

  private async loadApiKeys(): Promise<void> {
    breadcrumb(7002, 'Loading API keys');
    // Load API keys from secure storage or environment
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        this.apiKeys = await window.electronAPI.getSecureConfig('myui-api-keys') || {};
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    }
  }

  public async saveApiKeys(keys: Record<string, string>): Promise<void> {
    breadcrumb(7003, 'Saving API keys');
    this.apiKeys = { ...this.apiKeys, ...keys };
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.setSecureConfig('myui-api-keys', this.apiKeys);
    }
  }

  public getAvailableModels(): AIModel[] {
    return this.models.filter(model => model.enabled);
  }

  public async queryModel(
    model: AIModel, 
    prompt: string, 
    context?: string
  ): Promise<AIModelResponse> {
    const startTime = performance.now();
    breadcrumb(7010 + parseInt(model.id.slice(-1)), `Querying ${model.name}`);

    try {
      const apiKey = this.apiKeys[model.provider];
      if (!apiKey) {
        throw new Error(`API key not found for ${model.provider}`);
      }

      const response = await this.makeAPIRequest(model, prompt, context, apiKey);
      const endTime = performance.now();

      return {
        modelId: model.id,
        modelName: model.name,
        response,
        timestamp: Date.now(),
        latency: endTime - startTime
      };
    } catch (error) {
      const endTime = performance.now();
      breadcrumb(7050, `Error querying ${model.name}: ${error.message}`);
      
      return {
        modelId: model.id,
        modelName: model.name,
        response: '',
        error: error.message,
        timestamp: Date.now(),
        latency: endTime - startTime
      };
    }
  }

  private async makeAPIRequest(
    model: AIModel,
    prompt: string,
    context?: string,
    apiKey: string
  ): Promise<string> {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

    switch (model.provider) {
      case 'anthropic':
        return this.queryAnthropic(model, fullPrompt, apiKey);
      case 'openai':
      case 'deepseek':
      case 'xai':
      case 'mistral':
        return this.queryOpenAICompatible(model, fullPrompt, apiKey);
      case 'google':
        return this.queryGoogle(model, fullPrompt, apiKey);
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  private async queryOpenAICompatible(
    model: AIModel,
    prompt: string,
    apiKey: string
  ): Promise<string> {
    const response = await fetch(model.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: 'system', content: 'You are a helpful AI coding assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated';
  }

  private async queryAnthropic(
    model: AIModel,
    prompt: string,
    apiKey: string
  ): Promise<string> {
    const response = await fetch(model.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model.id,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || 'No response generated';
  }

  private async queryGoogle(
    model: AIModel,
    prompt: string,
    apiKey: string
  ): Promise<string> {
    const response = await fetch(`${model.apiEndpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'No response generated';
  }

  public async queryMultipleModels(
    prompt: string,
    context?: string,
    modelCount: number = 4
  ): Promise<PromptQuery> {
    breadcrumb(7060, `Starting parallel query to ${modelCount} models`);
    
    const selectedModels = this.getAvailableModels().slice(0, modelCount);
    const queryId = `query_${Date.now()}`;

    try {
      const promises = selectedModels.map(model => 
        this.queryModel(model, prompt, context)
      );

      const responses = await Promise.allSettled(promises);
      const processedResponses: AIModelResponse[] = responses.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            modelId: selectedModels[index].id,
            modelName: selectedModels[index].name,
            response: '',
            error: result.reason?.message || 'Query failed',
            timestamp: Date.now(),
            latency: 0
          };
        }
      });

      breadcrumb(7061, `Parallel query completed for ${queryId}`);

      return {
        id: queryId,
        prompt,
        context,
        timestamp: Date.now(),
        responses: processedResponses
      };
    } catch (error) {
      breadcrumb(7062, `Parallel query failed: ${error.message}`);
      throw error;
    }
  }

  public async synthesizeResponses(
    synthesisRequest: SynthesisRequest
  ): Promise<string> {
    breadcrumb(7070, 'Starting response synthesis');

    const synthesisModel = this.models.find(m => m.id === synthesisRequest.synthesisModel);
    if (!synthesisModel) {
      throw new Error(`Synthesis model not found: ${synthesisRequest.synthesisModel}`);
    }

    const responsesText = synthesisRequest.responses
      .map((resp, index) => 
        `## Model ${index + 1}: ${resp.modelName}\n${resp.error ? `ERROR: ${resp.error}` : resp.response}`
      )
      .join('\n\n---\n\n');

    const synthesisPrompt = `
Original Prompt: "${synthesisRequest.prompt}"

Here are responses from multiple AI models. Please analyze and synthesize them:

${responsesText}

Please provide:
1. **Best Ideas**: Highlight the most valuable insights across all responses
2. **Consensus Points**: What do most models agree on?
3. **Unique Insights**: What unique perspectives does each model offer?
4. **Pros & Cons**: Evaluate the strengths and weaknesses of different approaches
5. **Final Recommendation**: Your synthesized conclusion

Focus on actionable insights and technical accuracy.
`;

    try {
      const synthesisResult = await this.queryModel(
        synthesisModel, 
        synthesisPrompt, 
        synthesisRequest.context
      );

      breadcrumb(7071, 'Response synthesis completed');
      return synthesisResult.response;
    } catch (error) {
      breadcrumb(7072, `Synthesis failed: ${error.message}`);
      throw error;
    }
  }
}