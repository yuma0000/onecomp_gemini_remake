import { Database, Calculator, Settings2, HardDrive, Cpu, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "../lib/utils";

// Model Specifications
const MODELS = [
  {
    id: "tiny-swallow-1.5b",
    name: "TinySwallow 1.5B",
    params: 1.5 * 1e9,
    hiddenSize: 2048,
    layers: 24,
  },
  {
    id: "llama3-8b",
    name: "Llama 3 8B",
    params: 8 * 1e9,
    hiddenSize: 4096,
    layers: 32,
  },
  {
    id: "llama2-13b",
    name: "Llama 2 13B",
    params: 13 * 1e9,
    hiddenSize: 5120,
    layers: 40,
  },
  {
    id: "qwen2-72b",
    name: "Qwen 2 72B",
    params: 72 * 1e9,
    hiddenSize: 8192,
    layers: 80,
  },
];

// GPU Presets
const GPUS = [
  { name: "Tesla T4 (Colab Free)", vram: 15 },
  { name: "RTX 3090 / 4090", vram: 24 },
  { name: "NVIDIA A6000", vram: 48 },
  { name: "NVIDIA A100", vram: 80 },
];

export function MemorySimulator() {
  const [selectedModelId, setSelectedModelId] = useState(MODELS[0].id);
  const [targetBits, setTargetBits] = useState(2);
  const [batchSize, setBatchSize] = useState(1);
  const [seqLength, setSeqLength] = useState(512);
  const [isChunked, setIsChunked] = useState(true);
  const [selectedGpuIndex, setSelectedGpuIndex] = useState(0);

  const model = MODELS.find((m) => m.id === selectedModelId) || MODELS[0];
  const gpu = GPUS[selectedGpuIndex];

  // Calculations (in GB)
  const calc = useMemo(() => {
    const bytesToGB = (bytes: number) => bytes / (1024 ** 3);

    // 1. Model Weights (FP16)
    const fp16WeightsGB = bytesToGB(model.params * 2);

    // 2. Quantized Weights Size
    // roughly: params * (bits / 8) + scale_metadata(FP16, e.g. per 128 group)
    const bitsPerByte = targetBits / 8;
    const metaDataPerParam = 2 / 128; // scale (fp16) per 128 params + zero
    const quantWeightsGB = bytesToGB(model.params * (bitsPerByte + metaDataPerParam));

    // 3. Activation Memory during calibration
    // (Batch * Seq * HiddenSize * 2 bytes for FP16)
    const singleActivationBytes = batchSize * seqLength * model.hiddenSize * 2;
    
    // Normal calibration: hold activations for all layers (simplified limit estimate)
    // Chunked: Process layer-by-layer, only need current input/output acts
    const activationFactor = isChunked ? 2 : Math.min(model.layers, 10); 
    const calibActivationsGB = bytesToGB(singleActivationBytes * activationFactor);

    // 4. Hessian (X^T X) accumulation
    // X^T X is computed per layer in FP64 (8 bytes) -> HiddenSize * HiddenSize * 8
    const hessianBytes = model.hiddenSize * model.hiddenSize * 8;
    // Standard GPTQ might compute this for all requested layers. Chunked frees it up after each.
    const hessianFactor = isChunked ? 1 : 2; 
    const hessianGB = bytesToGB(hessianBytes * hessianFactor);

    // 5. Total Peak Memory during Quantization
    const peakVRAMGB = fp16WeightsGB + calibActivationsGB + hessianGB + 0.5; // +0.5GB buffer for PyTorch overhead

    const isOOM = peakVRAMGB > gpu.vram;

    return {
      fp16WeightsGB,
      quantWeightsGB,
      calibActivationsGB,
      hessianGB,
      peakVRAMGB,
      isOOM,
      singleActivationBytes,
      hessianBytes
    };
  }, [model, targetBits, batchSize, seqLength, isChunked, gpu]);

  const formatGB = (val: number) => val.toFixed(2) + " GB";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-slate-400" />
        <h2 className="text-2xl font-bold text-slate-800">量子化VRAMシミュレーター</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Panel */}
        <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Settings2 className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">シミュレーション設定</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ターゲットモデル</label>
              <select 
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.params / 1e9}B)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">実行環境 (搭載VRAM)</label>
              <select 
                value={selectedGpuIndex}
                onChange={(e) => setSelectedGpuIndex(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {GPUS.map((g, i) => (
                  <option key={i} value={i}>{g.name} ({g.vram} GB)</option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">目標ビット数</label>
              <div className="flex gap-2">
                {[2, 3, 4, 8].map(bits => (
                  <button
                    key={bits}
                    onClick={() => setTargetBits(bits)}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-sm font-semibold border transition-all",
                      targetBits === bits 
                        ? "bg-blue-600 text-white border-blue-600" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {bits}-bit
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">キャリブレーション設定</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 mb-1 block">Batch Size</span>
                  <select value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-sm outline-none">
                    <option value={1}>1 (省メモリ)</option>
                    <option value={8}>8</option>
                    <option value={32}>32</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 mb-1 block">Seq Length</span>
                  <select value={seqLength} onChange={(e) => setSeqLength(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-sm outline-none">
                    <option value={512}>512</option>
                    <option value={1024}>1024</option>
                    <option value={2048}>2048 (標準)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={isChunked} 
                    onChange={(e) => setIsChunked(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-5 h-5 rounded border transition-colors flex items-center justify-center",
                    isChunked ? "bg-green-500 border-green-500" : "bg-white border-slate-300 group-hover:border-slate-400"
                  )}>
                    {isChunked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">省メモリ チャンク処理</span>
                  <span className="text-xs text-slate-500 block leading-tight mt-1">OneCompの Chunked Quantization を有効にし、1層ずつ処理することでVRAMを劇的に節約します。</span>
                </div>
              </label>
            </div>

          </div>
        </div>

        {/* Results Panel */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Main VRAM Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
            <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-slate-500" />
              必要なピークVRAM推移
            </h3>

            {/* Progress Bar Visualizer */}
            <div className="mb-6">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>0 GB</span>
                <span>{gpu.name} 容量: {gpu.vram} GB</span>
              </div>
              
              <div className="h-8 bg-slate-100 rounded-lg w-full flex overflow-hidden border border-slate-200 relative">
                {/* FP16 Weights */}
                <div 
                  className="bg-blue-200 h-full flex items-center justify-center text-[10px] font-bold text-blue-800 overflow-hidden relative group"
                  style={{ width: `${Math.min((calc.fp16WeightsGB / gpu.vram) * 100, 100)}%` }}
                >
                  <span className="truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center bg-blue-300">FP16モデル</span>
                </div>
                
                {/* Activations */}
                <div 
                  className="bg-teal-200 h-full flex items-center justify-center text-[10px] font-bold text-teal-800 overflow-hidden relative group"
                  style={{ width: `${Math.min((calc.calibActivationsGB / gpu.vram) * 100, 100)}%` }}
                >
                  <span className="truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center bg-teal-300">Activations</span>
                </div>
                
                {/* Hessian */}
                <div 
                  className="bg-purple-200 h-full flex items-center justify-center text-[10px] font-bold text-purple-800 overflow-hidden relative group"
                  style={{ width: `${Math.min((calc.hessianGB / gpu.vram) * 100, 100)}%` }}
                >
                  <span className="truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center bg-purple-300">Hessian(X^TX)</span>
                </div>

                {/* Overhead */}
                <div 
                  className="bg-slate-300 h-full flex items-center justify-center text-[10px] font-bold text-slate-600 overflow-hidden"
                  style={{ width: `${Math.min((0.5 / gpu.vram) * 100, 100)}%` }}
                />

                {/* Limit Marker */}
                <div className="absolute top-0 bottom-0 border-r-2 border-red-500 z-10" style={{ left: '100%' }} />
              </div>

              {calc.isOOM && (
                 <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-semibold">Out of Memory (OOM)! ピークVRAMがGPUの容量を超過します。バッチサイズを下げるかチャンク化を有効にしてください。</span>
                 </div>
              )}
              {!calc.isOOM && (
                 <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 p-2.5 rounded-md border border-green-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-semibold">安全に量子化可能です。ピーク時VRAM: {formatGB(calc.peakVRAMGB)} / {gpu.vram} GB</span>
                 </div>
              )}
            </div>

            {/* VRAM Breakdown Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <span className="text-[10px] font-bold text-blue-600 block uppercase tracking-wider mb-1">ベースモデル (FP16)</span>
                <span className="text-lg font-mono text-slate-800">{formatGB(calc.fp16WeightsGB)}</span>
              </div>
              <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl">
                <span className="text-[10px] font-bold text-teal-600 block uppercase tracking-wider mb-1">Activations</span>
                <span className="text-lg font-mono text-slate-800">{formatGB(calc.calibActivationsGB)}</span>
              </div>
              <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
                <span className="text-[10px] font-bold text-purple-600 block uppercase tracking-wider mb-1">Hessian (X^TX)</span>
                <span className="text-lg font-mono text-slate-800">{formatGB(calc.hessianGB)}</span>
              </div>
               <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-inner outline outline-1 outline-slate-200/50">
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-1">量子化完了後のサイズ</span>
                <span className="text-lg font-mono text-blue-700">{formatGB(calc.quantWeightsGB)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
