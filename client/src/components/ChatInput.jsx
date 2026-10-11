import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, X, FileText } from 'lucide-react';

const MAX_FILES = 3;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

// Browser Web Speech API for voice dictation (Chrome/Edge/Safari support varies; feature-detected below)
const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState([]);
  const [listening, setListening] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [value]);

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      recognitionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed || '(see attached)', files.map((f) => f.file));
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setValue('');
    setFiles([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList).slice(0, MAX_FILES - files.length);
    const mapped = incoming.map((file) => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setFiles((prev) => [...prev, ...mapped].slice(0, MAX_FILES));
  };

  const removeFile = (idx) => {
    setFiles((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  };

  const toggleVoice = () => {
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript + ' ';
        else interim += transcript;
      }
      setValue((finalTranscript + interim).trim());
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-white border border-line rounded-2xl shadow-sm">
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap px-1 pb-2">
          {files.map((f, idx) => (
            <div key={idx} className="relative group">
              {f.previewUrl ? (
                <img src={f.previewUrl} alt={f.file.name} className="w-14 h-14 object-cover rounded-lg border border-line" />
              ) : (
                <div className="w-14 h-14 rounded-lg border border-line bg-cloud flex flex-col items-center justify-center px-1">
                  <FileText size={16} className="text-teal-deep" />
                  <span className="text-[9px] text-ink-soft truncate w-full text-center">{f.file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                aria-label="Remove attachment"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= MAX_FILES}
          aria-label="Attach a photo or document"
          className="flex-shrink-0 w-10 h-10 rounded-full text-ink-soft flex items-center justify-center hover:bg-cloud transition-colors disabled:opacity-30"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? 'Listening...' : "Describe how you're feeling, or attach a photo..."}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-[15px] text-ink placeholder:text-ink-soft/60 py-2 px-2 max-h-40"
        />

        {SpeechRecognition && (
          <button
            type="button"
            onClick={toggleVoice}
            disabled={disabled}
            aria-label={listening ? 'Stop dictation' : 'Start voice dictation'}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 ${
              listening ? 'bg-coral-soft text-coral' : 'text-ink-soft hover:bg-cloud'
            }`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}

        <button
          type="submit"
          disabled={disabled || (!value.trim() && files.length === 0)}
          aria-label="Send message"
          className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-deep text-white flex items-center justify-center transition-opacity disabled:opacity-30 hover:bg-teal-mid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-deep"
        >
          <Send size={18} strokeWidth={2.25} />
        </button>
      </div>
    </form>
  );
}
