// Cloud Function: Generate AI-powered report summary using Gemini
const { chatWithGemini } = require('../services/googleGeminiService');
const cacheService = require('../services/cacheService');

module.exports = async function generateReportSummary(req, res) {
  try {
    const { extractedData, ocrText } = req.body;
    
    if (!extractedData && !ocrText) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Either extractedData or ocrText must be provided' 
      });
    }

    // Check cache first
    const cachedSummary = await cacheService.getCachedAISummary(extractedData, ocrText);
    if (cachedSummary) {
      return res.json({ 
        ok: true, 
        summary: cachedSummary,
        cached: true
      });
    }

    // Prepare the data for Gemini
    const reportData = {
      extracted: extractedData || {},
      ocrText: ocrText || ''
    };

    // Enhanced system prompt for better medical report analysis
    const systemPrompt = `You are an expert medical AI assistant specializing in clinical report analysis. 
    Your task is to analyze medical laboratory reports and generate comprehensive, accurate summaries.
    
    ANALYSIS FRAMEWORK:
    1. **Patient Information**: Extract and verify patient demographics
    2. **Lab Values Analysis**: Identify all lab values, their normal ranges, and clinical significance
    3. **Abnormal Findings**: Highlight any values outside normal ranges with clinical context
    4. **Clinical Correlation**: Connect lab findings to potential clinical conditions
    5. **Risk Assessment**: Identify any critical or concerning values requiring immediate attention
    6. **Recommendations**: Provide evidence-based follow-up recommendations
    
    OUTPUT FORMAT:
    - Use clear, professional medical language
    - Include specific lab values with units and reference ranges
    - Highlight critical findings prominently
    - Provide clinical context for abnormal values
    - Include appropriate medical disclaimers
    - Structure information for both patients and healthcare providers
    
    IMPORTANT: Always include disclaimers that this analysis is not a substitute for professional medical advice and consultation.`;

    // Enhanced user prompt with better structure
    const userPrompt = `Please analyze this medical laboratory report and provide a comprehensive clinical summary:

**EXTRACTED STRUCTURED DATA:**
${JSON.stringify(reportData.extracted, null, 2)}

**RAW OCR TEXT (for additional context):**
${reportData.ocrText.slice(0, 3000)}...

**ANALYSIS REQUIREMENTS:**
Please provide a detailed analysis including:

1. **REPORT OVERVIEW**
   - Patient information and demographics
   - Report date and type
   - Overall assessment of data quality

2. **LABORATORY FINDINGS**
   - Complete list of all lab values with units
   - Reference ranges for each test
   - Normal vs. abnormal classification
   - Clinical significance of each finding

3. **ABNORMAL FINDINGS ANALYSIS**
   - Detailed analysis of any abnormal values
   - Potential clinical implications
   - Severity assessment (mild, moderate, severe)
   - Possible underlying conditions

4. **CRITICAL VALUES ALERT**
   - Any values requiring immediate medical attention
   - Emergency-level abnormalities
   - Urgent follow-up recommendations

5. **CLINICAL ASSESSMENT**
   - Overall health status based on lab findings
   - Risk factors identified
   - Potential disease patterns

6. **HEALTH PROBLEMS IDENTIFIED**
   - Specific health issues found in the report
   - Detailed explanation of each problem
   - Severity level of each issue
   - How these problems affect overall health

7. **IMPROVEMENT RECOMMENDATIONS**
   - Specific steps to improve health condition
   - Lifestyle changes needed (diet, exercise, habits)
   - Medical treatments or medications to consider
   - Preventive measures to avoid worsening
   - Timeline for implementing changes

8. **ACTION PLAN**
   - Priority actions to take immediately
   - Short-term goals (1-3 months)
   - Long-term health goals (6-12 months)
   - When to see a healthcare provider
   - How to monitor progress

9. **MEDICAL DISCLAIMER**
   - Clear statement that this is not medical advice
   - Recommendation to consult healthcare provider
   - Emergency contact information if critical values present

FORMAT THE OUTPUT STRICTLY AS PLAIN TEXT (NO MARKDOWN). USE EXACTLY THIS TEMPLATE WITH UPPERCASE SECTION TITLES AND HYPHEN BULLETS:

TWO-LINE SUMMARY
<one concise sentence summarizing overall health status from this report>
<one concise sentence stating the most important action or next step>

HERE IS A SUMMARY OF THE PATHOLOGY REPORT, A LIST OF THE MAIN HEALTH ISSUES IDENTIFIED, AND WHAT CAN BE DONE TO ADDRESS THEM BASED ON THE LABORATORY FINDINGS AND MEDICAL COMMENTARY.

SUMMARY OF CLINICAL FINDINGS
- <bullet 1>
- <bullet 2>
- <more bullets as needed>

IDENTIFIED PROBLEMS
- <problem 1 in brief>
- <problem 2 in brief>
- <more bullets>

HOW TO FIX / RECOMMENDATIONS
- <actionable recommendation for problem 1>
- <recommendation for problem 2>
- <lifestyle/monitoring/follow-up bullets>

FOLLOW-UP
- <concise follow-up plan and monitoring cadence>

SOURCE
- If a source document was provided via OCR, include a single line: Reference: (paste a concise URL if present), otherwise omit this section.

IMPORTANT: Do not use any markdown symbols like #, **, or tables. Use only plain text, section titles in uppercase, and hyphen bullets. Keep sentences concise and patient-friendly.`;

    const messages = [
      { role: 'user', content: userPrompt + "\n\nFORMAT RULE: Return plain text only. Do NOT use Markdown (no headings, bold, tables, lists formatting, or code fences)." }
    ];

    const result = await chatWithGemini(messages, { 
      systemPrompt,
      temperature: 0.3,
      maxOutputTokens: 2048
    });

    if (result.error) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to generate summary: ' + result.error 
      });
    }

    // Ensure plain text (strip common Markdown if any slipped through)
    function stripMarkdown(text) {
      if (!text || typeof text !== 'string') return '';
      let t = text;
      // Remove code fences and inline backticks
      t = t.replace(/```[\s\S]*?```/g, '');
      t = t.replace(/`([^`]+)`/g, '$1');
      // Convert links [text](url) -> text (url)
      t = t.replace(/\!\[([^\]]*)\]\(([^\)]+)\)/g, '$1');
      t = t.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1 ($2)');
      // Remove headings and emphasis markers
      t = t.replace(/^#{1,6}\s*/gm, '');
      t = t.replace(/[\*\_]{1,3}([^\*_\n]+)[\*\_]{1,3}/g, '$1');
      // Remove table pipes and separators
      t = t.replace(/\|/g, ' ');
      t = t.replace(/^\s*:-{3,}\s*:?$/gm, '');
      // Normalize list bullets (remove markdown bullets, keep simple hyphen)
      t = t.replace(/^\s*[-*+]\s+/gm, '- ');
      t = t.replace(/^\s*\d+\.\s+/gm, '- ');
      // Collapse excessive whitespace
      t = t.replace(/\r/g, '');
      t = t.replace(/[ \t]+$/gm, '');
      t = t.replace(/\n{3,}/g, '\n\n');
      return t.trim();
    }

    const summary = stripMarkdown(result.reply);
    
    // Cache the summary
    await cacheService.setCachedAISummary(extractedData, ocrText, summary);

    res.json({ 
      ok: true, 
      summary: summary,
      generatedAt: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    console.error('Error generating report summary:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
};
