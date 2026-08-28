import type { APIRoute } from 'astro';

export const prerender = false;

function generateOfflineBlessing(toName: string, fromName: string, relation: string, tone: string, customPrompt?: string, lang?: string): string {
  const to = toName || (lang === 'bn' ? 'স্নেহের ভাই/বোন' : 'Promi');
  const from = fromName || (lang === 'bn' ? 'রন্তি' : 'Ranti');
  const contextNote = customPrompt?.trim() || '';

  if (lang === 'bn') {
    if (tone.includes('Vedic') || tone.includes('Ashirwad')) {
      return `স্নেহের ${to},\n\n"येन बद्धो बली राजा दानवेन्द्रो महाबलः। तेन त्वां प्रतिबद्धनामि रक्षे मा चल मा चल॥"\n\nশ্রাবণ পূর্ণিমার এই পরম পবিত্র লগ্নে তোমার সুস্বাস্থ্য, অফুরন্ত শান্তি ও উজ্জ্বল ভবিষ্যতের জন্য প্রার্থনা করি।${contextNote ? ` আমাদের স্মৃতি ও মনের কথা: "${contextNote}"। ` : ''}জীবনের প্রতিটি পদক্ষেপে ভাই হিসেবে আমি সর্বদা তোমার পাশে থাকব।\n\nচিরন্তন স্নেহের সাথে,\n${from}`;
    }
    if (tone.includes('Mischief') || tone.includes('Secret') || tone.includes('Memories')) {
      return `স্নেহের ${to},\n\nশৈশবের মিষ্টি খুনসুটি আর না-বলা সমস্ত হাসির স্মৃতিই আমার জীবনের শ্রেষ্ঠ সম্পদ।${contextNote ? ` বিশেষ করে মনে পড়ে: "${contextNote}"। ` : ''}তোমার মতো বোন পাওয়া সত্যিই পরম ভাগ্যের।\n\nভালোবাসা ও শুভকামনার সাথে,\n${from}`;
    }
    return `স্নেহের ${to},\n\nরাখীবন্ধনের এই শুভলগ্নে তোমার প্রতি আমার এই অটুট প্রতিজ্ঞা: জীবনের সব ঋতুতে আমি তোমার অটল রক্ষাকবচ ও বিশ্বস্ত ভরসা হয়ে থাকব।${contextNote ? ` বিশেষ কথা: "${contextNote}"। ` : ''}আমাদের এই পবিত্র ভাই-বোনের বন্ধন চিরকাল অক্ষুণ্ণ থাকুক।\n\nচিরন্তন ভালোবাসা ও সুরক্ষার সাথে,\n${from}`;
  }

  if (tone.includes('Vedic') || tone.includes('Ashirwad')) {
    return `Dearest ${to},\n\n"येन बद्धो बली राजा दानवेन्द्रो महाबलः। तेन त्वां प्रतिबद्धनामि रक्षे मा चल मा चल॥"\n\nOn this auspicious Shravana Purnima, I pray for your lifelong health, peace of mind, and radiant prosperity.${contextNote ? ` Cherishing our special moments: "${contextNote}". ` : ''}May the sacred thread of Raksha Bandhan forever guard you from all adversities.\n\nAlways by your side,\n${from}`;
  }
  if (tone.includes('Mischief') || tone.includes('Secret') || tone.includes('Memories')) {
    return `Dear ${to},\n\nFrom our endless childhood laughter to our silly late-night secrets, no one understands me like you do.${contextNote ? ` Especially remembering: "${contextNote}". ` : ''}You will always have my unconditional love, loyalty, and lifelong support.\n\nWith fondest memories,\n${from}`;
  }
  return `Dearest ${to},\n\nOn this sacred festival of Raksha Bandhan, I reaffirm my lifelong promise to stand as your steadfast shield and faithful companion.${contextNote ? ` Reflecting on our heartfelt thought: "${contextNote}". ` : ''}May our sacred bond continue to grow deeper and more luminous with each passing day.\n\nWith all my love and protection,\n${from}`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  let body: {
    toName?: string;
    fromName?: string;
    relation?: string;
    tone?: string;
    customPrompt?: string;
    lang?: string;
  } = {};

  try {
    body = (await request.json().catch(() => ({}))) || {};
    const { toName, fromName, relation, tone, customPrompt, lang } = body;
    const isBengali = lang === 'bn';

    const env = (locals as { runtime?: { env?: Record<string, string> } })?.runtime?.env || {};
    const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process;
    const apiKey = env.GEMINI_API_KEY || globalProcess?.env?.GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = generateOfflineBlessing(toName || '', fromName || '', relation || '', tone || '', customPrompt, lang);
      return new Response(JSON.stringify({ message: fallback }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a reverent Vedic and Indian cultural writer crafting an authentic, elegant, and heartfelt Raksha Bandhan wish and blessing.
Recipient Name: ${toName || (isBengali ? 'ভাই/বোন' : 'Sibling')}
Sender Name: ${fromName || (isBengali ? 'রন্তি' : 'Sibling')}
Relationship: ${relation || 'Sibling Bond'}
Theme/Tone: ${tone || 'Traditional Vedic Blessing & Warm Affection'}
${customPrompt ? `Specific Memory, Context or Raw Notes provided by the user to incorporate and refine: "${customPrompt}"` : ''}
Language: ${isBengali ? 'Write the message entirely in natural, respectful, emotionally touching Bengali (বাংলা).' : 'Write the message in elegant, heartfelt English.'}

Guidelines:
1. Do NOT use any emojis whatsoever in the response.
2. Incorporate the user's provided memory/notes seamlessly into the blessing.
3. Incorporate the spirit of Raksha Bandhan, sacred protection (Raksha), mutual respect, and lifelong support.
4. Keep the message warm, elegant, concise (2 to 4 sentences or a short blessing note), and dignified.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
      }
    );

    if (!response.ok) {
      const fallback = generateOfflineBlessing(toName || '', fromName || '', relation || '', tone || '', customPrompt, lang);
      return new Response(JSON.stringify({ message: fallback }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    generatedText = generatedText.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

    if (!generatedText) {
      generatedText = generateOfflineBlessing(toName || '', fromName || '', relation || '', tone || '', customPrompt, lang);
    }

    return new Response(
      JSON.stringify({ message: generatedText }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    const fallback = generateOfflineBlessing(body.toName || '', body.fromName || '', body.relation || '', body.tone || '', body.customPrompt, body.lang);
    return new Response(
      JSON.stringify({ message: fallback }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
