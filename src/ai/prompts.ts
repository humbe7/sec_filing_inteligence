import { FilingSectionOutput, TextualChangeOutput } from '../actor/output.js';

const MAX_SECTION_CHARS = 12000;

function clip(text: string): string {
  return text.slice(0, MAX_SECTION_CHARS);
}

function sectionText(section?: FilingSectionOutput): string {
  return section ? clip(section.text) : 'Not available.';
}

function changeText(changes: TextualChangeOutput[], section: string): string {
  const change = changes.find(item => item.section === section);
  return change ? JSON.stringify(change) : 'No deterministic comparison is available.';
}

export function riskPrompt(
  current: FilingSectionOutput | undefined,
  previous: FilingSectionOutput | undefined,
  changes: TextualChangeOutput[],
): string {
  return `Analyze changes in SEC filing risk factors. Identify only risks supported by the supplied text.\n\nCurrent risk factors:\n${sectionText(current)}\n\nPrevious risk factors:\n${sectionText(previous)}\n\nDeterministic change summary:\n${changeText(changes, 'risk_factors')}\n\nReturn JSON with exactly: overallRiskTrend (increased|decreased|unchanged|unclear), newRisks (string[]), removedRisks (string[]), summary (string), evidence ({statement,section}[]).`;
}

export function tonePrompt(
  current: FilingSectionOutput | undefined,
  previous: FilingSectionOutput | undefined,
  changes: TextualChangeOutput[],
): string {
  return `Assess management tone in SEC filing MD&A text. Treat this as language analysis, not a forecast.\n\nCurrent MD&A:\n${sectionText(current)}\n\nPrevious MD&A:\n${sectionText(previous)}\n\nDeterministic change summary:\n${changeText(changes, 'management_discussion')}\n\nReturn JSON with exactly: currentTone (positive|neutral|cautious|negative|mixed), previousTone (optional: positive|neutral|cautious|negative|mixed), change (more_positive|more_cautious|more_negative|unchanged|unclear), summary (string), evidence ({statement,section}[]).`;
}

export function guidancePrompt(
  current: FilingSectionOutput | undefined,
  previous: FilingSectionOutput | undefined,
  changes: TextualChangeOutput[],
): string {
  return `Find management guidance or outlook statements in SEC filing MD&A text. Do not infer guidance from historical results.\n\nCurrent MD&A:\n${sectionText(current)}\n\nPrevious MD&A:\n${sectionText(previous)}\n\nDeterministic change summary:\n${changeText(changes, 'management_discussion')}\n\nReturn JSON with exactly: outlook (raised|lowered|maintained|introduced|withdrawn|none|unclear), guidance (string[]), changes (string[]), summary (string), evidence ({statement,section}[]).`;
}

export function legalPrompt(
  current: FilingSectionOutput | undefined,
  previous: FilingSectionOutput | undefined,
  changes: TextualChangeOutput[],
): string {
  return `Identify material legal or regulatory developments disclosed in SEC filing legal proceedings text. Do not characterize allegations as facts.\n\nCurrent legal proceedings:\n${sectionText(current)}\n\nPrevious legal proceedings:\n${sectionText(previous)}\n\nDeterministic change summary:\n${changeText(changes, 'legal_proceedings')}\n\nReturn JSON with exactly: severity (high|medium|low|none|unclear), developments (string[]), summary (string), evidence ({statement,section}[]).`;
}
