import { describe, expect, it } from 'vitest';
import { LlmClient } from '../src/ai/llmClient.js';
import { analyzeRisks } from '../src/intelligence/analyzers.js';

class StubLlmClient implements LlmClient {
  prompt = '';

  async completeJson(prompt: string): Promise<unknown> {
    this.prompt = prompt;
    return {
      overallRiskTrend: 'increased',
      newRisks: ['Tariff exposure'],
      removedRisks: [],
      summary: 'A new tariff disclosure was added.',
      evidence: [{ statement: 'Tariffs may raise costs.', section: 'risk_factors' }],
    };
  }
}

class UngroundedLlmClient implements LlmClient {
  async completeJson(): Promise<unknown> {
    return {
      overallRiskTrend: 'increased',
      newRisks: ['Invented risk'],
      removedRisks: [],
      summary: 'Unsupported claim.',
      evidence: [{ statement: 'This quote does not exist.', section: 'risk_factors' }],
    };
  }
}

class EmptyEvidenceLlmClient implements LlmClient {
  async completeJson(): Promise<unknown> {
    return {
      overallRiskTrend: 'increased',
      newRisks: ['Invented risk'],
      removedRisks: [],
      summary: 'Unsupported claim.',
      evidence: [],
    };
  }
}

describe('analyzers', () => {
  it('builds a risk prompt from comparable filing sections and validates the result', async () => {
    const client = new StubLlmClient();
    const result = await analyzeRisks(client, {
      current: {
        risk_factors: { title: 'Risk Factors', wordCount: 5, text: 'Tariffs may raise costs.' },
      },
      previous: {
        risk_factors: { title: 'Risk Factors', wordCount: 4, text: 'Supply remained stable.' },
      },
      textualChanges: [],
    });

    expect(client.prompt).toContain('Tariffs may raise costs.');
    expect(result.newRisks).toEqual(['Tariff exposure']);
  });

  it('rejects AI evidence that is not present in the filing section', async () => {
    await expect(analyzeRisks(new UngroundedLlmClient(), {
      current: {
        risk_factors: { title: 'Risk Factors', wordCount: 5, text: 'Tariffs may raise costs.' },
      },
      textualChanges: [],
    })).rejects.toThrow('AI evidence is not a verbatim quote');
  });

  it('rejects material AI conclusions without filing evidence', async () => {
    await expect(analyzeRisks(new EmptyEvidenceLlmClient(), {
      current: {
        risk_factors: { title: 'Risk Factors', wordCount: 5, text: 'Tariffs may raise costs.' },
      },
      textualChanges: [],
    })).rejects.toThrow('Invalid risk analysis response');
  });
});
