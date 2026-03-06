import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get('file') as File;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // Use OpenAI Whisper API for transcription
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const whisperForm = new FormData();
        whisperForm.append('file', audioFile);
        whisperForm.append('model', 'whisper-1');
        whisperForm.append('language', 'es'); // Spanish
        whisperForm.append('response_format', 'json');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
            },
            body: whisperForm,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Whisper API error:', errorText);
            return NextResponse.json({ error: 'Transcription failed', text: '' }, { status: 500 });
        }

        const result = await response.json();

        return NextResponse.json({
            text: result.text || '',
            duration: result.duration || 0,
        });
    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json({ error: error.message, text: '' }, { status: 500 });
    }
}
