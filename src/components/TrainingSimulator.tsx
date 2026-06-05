import { useState, useRef, useEffect } from "react";
import { Play, Square, RefreshCcw, Activity, Network, CheckCircle2, MessageSquare, Brain } from "lucide-react";
import { MiniNN } from "../lib/MiniNN";
import { cn } from "../lib/utils";

const NOISE_CHARS = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?., ";
const CONTEXT_LEN = 3;
const MAX_VOCAB = 250;

export function TrainingSimulator() {
  const [datasetText, setDatasetText] = useState("今日の天気は晴れです\n今日の天気は雨です\n明日の天気は雪です\n明日の天気は曇りです\nAI Studioで学習\nAIの進化");
  const [targetDataset, setTargetDataset] = useState<string[][]>([]);
  const [learningRate, setLearningRate] = useState(0.1);
  const [isTraining, setIsTraining] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState(0);
  const [predictions, setPredictions] = useState<string[][]>([]);
  const [done, setDone] = useState(false);
  
  const [generatePrompt, setGeneratePrompt] = useState("AI");
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const nnRef = useRef<MiniNN | null>(null);
  const charsetRef = useRef<string[]>([]);
  const requestRef = useRef<number>();
  
  const tokenize = (text: string) => {
    return ['<s>', ...text.split(''), '</s>'];
  };

  const encodeContext = (tokens: string[], chars: string[]) => {
    let ctx = tokens.slice(-CONTEXT_LEN);
    while (ctx.length < CONTEXT_LEN) ctx = [' ', ...ctx]; // space padding
    
    const V = MAX_VOCAB;
    const x = Array(CONTEXT_LEN * V).fill(0);
    for (let c = 0; c < CONTEXT_LEN; c++) {
      let idx = chars.indexOf(ctx[c]);
      if (idx === -1) idx = chars.indexOf(' ');
      if (idx !== -1) {
        x[c * V + idx] = 1;
      }
    }
    return x;
  };

  const getPredictions = (dataset: string[][], chars: string[]) => {
    if (!nnRef.current) return dataset.map(() => []);
    return dataset.map(tokens => {
      const preds = [];
      for (let i = 0; i < tokens.length; i++) {
          const ctxTokens = tokens.slice(0, i);
          const x = encodeContext(ctxTokens, chars);
          const { p } = nnRef.current!.forward(x);
          
          const validP = p.slice(0, chars.length);
          const maxIdx = validP.indexOf(Math.max(...validP));
          preds.push(chars[maxIdx]);
      }
      return preds;
    });
  }

  const updateDataset = (inputText: string, isReset: boolean) => {
    const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    
    const tokenizedLines = lines.map(tokenize);
    setTargetDataset(tokenizedLines);

    if (charsetRef.current.length === 0 || isReset) {
        const pool = ['<s>', '</s>', ' '];
        for (const c of NOISE_CHARS) {
            if (!pool.includes(c)) pool.push(c);
        }
        charsetRef.current = pool;
    }

    const allTokens = tokenizedLines.flat();
    for (const t of allTokens) {
        if (!charsetRef.current.includes(t) && charsetRef.current.length < MAX_VOCAB) {
            charsetRef.current.push(t);
        }
    }
    
    if (!nnRef.current || isReset) {
        nnRef.current = new MiniNN(CONTEXT_LEN * MAX_VOCAB, 128, MAX_VOCAB, learningRate);
        setEpoch(0);
        setLoss(100);
        setGeneratedTokens([]);
        setIsGenerating(false);
    }
    
    setDone(false);
    setPredictions(getPredictions(tokenizedLines, charsetRef.current));
  };

  useEffect(() => {
    updateDataset(datasetText, true);
  }, []);
  
  const handleApplyContinual = () => {
    setIsTraining(false);
    updateDataset(datasetText, false);
  };

  const handleApplyReset = () => {
    setIsTraining(false);
    updateDataset(datasetText, true);
  };
  
  const toggleTraining = () => {
    if (done) {
        updateDataset(datasetText, false);
    }
    setIsTraining(!isTraining);
  };

  useEffect(() => {
    if (!isTraining || !nnRef.current) return;

    let currentEpoch = epoch;
    let dataset = targetDataset;
    let chars = charsetRef.current;
    
    const loop = () => {
      let avgLoss = 0;
      // epochs per visual frame
      for (let step = 0; step < 5; step++) {
        let totalLoss = 0;
        let totalTokens = 0;
        for (const tokens of dataset) {
          for (let i = 0; i < tokens.length; i++) {
            const ctxTokens = tokens.slice(0, i);
            const x = encodeContext(ctxTokens, chars);
            
            let targetIdx = chars.indexOf(tokens[i]);
            if (targetIdx === -1) targetIdx = chars.indexOf(' ');
            
            totalLoss += nnRef.current!.train(x, targetIdx);
            totalTokens++;
          }
        }
        avgLoss = totalLoss / Math.max(1, totalTokens);
        currentEpoch++;
      }
      
      setEpoch(currentEpoch);
      setLoss(avgLoss);
      setPredictions(getPredictions(dataset, chars));
      
      // Target Loss condition
      if (avgLoss < 0.05) {
        setIsTraining(false);
        setDone(true);
      } else {
        requestRef.current = requestAnimationFrame(loop);
      }
    };
    
    requestRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [isTraining, targetDataset]); 

  // Auto-regressive Generation
  useEffect(() => {
    if (!isGenerating || !nnRef.current) return;
    
    const step = () => {
      const currentFullTokens = ['<s>', ...generatePrompt.split(''), ...generatedTokens];
      const x = encodeContext(currentFullTokens, charsetRef.current);
      const { p } = nnRef.current!.forward(x);
      
      const validP = p.slice(0, charsetRef.current.length);
      const maxIdx = validP.indexOf(Math.max(...validP));
      const nextToken = charsetRef.current[maxIdx];
      
      setGeneratedTokens(prev => [...prev, nextToken]);
      
      if (nextToken === '</s>') {
        setIsGenerating(false);
      }
    };

    if (generatedTokens.length >= 30) {
        setIsGenerating(false);
        return;
    }

    const timer = setTimeout(step, 100); // 100ms per token
    return () => clearTimeout(timer);
  }, [isGenerating, generatedTokens, generatePrompt]);

  const handleGenerateStart = () => {
     setGeneratedTokens([]);
     setIsGenerating(true);
  }

  const handleGenerateStop = () => {
     setIsGenerating(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      
      <div className="text-center space-y-4 mb-8">
        <h2 className="text-3xl font-bold text-slate-800">ブラウザ上で自己回帰モデル(LLMの基礎)を学習</h2>
        <p className="text-slate-600">
          次の文字を予測する言語モデル（Language Model）の学習をシミュレーションします。<br />
          学習後、任意のプロンプトから文章を自動生成（推論）できます。
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">学習データセット (複数行で複数のデータを入力)</label>
        <textarea 
            value={datasetText}
            onChange={(e) => setDatasetText(e.target.value)}
            className="w-full border-2 border-indigo-100 bg-indigo-50/30 rounded-xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-indigo-400 focus:bg-indigo-50 transition-colors min-h-[100px]"
            placeholder="学習させたい文章を改行して入力..."
        />
        <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full flex flex-col sm:flex-row items-start sm:items-center gap-3">
               <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">学習率 (LR)</label>
               <input 
                  type="range" min="0.001" max="0.5" step="0.001" 
                  value={learningRate} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLearningRate(val);
                    if (nnRef.current) nnRef.current.lr = val;
                  }}
                  className="w-full"
               />
               <span className="text-sm font-mono font-bold w-12 text-slate-700">{learningRate.toFixed(3)}</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
                <button 
                    onClick={handleApplyContinual}
                    className="w-full sm:w-auto px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap"
                >
                    追加学習 (Continual)
                </button>
                <button 
                    onClick={handleApplyReset}
                    className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap"
                >
                    全リセット
                </button>
            </div>
        </div>
      </div>

      {/* Inference Section */}
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl shadow-sm border border-blue-100 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-lg">推論実行 (Text Generation)</h3>
        </div>
        <p className="text-slate-600 text-sm mb-2">学習された重みを使って、プロンプトに続く文字を自己回帰的（1文字ずつ）に生成します。</p>
        
        <div className="flex flex-col sm:flex-row gap-4">
            <input 
                type="text" 
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                className="w-full border border-blue-200 rounded-xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors bg-white shadow-sm"
                placeholder="生成のきっかけとなる文字 (例: AI)"
            />
            {isGenerating ? (
              <button 
                  onClick={handleGenerateStop}
                  className="w-full sm:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-2"
              >
                  <Square className="w-4 h-4 fill-current"/> 停止
              </button>
            ) : (
              <button 
                  onClick={handleGenerateStart}
                  disabled={epoch === 0}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 disabled:bg-slate-300 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-2"
              >
                  <Brain className="w-4 h-4"/> 生成開始
              </button>
            )}
        </div>
        
        <div className="mt-4 p-5 min-h-[120px] bg-white border border-blue-100 rounded-xl shadow-inner relative group font-sans">
            <span className="text-[10px] font-bold text-blue-400 absolute top-2 right-3 uppercase tracking-wider">Output</span>
            <div className="mt-2 text-lg text-slate-800 flex flex-wrap items-center gap-0.5 leading-relaxed">
                <span className="text-blue-600 font-semibold flex items-center gap-1">
                  <span className="text-[10px] bg-blue-100/50 border border-blue-200 text-blue-500 px-1.5 py-0.5 rounded leading-none">{'<s>'}</span>
                  {generatePrompt}
                </span>
                <span className="font-medium flex flex-wrap items-center gap-0.5 whitespace-pre-wrap shrink-0">
                  {generatedTokens.map((t, i) => (
                    t === '</s>' ? <span key={i} className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded leading-none mx-1">{t}</span>
                    : t === '<s>' ? <span key={i} className="text-[10px] bg-blue-100/50 border border-blue-200 text-blue-500 px-1.5 py-0.5 rounded leading-none mx-1">{t}</span>
                    : <span key={i}>{t}</span>
                  ))}
                </span>
                {isGenerating && <span className="animate-pulse bg-blue-500 w-1.5 h-5 ml-1 block my-auto translate-y-0.5 shrink-0"></span>}
                {!isGenerating && generatedTokens.length === 0 && epoch === 0 && (
                    <span className="text-slate-400 text-sm mt-1">※先に下のパネルで学習を回してください</span>
                )}
            </div>
        </div>
      </div>

      {/* Main Visualization & Stats (Teacher Forcing) */}
      <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800 relative">
        <div className="bg-slate-800 px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-700">
            <h3 className="text-white font-bold flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-400" /> モデルの学習状況 (Training Status)
            </h3>
            
            <button 
                onClick={toggleTraining}
                className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-inner w-full sm:w-auto justify-center",
                    isTraining ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" : "bg-indigo-500 text-white hover:bg-indigo-600 border border-indigo-500"
                )}
            >
                {isTraining ? <><Square className="w-4 h-4 fill-current"/> 学習ストップ</> : <><Play className="w-4 h-4 fill-current"/> {epoch > 0 && !done ? "学習再開" : "学習スタート"}</>}
            </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-0 border-b border-slate-800">
          <div className="p-4 flex flex-col items-center justify-center border-r border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><RefreshCcw className="w-3 h-3"/> エポック</span>
              <span className="text-2xl font-mono text-slate-200">{epoch}</span>
          </div>
          <div className="p-4 flex flex-col items-center justify-center border-r border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Activity className="w-3 h-3"/> 損失 (Loss)</span>
              <span className="text-2xl font-mono text-orange-400">{loss === 100 ? "N/A" : loss.toFixed(4)}</span>
          </div>
          <div className="p-4 flex flex-col items-center justify-center">
              <div className="w-full flex justify-center mb-2">
                  {done ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-1 rounded"><CheckCircle2 className="w-3 h-3" /> 収束完了</span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 uppercase">誤差ゲージ</span>
                  )}
              </div>
              <div className="w-3/4 max-w-[120px] h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div 
                      className="h-full bg-gradient-to-r from-red-500 to-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.max(0, Math.min(100, 100 - (loss * 20)))}%` }}
                  />
              </div>
          </div>
        </div>

        <div className="p-8">
            <p className="text-slate-400 text-xs mb-6 text-center">
              ※ 下段はデータセット内の「前の数文字」を与えたときにモデルが予測した次文字です。<br/>学習が進むと上段（正解）の文字と一致して緑色になります。
            </p>
            <div className="flex flex-col gap-6 font-mono text-xl md:text-2xl">
                {targetDataset.map((tokens, sentenceIdx) => {
                    const predTokens = predictions[sentenceIdx] || [];
                    return (
                        <div key={sentenceIdx} className="flex flex-wrap gap-2 justify-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            {tokens.map((token, i) => {
                                const isMatch = predTokens[i] === token;
                                const isSpecial = token === '<s>' || token === '</s>';
                                return (
                                    <div key={i} className="flex flex-col items-center justify-end h-16 gap-1.5">
                                        {/* Target Character (Small) */}
                                        <span className={cn(
                                            "text-[10px] font-sans border-b border-slate-700 w-full text-center pb-0.5 whitespace-nowrap",
                                            isSpecial ? "text-indigo-400 border-indigo-500/50" : "text-slate-400"
                                        )}>{token}</span>
                                        
                                        {/* Prediction Character Box */}
                                        <div className={cn(
                                            "h-9 px-1 flex items-center justify-center rounded transition-colors duration-150 font-bold text-lg",
                                            isSpecial ? "min-w-[2.5rem] text-sm" : "min-w-[2.25rem]",
                                            isMatch ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500/50" : "bg-slate-800 text-slate-400 border-b-2 border-red-500/30"
                                        )}>
                                            {predTokens[i] || " "}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

    </div>
  );
}
