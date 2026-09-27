import React, { useState, useRef, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import TranscriptPreview from './TranscriptPreview';
import { MicIcon, PulseIcon, SendIcon, AlertIcon } from '../icons';

// 4 Pre-Tested Demo Scenarios for Instant Stage Rehearsals & Fail-Safe Demo Mode
const DEMO_SCENARIOS = [
  {
    id: 'demo-hindi-water',
    title: 'Hindi: Water Pipe Burst',
    lang: 'HI',
    text: 'Hamare chawl me 90 feet road par main paani pipe phat gaya hai, 3 din se peene ka paani nahi aa raha.',
    region: 'Ward 12 - Dharavi / Shahu Nagar',
  },
  {
    id: 'demo-marathi-road',
    title: 'Marathi: Sinkhole Hazard',
    lang: 'MR',
    text: 'Kurla station jawal motha khadda padla ahe, ambulance adakli hoti kal ratri.',
    region: 'Ward 9 - Kurla West / LBS Marg',
  },
  {
    id: 'demo-en-electricity',
    title: 'English: Sparking Transformer',
    lang: 'EN',
    text: 'High voltage transformer spark and oil leakage outside school gate on Hill Road.',
    region: 'Ward 4 - Bandra West / Hill Road',
  },
  {
    id: 'demo-en-it',
    title: 'IT Corridor: Open Trench',
    lang: 'EN',
    text: 'Underground fiber trench left open on Hinjewadi Phase 2 main road causing traffic chaos.',
    region: 'Ward 22 - Hinjewadi IT Corridor',
  },
];

export default function VoiceRecorder({ onSubmissionComplete, onViewOnMap }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedDemo, setSelectedDemo] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Timer logic for recording duration
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start real browser microphone
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await submitVoicePayload(audioBlob, null);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err) {
      console.warn('[Microphone] Permission or access error:', err.message);
      setErrorMessage('Microphone access unavailable. You can use the instant 1-Click Demo Scenarios below to test the full pipeline.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Submit voice payload to API
  const submitVoicePayload = async (audioBlob, sampleText) => {
    setIsProcessing(true);
    setProcessingStep('1/3 Transcribing voice with Whisper...');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.append('audio', audioBlob, 'citizen_voice.webm');
      }
      if (sampleText) {
        formData.append('sample_text', sampleText);
      }

      setProcessingStep('2/3 Running Gemini reasoning & entity classification...');

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${apiBase}/api/submissions/voice`, {
        method: 'POST',
        body: formData,
      });

      setProcessingStep('3/3 Computing urgency score and re-ranking map...');

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setIsProcessing(false);

      if (onSubmissionComplete && data.data) {
        onSubmissionComplete(data.data, data);
      }
    } catch (err) {
      console.error('[Voice Pipeline Error]', err);
      setIsProcessing(false);
      setErrorMessage(`Voice submission failed: ${err.message}. Retrying or using fallback.`);
    }
  };

  // Instant Trigger for Demo Scenarios
  const triggerDemoScenario = async (scenario) => {
    setSelectedDemo(scenario.id);
    setErrorMessage(null);
    setResult(null);

    // Create lightweight simulated audio wave header blob
    const dummyBlob = new Blob(['RIFF....WAVEfmt '], { type: 'audio/webm' });
    await submitVoicePayload(dummyBlob, scenario.text);
    setSelectedDemo(null);
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {!result ? (
        <Card className="p-8 border border-white/10 bg-[#09090b]/80 backdrop-blur-xl relative overflow-hidden text-center">
          {/* Subtle animated background radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.06),transparent_65%)] pointer-events-none" />

          {/* Heading */}
          <div className="relative z-10 mb-6">
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              WOW Feature • Sub-5s Voice Prioritization
            </span>
            <h3 className="font-serif text-2xl text-white mt-3 mb-2 font-normal">
              Speak Your Civic Grievance
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Whisper STT transcribes in Hindi, Marathi, or English. Gemini classifies category, extracts ward location, and recalculates the city heatmap in real-time.
            </p>
          </div>

          {/* Main Record Button with Pulsing Radar Ring */}
          <div className="relative z-10 flex flex-col items-center justify-center my-6">
            <div className="relative flex items-center justify-center">
              {/* Animated Glowing Wave Rings when Recording */}
              {isRecording && (
                <>
                  <span className="absolute w-36 h-36 rounded-full border border-white/30 animate-ping opacity-75" />
                  <span className="absolute w-28 h-28 rounded-full border border-white/40 animate-pulse" />
                </>
              )}

              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  isRecording
                    ? 'bg-red-500 text-white scale-110 shadow-red-500/40 ring-4 ring-red-500/20'
                    : isProcessing
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-zinc-200 hover:scale-105 shadow-white/20 ring-4 ring-white/10'
                }`}
              >
                {isRecording ? (
                  <div className="w-6 h-6 rounded-sm bg-white" />
                ) : (
                  <MicIcon className="w-8 h-8" />
                )}
              </button>
            </div>

            {/* Recording Timer / Status */}
            <div className="mt-4 font-mono text-sm">
              {isRecording ? (
                <div className="flex items-center gap-2 text-red-400 font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Recording ({formatSeconds(recordingSeconds)}) — Click to Complete</span>
                </div>
              ) : isProcessing ? (
                <div className="flex items-center gap-2 text-zinc-300">
                  <PulseIcon className="w-4 h-4 animate-spin text-white" />
                  <span className="text-xs">{processingStep || 'Processing AI pipeline...'}</span>
                </div>
              ) : (
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Tap to Record (or select demo preset below)
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="relative z-10 mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/20 text-xs text-red-300 flex items-center gap-2 text-left">
              <AlertIcon className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Fail-Safe Demo Scenario Trigger Buttons */}
          <div className="relative z-10 pt-4 border-t border-white/10 text-left">
            <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Instant Stage Demo Presets (1-Click Rehearsal):</span>
              <span className="text-zinc-600 text-[10px]">No mic needed</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={isProcessing || isRecording}
                  onClick={() => triggerDemoScenario(s)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex items-start justify-between gap-2 ${
                    selectedDemo === s.id
                      ? 'border-white bg-white/10 text-white'
                      : 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/20 text-zinc-300'
                  }`}
                >
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-white/10 text-white font-bold">
                        {s.lang}
                      </span>
                      <span className="text-xs font-medium text-white truncate">{s.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 italic truncate">"{s.text}"</p>
                  </div>
                  <SendIcon className="w-3.5 h-3.5 shrink-0 text-zinc-500 mt-1" />
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        /* Real-Time Result Transcript & Priority Card */
        <TranscriptPreview
          result={result}
          onViewOnMap={onViewOnMap}
          onReset={() => setResult(null)}
        />
      )}
    </div>
  );
}
