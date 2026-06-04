import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, RotateCcw, AlertTriangle, ArrowRight, BrainCircuit } from "lucide-react";
import { cn } from "../lib/utils";

// Define the steps for the simulation
type StepState = "idle" | "layer1" | "layer2" | "layer3" | "done";

interface VisualizerProps {
  mode: "standard" | "qep";
}

export function QEPVisualizer({ mode }: VisualizerProps) {
  const [step, setStep] = useState<StepState>("idle");
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play sequence
  useEffect(() => {
    if (!isPlaying) return;

    const sequence: StepState[] = ["layer1", "layer2", "layer3", "done"];
    let currentIndex = sequence.indexOf(step);
    if (currentIndex === -1) currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < sequence.length) {
        setStep(sequence[currentIndex]);
        currentIndex++;
      } else {
        setIsPlaying(false);
        clearInterval(interval);
      }
    }, 1500); // 1.5s per step

    return () => clearInterval(interval);
  }, [isPlaying, step]);

  const reset = () => {
    setIsPlaying(false);
    setStep("idle");
  };

  const getLayerStatus = (layerNum: number) => {
    if (step === "idle") return "waiting";
    
    const layerMapping: Record<number, StepState> = {
      1: "layer1",
      2: "layer2",
      3: "layer3",
    };
    
    const currentLayerKey = layerMapping[layerNum];
    const steps: StepState[] = ["idle", "layer1", "layer2", "layer3", "done"];
    
    if (steps.indexOf(step) > steps.indexOf(currentLayerKey)) return "done";
    if (step === currentLayerKey) return "active";
    return "waiting";
  };

  const isQEP = mode === "qep";

  return (
    <div className="flex flex-col items-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full max-w-4xl overflow-hidden">
      
      {/* Controls */}
      <div className="flex w-full justify-between items-center mb-10 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {isQEP ? (
              <><BrainCircuit className="text-blue-600 w-5 h-5" /> 誤差伝播あり (QEP)</>
            ) : (
              <><AlertTriangle className="text-orange-500 w-5 h-5" /> 従来手法 (Standard GPTQ)</>
            )}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {isQEP 
              ? "実際の量子化出力（誤差含む）を次の層の入力としてキャリブレーションする手法" 
              : "元のモデルのクリーンな出力を各層の入力と仮定してキャリブレーションする手法"}
          </p>
        </div>
        
        <div className="flex gap-2">
          {step === "done" && !isPlaying ? (
            <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors">
              <RotateCcw className="w-4 h-4" /> リセット
            </button>
          ) : (
            <button 
              onClick={() => setIsPlaying(!isPlaying)} 
              className={cn(
                "flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm",
                isPlaying ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {isPlaying ? <><Pause className="w-4 h-4" /> 一時停止</> : <><Play className="w-4 h-4 mr-0.5" /> シミュレーション開始</>}
            </button>
          )}
        </div>
      </div>

      {/* Visual Canvas */}
      <div className="relative w-full flex justify-center items-start gap-16 py-8">
        
        {/* Original FP16 Model Flow (Reference) */}
        {!isQEP && (
          <div className="flex flex-col items-center opacity-60">
            <div className="text-xs font-mono text-slate-500 mb-4 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">💎 Original FP16 (Teacher)</div>
            
            <motion.div className="w-16 h-16 rounded border-2 border-slate-300 bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">In</motion.div>
            <div className="h-10 w-0.5 bg-slate-300"></div>
            
            <ReferenceLayer num={1} />
            <div className="h-10 w-0.5 bg-slate-300 relative">
               {/* Arrow indicating data feeding into Student L1... wait, standard feeds to ALL layers */}
               <motion.div animate={{ opacity: getLayerStatus(2) === "active" ? 1 : 0 }} className="absolute top-1/2 left-0 w-24 border-t-2 border-dashed border-slate-400 -translate-y-1/2 flex items-center justify-end"><ArrowRight className="w-3 h-3 text-slate-400 absolute -right-1" /></motion.div>
            </div>
            
            <ReferenceLayer num={2} />
            <div className="h-10 w-0.5 bg-slate-300 relative">
               <motion.div animate={{ opacity: getLayerStatus(3) === "active" ? 1 : 0 }} className="absolute top-1/2 left-0 w-24 border-t-2 border-dashed border-slate-400 -translate-y-1/2 flex items-center justify-end"><ArrowRight className="w-3 h-3 text-slate-400 absolute -right-1" /></motion.div>
            </div>
            
            <ReferenceLayer num={3} />
          </div>
        )}

        {/* Quantized Student Flow */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-mono mb-4 bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200 font-semibold shadow-sm">
            {isQEP ? "🎯 2-bit 量子化モデル (QEP適用)" : "⚠️ 2-bit 量子化モデル (通常)"}
          </div>

          <motion.div className="w-16 h-16 rounded border-2 border-blue-300 bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 shadow-sm relative z-10">
            Input
          </motion.div>

          <FlowArrow 
            active={getLayerStatus(1) === "active"} 
            errorLevel={0} 
          />

          <QuantizedLayer 
            num={1} 
            status={getLayerStatus(1)} 
            hasError={!isQEP && getLayerStatus(1) === "done"} 
            isQEP={isQEP}
          />

          <FlowArrow 
            active={getLayerStatus(2) === "active"} 
            errorLevel={getLayerStatus(1) === "done" ? 1 : 0} 
            isQEP={isQEP}
          />

          <QuantizedLayer 
            num={2} 
            status={getLayerStatus(2)} 
            hasError={!isQEP && getLayerStatus(2) === "done"} 
            isQEP={isQEP}
          />

          <FlowArrow 
            active={getLayerStatus(3) === "active"} 
            errorLevel={getLayerStatus(2) === "done" ? 2 : 0} 
            isQEP={isQEP}
          />

          <QuantizedLayer 
            num={3} 
            status={getLayerStatus(3)} 
            hasError={!isQEP && getLayerStatus(3) === "done"} 
            isQEP={isQEP}
          />

          <div className="h-10 w-0.5 bg-blue-200 relative">
             <motion.div 
               initial={{ scaleY: 0 }}
               animate={{ scaleY: step === "done" ? 1 : 0 }}
               className={cn("absolute top-0 left-0 w-full bg-blue-500 origin-top h-full", 
                 !isQEP && "bg-red-500"
               )}
             />
             {step === "done" && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                   <ArrowRight className="w-5 h-5 text-blue-500 rotate-90" />
                </div>
             )}
          </div>

          {/* Final Output State */}
          <div className="mt-8">
            <AnimatePresence>
              {step === "done" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "px-6 py-4 rounded-xl border flex flex-col items-center justify-center shadow-lg",
                    isQEP ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  )}
                >
                  <span className="text-sm font-bold mb-1">
                    {isQEP ? "出力結果: 安定" : "出力結果: 破壊的劣化 (-_ -)"}
                  </span>
                  <span className="text-xs font-mono">
                    {isQEP ? "累積誤差: 最小化済み (✅)" : "累積誤差: 制御不能 (爆発 💥)"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Sub Components
// ----------------------------------------------------------------------

function ReferenceLayer({ num }: { num: number }) {
  return (
    <div className="w-32 h-20 rounded-xl border-2 border-slate-300 bg-white flex flex-col items-center justify-center relative shadow-sm">
      <span className="text-sm font-bold text-slate-700">Layer {num}</span>
      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 rounded mt-1">FP16 Math</span>
    </div>
  );
}

function QuantizedLayer({ num, status, hasError, isQEP }: { num: number; status: string; hasError: boolean; isQEP: boolean }) {
  return (
    <motion.div 
      initial={false}
      animate={{
        scale: status === "active" ? 1.05 : 1,
        borderColor: status === "active" ? "#2563eb" : status === "done" ? (isQEP ? "#10b981" : (hasError ? "#ef4444" : "#94a3b8")) : "#cbd5e1",
        backgroundColor: status === "active" ? "#eff6ff" : "#ffffff",
      }}
      className="w-48 h-24 rounded-xl border-2 flex flex-col items-center justify-center relative shadow-md z-10"
    >
      <span className="font-bold text-slate-800">Layer {num}</span>
      
      <span className="text-[10px] font-mono mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
        2-bit W
      </span>

      {status === "active" && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="absolute -right-32 top-1/2 -translate-y-1/2 flex items-center"
        >
          <div className="px-3 py-1.5 bg-blue-600 text-white text-[10px] sm:text-xs font-bold rounded-lg whitespace-nowrap shadow-md">
            最適化中...
          </div>
        </motion.div>
      )}

      {status === "done" && (
        <div className="absolute -bottom-2 -right-2">
          {isQEP ? (
            <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
          ) : (
            <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
              <span className="text-white text-[10px] font-bold">!</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function FlowArrow({ active, errorLevel, isQEP }: { active: boolean; errorLevel: number; isQEP?: boolean }) {
  
  // Decide the arrow color based on error level & QEP state
  let arrowColorClass = "bg-blue-500";
  let textColorClass = "text-blue-600";
  let bgLabelClass = "bg-blue-50 border-blue-200";
  let labelText = "Clean Input";

  if (errorLevel > 0) {
    if (isQEP) {
      arrowColorClass = "bg-green-500";
      textColorClass = "text-green-700";
      bgLabelClass = "bg-green-50 border-green-200";
      labelText = `Error Propagated (${errorLevel})`;
    } else {
      // Standard: Error accumulates as bad input
      if (errorLevel === 1) {
        arrowColorClass = "bg-orange-500";
        textColorClass = "text-orange-700";
        bgLabelClass = "bg-orange-50 border-orange-200";
        labelText = "Distorted Input (+)";
      } else {
        arrowColorClass = "bg-red-500";
        textColorClass = "text-red-700";
        bgLabelClass = "bg-red-50 border-red-200";
        labelText = "Broken Input (++)";
      }
    }
  }

  return (
    <div className="h-16 w-1 bg-slate-200 relative my-1">
      <motion.div 
        initial={{ height: "0%" }}
        animate={{ height: active || errorLevel > 0 ? "100%" : "0%" }}
        transition={{ duration: 0.5 }}
        className={cn("absolute top-0 left-0 w-full origin-top", arrowColorClass)}
      />
      {(active || errorLevel > 0) && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn("absolute top-1/2 left-4 -translate-y-1/2 px-2 py-1 rounded shadow-sm border whitespace-nowrap text-[10px] font-bold z-20", bgLabelClass, textColorClass)}
        >
          {labelText}
        </motion.div>
      )}
    </div>
  );
}
