import { useState, useRef, useEffect } from 'react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { api } from '../api/client';
import type { PipelineInfo, Ticket } from '../api/client';

interface VoiceRecorderProps {
  token: string | null;
  onTicketCreated?: (ticket: Ticket, isDuplicate: boolean, pipeline: PipelineInfo) => void;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error' | 'queued';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
declare class SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
declare const webkitSpeechRecognition: typeof SpeechRecognition;

function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof SpeechRecognition !== 'undefined') return SpeechRecognition;
  if (typeof webkitSpeechRecognition !== 'undefined') return webkitSpeechRecognition;
  return null;
}

export function VoiceRecorder({ token, onTicketCreated }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastResult, setLastResult] = useState<{ isDuplicate: boolean; category: string; urgency: number } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [speechSupported] = useState(() => !!getSpeechRecognition());
  const [waveBars, setWaveBars] = useState<number[]>(Array(24).fill(6));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const transcriptRef = useRef<string>('');
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { addToQueue } = useOfflineQueue(token, (synced) => {
    showToast(`✅ ${synced} queued complaint${synced > 1 ? 's' : ''} synced!`);
  });

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  function startAudioAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWave = () => {
        analyser.getByteFrequencyData(dataArray);
        const bars: number[] = [];
        const step = Math.floor(bufferLength / 24) || 1;
        for (let i = 0; i < 24; i++) {
          const val = dataArray[i * step] || 0;
          const height = Math.max(6, Math.min(38, (val / 255) * 40));
          bars.push(height);
        }
        setWaveBars(bars);
        animFrameRef.current = requestAnimationFrame(updateWave);
      };
      updateWave();
    } catch {}
  }

  function stopAudioAnalyser() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    setWaveBars(Array(24).fill(6));
  }

  function startSpeechRecognition() {
    const SR = getSpeechRecognition();
    if (!SR) return;

    try {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN';

      transcriptRef.current = '';
      setLiveTranscript('');

      recognition.onresult = (e: SpeechRecognitionEvent) => {
        let combined = '';
        for (let i = 0; i < e.results.length; i++) {
          combined += e.results[i][0].transcript + ' ';
        }
        const clean = combined.trim();
        if (clean) {
          transcriptRef.current = clean;
          setLiveTranscript(clean);
        }
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            try { recognition.start(); } catch {}
          }
        }, 150);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {}
  }

  function stopSpeechRecognition() {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = handleStop;
      mr.start(250);

      startAudioAnalyser(stream);
      startSpeechRecognition();

      setState('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      setErrorMsg('Microphone access denied. Please allow microphone access.');
      setState('error');
    }
  }

  function stopRecording() {
    stopSpeechRecognition();
    stopAudioAnalyser();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function handleStop() {
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(chunksRef.current, { type: mimeType });
    const finalTranscriptText = transcriptRef.current.trim() || liveTranscript.trim();

    if (audioBlob.size < 1000) {
      setErrorMsg('Recording too short. Please speak clearly.');
      setState('error');
      return;
    }

    if (!navigator.onLine || !token) {
      await addToQueue(audioBlob, mimeType);
      setState('queued');
      setLastResult(null);
      return;
    }

    setState('processing');

    try {
      const formData = new FormData();
      const ext = mimeType.split('/')[1]?.split(';')[0] || 'webm';
      formData.append('audio', audioBlob, `complaint.${ext}`);

      if (finalTranscriptText) {
        formData.append('browserTranscript', finalTranscriptText);
      }

      const { ticket, isDuplicate, pipeline } = await api.submitComplaint(formData);
      setLastResult({ isDuplicate, category: ticket.category, urgency: ticket.urgencyScore });
      setState('done');
      onTicketCreated?.(ticket, isDuplicate, pipeline);
    } catch (err: any) {
      if (!navigator.onLine || err.message?.includes('fetch')) {
        await addToQueue(audioBlob, mimeType);
        setState('queued');
      } else {
        setErrorMsg(err.message || 'Failed to submit complaint');
        setState('error');
      }
    }
  }

  function reset() {
    setState('idle');
    setSeconds(0);
    setErrorMsg('');
    setLastResult(null);
    setLiveTranscript('');
    transcriptRef.current = '';
  }

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isDone = state === 'done';
  const isError = state === 'error';
  const isQueued = state === 'queued';

  return (
    <div className="mac-window" style={{ width: '100%', maxWidth: 540, margin: '0 auto' }}>
      {/* Mac Title Header */}
      <div className="mac-header">
        <div className="mac-dots">
          <div className="mac-dot mac-dot-red" />
          <div className="mac-dot mac-dot-yellow" />
          <div className="mac-dot mac-dot-green" />
        </div>
        <div className="mac-address-bar">
          complainkaro.app/triage
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Mac Window Body */}
      <div className="mac-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              VOICE COMPLAINT RECORDER
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
              Speak Your Complaint
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: isRecording ? '#ef4444' : 'var(--txt-muted)', fontWeight: 700 }}>
            {isRecording ? `🔴 ${formatTime(seconds)}` : isOnline ? '🟢 Mic Ready' : '🔴 Offline'}
          </div>
        </div>

        {/* Dynamic Waveform Visualizer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          height: 48,
          background: 'rgba(6, 8, 19, 0.8)',
          borderRadius: 'var(--r-md)',
          padding: '0 1rem',
          border: '1px solid var(--clr-border)',
        }}>
          {waveBars.map((h, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: h,
                borderRadius: 2,
                background: isRecording
                  ? 'linear-gradient(to top, #6366f1, #38bdf8)'
                  : 'rgba(255, 255, 255, 0.12)',
                transition: 'height 0.08s ease',
              }}
            />
          ))}
        </div>

        {/* Live Voice Tracked Text Box */}
        <div style={{
          background: 'rgba(6, 8, 19, 0.7)',
          border: `1.5px solid ${isRecording ? '#38bdf8' : 'var(--clr-border)'}`,
          borderRadius: 'var(--r-md)',
          padding: '1.1rem',
          minHeight: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--txt-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`status-dot ${isRecording ? 'status-online' : 'status-pending'}`} />
              {isRecording ? 'Live Speech Tracking...' : 'Speech-to-Text Stream'}
            </span>
            {speechSupported && <span style={{ color: '#38bdf8', fontSize: '0.7rem' }}>WebSpeech Active</span>}
          </div>

          <p style={{
            fontSize: '0.925rem',
            color: liveTranscript ? '#ffffff' : 'var(--txt-muted)',
            fontStyle: liveTranscript ? 'normal' : 'italic',
            margin: 0,
            lineHeight: 1.6,
            fontWeight: liveTranscript ? 600 : 400,
          }}>
            {liveTranscript || (isRecording ? 'Listening... speak clearly into your mic in Hindi, English or Hinglish...' : 'Press Start Recording below and speak your complaint. Your words appear here live as you speak...')}
          </p>
        </div>

        {/* Triage Result Card */}
        {isDone && lastResult && (
          <div style={{
            padding: '0.875rem 1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.875rem' }}>
                {lastResult.isDuplicate ? '⚡ Clustered Duplicate Ticket' : '✅ Complaint Submitted & Routed!'}
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--txt-secondary)', marginTop: 2 }}>
                Category: <strong>{lastResult.category.toUpperCase()}</strong> · Urgency: <strong>U{lastResult.urgency}</strong>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={reset}>Record Another</button>
          </div>
        )}

        {isQueued && (
          <div style={{
            padding: '0.875rem 1rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.875rem' }}>📤 Saved to Offline Queue</div>
              <div style={{ fontSize: '0.775rem', color: 'var(--txt-secondary)', marginTop: 2 }}>Auto-submits when back online</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={reset}>Record Another</button>
          </div>
        )}

        {isError && (
          <div style={{
            padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--r-md)', color: '#ef4444', fontSize: '0.85rem'
          }}>
            ⚠ {errorMsg}
          </div>
        )}

        {/* Action Button */}
        {state === 'idle' && (
          <button
            className="btn btn-primary btn-lg"
            onClick={startRecording}
            style={{ width: '100%', height: 50, background: 'var(--grad-btn)' }}
          >
            🎙️ &nbsp;Start Recording Complaint
          </button>
        )}

        {isRecording && (
          <button
            className="btn btn-lg"
            onClick={stopRecording}
            style={{
              width: '100%', height: 50,
              background: 'linear-gradient(90deg, #ef4444 0%, #f43f5e 100%)',
              color: '#ffffff',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.4)'
            }}
          >
            ⏹ &nbsp;Stop & Submit Complaint ({formatTime(seconds)})
          </button>
        )}

        {isProcessing && (
          <button className="btn btn-primary btn-lg" disabled style={{ width: '100%', height: 50 }}>
            <div className="spinner" /> AI Triaging & Categorizing Ticket...
          </button>
        )}

        {isDone && (
          <button className="btn btn-ghost btn-lg" onClick={reset} style={{ width: '100%', height: 50 }}>
            🎙️ &nbsp;Record Another Complaint
          </button>
        )}
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function showToast(msg: string) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', bottom: '18px', right: '18px', zIndex: '9999',
    background: '#0f142b', color: '#f8fafc', border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '12px', padding: '11px 16px', fontSize: '13px', fontWeight: '600',
    boxShadow: '0 8px 28px rgba(0,0,0,0.5)'
  });
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
